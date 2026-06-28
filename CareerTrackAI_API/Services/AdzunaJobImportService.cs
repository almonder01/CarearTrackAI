using System.Text.Json;
using CareerTrackAI.Data;
using CareerTrackAI.DTOs.Company;
using CareerTrackAI.DTOs.JobOpportunity;
using CareerTrackAI.Enums;
using CareerTrackAI.Models;
using Microsoft.EntityFrameworkCore;

namespace CareerTrackAI.Services
{
    public record AdzunaSearchRequest(
        string? What,
        string? Where,
        int ResultsPerPage = 20,
        int Page = 1,
        bool ImportToDatabase = false,
        string? Country = null);

    public record AdzunaCountry(string Code, string Name);

    public record AdzunaSearchResult(
        int Count,
        string Country,
        string Query,
        string Location,
        bool Configured,
        string? Message,
        List<JobOpportunityResponse> Opportunities);

    public interface IAdzunaJobImportService
    {
        IReadOnlyList<AdzunaCountry> GetSupportedCountries();
        Task<AdzunaSearchResult> SearchAsync(AdzunaSearchRequest request, int? userId = null);
        Task<ImportResult> ImportAsync(AdzunaSearchRequest request, int? userId = null);
    }

    public class AdzunaJobImportService : IAdzunaJobImportService
    {
        private readonly HttpClient _httpClient;
        private readonly AppDbContext _db;
        private readonly AdzunaOptions _options;
        private readonly IApiUsageTracker _usageTracker;

        public AdzunaJobImportService(IHttpClientFactory factory, AppDbContext db, AdzunaOptions options, IApiUsageTracker usageTracker)
        {
            _httpClient = factory.CreateClient("Adzuna");
            _db = db;
            _options = options;
            _usageTracker = usageTracker;
        }

        public IReadOnlyList<AdzunaCountry> GetSupportedCountries() => SupportedCountries;

        public async Task<AdzunaSearchResult> SearchAsync(AdzunaSearchRequest request, int? userId = null)
        {
            if (!_options.IsConfigured)
            {
                var notConfigured = new AdzunaSearchResult(0, ResolveCountry(request.Country ?? _options.Country), request.What ?? string.Empty, request.Where ?? string.Empty, false, "Adzuna credentials are not configured.", []);
                RecordUsage(userId, "search", notConfigured);
                return notConfigured;
            }

            var page = Math.Max(1, request.Page);
            var resultsPerPage = Math.Clamp(request.ResultsPerPage, 1, 50);
            var query = string.IsNullOrWhiteSpace(request.What) ? "software intern" : request.What.Trim();
            var where = string.IsNullOrWhiteSpace(request.Where) ? string.Empty : request.Where.Trim();
            var country = ResolveCountry(request.Country ?? _options.Country);
            var result = await FetchAdzunaAsync(country, page, resultsPerPage, query, where);
            if (result.Opportunities.Count > 0 || !string.IsNullOrWhiteSpace(result.Message))
            {
                RecordUsage(userId, "search", result);
                return result;
            }

            var fallbackQuery = string.IsNullOrWhiteSpace(where) ? $"{query} remote" : $"{query} {where} remote";
            var fallback = await FetchAdzunaAsync(country, page, resultsPerPage, fallbackQuery, null);
            if (fallback.Opportunities.Count > 0)
            {
                var fallbackResult = fallback with
                {
                    Location = where,
                    Message = "CareerTrackAI retried with broader keywords because the first Adzuna query returned no rows."
                };
                RecordUsage(userId, "search", fallbackResult);
                return fallbackResult;
            }

            var emptyResult = result with
            {
                Message = "Adzuna returned 0 jobs for this query. Choose a supported country and try broader keywords such as \"developer\", \"data\", or clear the location field."
            };
            RecordUsage(userId, "search", emptyResult);
            return emptyResult;
        }

        public async Task<ImportResult> ImportAsync(AdzunaSearchRequest request, int? userId = null)
        {
            var result = await SearchAsync(request with { ImportToDatabase = false }, userId);
            if (result.Opportunities.Count == 0)
                return new ImportResult(0, 0, 0, [result.Message ?? "No Adzuna opportunities matched this query."]);

            var created = 0;
            var updated = 0;
            var skipped = 0;
            var errors = new List<string>();

            foreach (var item in result.Opportunities)
            {
                if (string.IsNullOrWhiteSpace(item.Title) || string.IsNullOrWhiteSpace(item.Company.Name))
                {
                    skipped++;
                    errors.Add("Skipped Adzuna opportunity without title or company.");
                    continue;
                }

                var company = await _db.Companies.FirstOrDefaultAsync(c => c.Name == item.Company.Name && c.UserId == userId);
                if (company == null)
                {
                    company = new Company
                    {
                        UserId = userId,
                        Name = item.Company.Name,
                        Industry = item.Company.Industry ?? "Hiring",
                        City = item.Company.City,
                        Country = item.Company.Country ?? "Malaysia",
                        IsImported = true,
                        ImportedAt = DateTime.UtcNow,
                        SourceUrl = "https://www.adzuna.com",
                        SourceProvider = "Adzuna"
                    };
                    _db.Companies.Add(company);
                    await _db.SaveChangesAsync();
                }

                var job = await _db.JobOpportunities.FirstOrDefaultAsync(j => j.Title == item.Title && j.CompanyId == company.Id && j.UserId == userId);
                if (job == null)
                {
                    job = new JobOpportunity
                    {
                        UserId = userId,
                        Title = item.Title,
                        CompanyId = company.Id,
                        IsImported = true,
                        ImportedAt = DateTime.UtcNow
                    };
                    _db.JobOpportunities.Add(job);
                    created++;
                }
                else
                {
                    updated++;
                    job.UpdatedAt = DateTime.UtcNow;
                }

                job.Description = item.Description;
                job.Type = InferOpportunityType(item.Title, item.Description);
                job.EmploymentType = EmploymentType.FullTime;
                job.Location = item.Location;
                job.IsRemote = item.Location?.Contains("remote", StringComparison.OrdinalIgnoreCase) == true;
                job.SalaryMin = item.SalaryMin;
                job.SalaryMax = item.SalaryMax;
                job.RequiredSkills = item.RequiredSkills;
                job.JobUrl = item.JobUrl;
                job.SourceUrl = item.JobUrl;
                job.SourceProvider = "Adzuna";
                job.IsActive = true;
            }

            await _db.SaveChangesAsync();
            var importResult = new ImportResult(created, updated, skipped, errors);
            if (userId.HasValue)
            {
                _usageTracker.Record(userId.Value, "Adzuna", "import", requests: 0, imported: created + updated, errors: errors.Count);
            }
            return importResult;
        }

        private async Task<AdzunaSearchResult> FetchAdzunaAsync(string country, int page, int resultsPerPage, string query, string? where)
        {
            var url =
                $"v1/api/jobs/{country}/search/{page}" +
                $"?app_id={Uri.EscapeDataString(_options.AppId)}" +
                $"&app_key={Uri.EscapeDataString(_options.AppKey)}" +
                $"&results_per_page={resultsPerPage}" +
                $"&what={Uri.EscapeDataString(query)}" +
                (string.IsNullOrWhiteSpace(where) ? string.Empty : $"&where={Uri.EscapeDataString(where)}") +
                "&content-type=application/json";

            using var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                var message = $"Adzuna returned {(int)response.StatusCode} {response.ReasonPhrase}.";
                if (!string.IsNullOrWhiteSpace(body)) message += $" {body}";
                return new AdzunaSearchResult(0, country, query, where ?? string.Empty, true, message, []);
            }

            await using var stream = await response.Content.ReadAsStreamAsync();
            using var doc = await JsonDocument.ParseAsync(stream);
            var root = doc.RootElement;
            var count = root.TryGetProperty("count", out var countEl) ? countEl.GetInt32() : 0;
            var jobs = new List<JobOpportunityResponse>();

            if (root.TryGetProperty("results", out var results) && results.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in results.EnumerateArray())
                {
                    jobs.Add(MapAdzunaResult(item, persistIds: false));
                }
            }

            return new AdzunaSearchResult(count, country, query, where ?? string.Empty, true, null, jobs);
        }

        private static JobOpportunityResponse MapAdzunaResult(JsonElement item, bool persistIds)
        {
            var companyName = GetNestedString(item, "company", "display_name") ?? "Unknown company";
            var location = GetNestedString(item, "location", "display_name") ?? "Malaysia";
            var title = GetString(item, "title") ?? "Untitled role";
            var description = StripHtml(GetString(item, "description"));
            var url = GetString(item, "redirect_url");

            return new JobOpportunityResponse
            {
                Id = persistIds ? GetInt(item, "id") ?? 0 : 0,
                Title = title,
                Description = description,
                Type = InferOpportunityType(title, description).ToString(),
                EmploymentType = EmploymentType.FullTime.ToString(),
                Location = location,
                SalaryMin = GetDecimal(item, "salary_min"),
                SalaryMax = GetDecimal(item, "salary_max"),
                RequiredSkills = InferSkills(title, description),
                JobUrl = url,
                IsActive = true,
                IsImported = true,
                SourceUrl = url,
                SourceProvider = "Adzuna",
                CreatedAt = DateTime.UtcNow,
                Company = new CompanySummary
                {
                    Id = 0,
                    Name = companyName,
                    Industry = "Hiring",
                    City = location,
                    Country = CountryNameFromCode(GetString(item, "country") ?? string.Empty),
                    SourceProvider = "Adzuna"
                }
            };
        }

        private static OpportunityType InferOpportunityType(string? title, string? description)
        {
            var text = $"{title} {description}".ToLowerInvariant();
            return text.Contains("intern") || text.Contains("graduate trainee") ? OpportunityType.Internship : OpportunityType.Job;
        }

        private static string InferSkills(string? title, string? description)
        {
            var text = $"{title} {description}".ToLowerInvariant();
            var skills = new List<string>();
            foreach (var skill in new[] { "React", "JavaScript", "C#", ".NET", "SQL", "Python", "Data Analysis", "Communication", "Problem Solving" })
            {
                if (text.Contains(skill.ToLowerInvariant())) skills.Add(skill);
            }
            return skills.Count == 0 ? "Communication,Problem Solving" : string.Join(",", skills.Distinct());
        }

        private static string? GetString(JsonElement item, string name) =>
            item.TryGetProperty(name, out var value) && value.ValueKind != JsonValueKind.Null ? value.ToString() : null;

        private static string? GetNestedString(JsonElement item, string parent, string child) =>
            item.TryGetProperty(parent, out var parentEl) && parentEl.TryGetProperty(child, out var value) ? value.ToString() : null;

        private static int? GetInt(JsonElement item, string name) =>
            item.TryGetProperty(name, out var value) && value.TryGetInt32(out var parsed) ? parsed : null;

        private static decimal? GetDecimal(JsonElement item, string name) =>
            item.TryGetProperty(name, out var value) && value.TryGetDecimal(out var parsed) ? parsed : null;

        private static string? StripHtml(string? value) =>
            string.IsNullOrWhiteSpace(value)
                ? value
                : System.Text.RegularExpressions.Regex.Replace(value, "<.*?>", string.Empty).Trim();

        private static string ResolveCountry(string? country)
        {
            var normalized = string.IsNullOrWhiteSpace(country) ? "sg" : country.Trim().ToLowerInvariant();
            var supported = SupportedCountries.Select(item => item.Code).ToHashSet(StringComparer.OrdinalIgnoreCase);

            return supported.Contains(normalized) ? normalized : "sg";
        }

        private void RecordUsage(int? userId, string operation, AdzunaSearchResult result)
        {
            if (!userId.HasValue) return;
            _usageTracker.Record(
                userId.Value,
                "Adzuna",
                operation,
                matched: result.Count,
                errors: string.IsNullOrWhiteSpace(result.Message) ? 0 : 1,
                message: result.Message);
        }

        private static string CountryNameFromCode(string code) =>
            SupportedCountries.FirstOrDefault(item => string.Equals(item.Code, code, StringComparison.OrdinalIgnoreCase))?.Name ?? "External";

        private static readonly List<AdzunaCountry> SupportedCountries =
        [
            new("at", "Austria"),
            new("au", "Australia"),
            new("be", "Belgium"),
            new("br", "Brazil"),
            new("ca", "Canada"),
            new("ch", "Switzerland"),
            new("de", "Germany"),
            new("es", "Spain"),
            new("fr", "France"),
            new("gb", "United Kingdom"),
            new("in", "India"),
            new("it", "Italy"),
            new("mx", "Mexico"),
            new("nl", "Netherlands"),
            new("nz", "New Zealand"),
            new("pl", "Poland"),
            new("sg", "Singapore"),
            new("us", "United States"),
            new("za", "South Africa")
        ];
    }

    public class AdzunaOptions
    {
        public string AppId { get; set; } = string.Empty;
        public string AppKey { get; set; } = string.Empty;
        public string Country { get; set; } = "sg";
        public bool IsConfigured => !string.IsNullOrWhiteSpace(AppId) && !string.IsNullOrWhiteSpace(AppKey);
    }
}
