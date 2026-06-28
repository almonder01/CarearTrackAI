using System.Text.Json;
using CareerTrackAI.Data;
using CareerTrackAI.DTOs.Company;
using CareerTrackAI.DTOs.JobOpportunity;
using CareerTrackAI.Enums;
using CareerTrackAI.Models;
using Microsoft.EntityFrameworkCore;

namespace CareerTrackAI.Services
{
    public record JobDataLakeSearchRequest(
        string? Query,
        string? SemanticQuery,
        string? Country,
        string? RemoteType,
        string? EmploymentType,
        int PerPage = 20,
        int Page = 1);

    public record JobDataLakeSearchResult(
        int Count,
        int Page,
        int PerPage,
        string Query,
        string? Country,
        bool Configured,
        string? Message,
        List<JobOpportunityResponse> Opportunities);

    public interface IJobDataLakeImportService
    {
        Task<JobDataLakeSearchResult> SearchAsync(JobDataLakeSearchRequest request, int? userId = null);
        Task<ImportResult> ImportAsync(JobDataLakeSearchRequest request, int? userId = null);
    }

    public class JobDataLakeImportService : IJobDataLakeImportService
    {
        private readonly HttpClient _httpClient;
        private readonly AppDbContext _db;
        private readonly JobDataLakeOptions _options;
        private readonly IApiUsageTracker _usageTracker;

        public JobDataLakeImportService(IHttpClientFactory factory, AppDbContext db, JobDataLakeOptions options, IApiUsageTracker usageTracker)
        {
            _httpClient = factory.CreateClient("JobDataLake");
            _db = db;
            _options = options;
            _usageTracker = usageTracker;
        }

        public async Task<JobDataLakeSearchResult> SearchAsync(JobDataLakeSearchRequest request, int? userId = null)
        {
            var query = string.IsNullOrWhiteSpace(request.Query) ? "*" : request.Query.Trim();
            var country = string.IsNullOrWhiteSpace(request.Country) ? null : request.Country.Trim().ToUpperInvariant();
            var perPage = Math.Clamp(request.PerPage, 1, 50);
            var page = Math.Max(1, request.Page);

            if (!_options.IsConfigured)
            {
                var notConfigured = new JobDataLakeSearchResult(0, page, perPage, query, country, false, "JobDataLake API key is not configured.", []);
                RecordUsage(userId, "search", notConfigured);
                return notConfigured;
            }

            var parameters = new List<string>
            {
                $"q={Uri.EscapeDataString(query)}",
                $"page={page}",
                $"per_page={perPage}"
            };

            if (!string.IsNullOrWhiteSpace(request.SemanticQuery) && string.IsNullOrWhiteSpace(country))
                parameters.Add($"semantic_query={Uri.EscapeDataString(request.SemanticQuery.Trim())}");
            if (!string.IsNullOrWhiteSpace(country))
                parameters.Add($"countries={Uri.EscapeDataString(country)}");
            if (!string.IsNullOrWhiteSpace(request.RemoteType))
                parameters.Add($"remote_type={Uri.EscapeDataString(request.RemoteType.Trim())}");
            if (!string.IsNullOrWhiteSpace(request.EmploymentType))
                parameters.Add($"employment_type={Uri.EscapeDataString(request.EmploymentType.Trim())}");

            var responseResult = await SendSearchAsync(parameters);
            if (!responseResult.Response.IsSuccessStatusCode &&
                (int)responseResult.Response.StatusCode >= 500 &&
                parameters.Any(parameter => parameter.StartsWith("semantic_query=", StringComparison.OrdinalIgnoreCase)))
            {
                responseResult.Response.Dispose();
                parameters.RemoveAll(parameter => parameter.StartsWith("semantic_query=", StringComparison.OrdinalIgnoreCase));
                responseResult = await SendSearchAsync(parameters);
            }

            using var response = responseResult.Response;
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                var message = $"JobDataLake returned {(int)response.StatusCode} {response.ReasonPhrase}.";
                if (!string.IsNullOrWhiteSpace(body)) message += $" {body}";
                var failed = new JobDataLakeSearchResult(0, page, perPage, query, country, true, message, []);
                RecordUsage(userId, "search", failed);
                return failed;
            }

            await using var stream = await response.Content.ReadAsStreamAsync();
            using var doc = await JsonDocument.ParseAsync(stream);
            var root = doc.RootElement;
            var count = GetInt(root, "found") ?? 0;
            var jobs = new List<JobOpportunityResponse>();

            if (root.TryGetProperty("jobs", out var items) && items.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in items.EnumerateArray())
                {
                    jobs.Add(MapJob(item));
                }
            }

            var result = new JobDataLakeSearchResult(
                count,
                GetInt(root, "page") ?? page,
                GetInt(root, "per_page") ?? perPage,
                query,
                country,
                true,
                jobs.Count == 0 ? "JobDataLake returned 0 jobs for this query. Try a broader query or clear optional filters." : null,
                jobs);

            RecordUsage(userId, "search", result);
            return result;
        }

        private async Task<(HttpResponseMessage Response, string Url)> SendSearchAsync(List<string> parameters)
        {
            var url = $"v1/jobs?{string.Join("&", parameters)}";
            var requestMessage = new HttpRequestMessage(HttpMethod.Get, url);
            requestMessage.Headers.Add("X-API-Key", _options.ApiKey);
            return (await _httpClient.SendAsync(requestMessage), url);
        }

        public async Task<ImportResult> ImportAsync(JobDataLakeSearchRequest request, int? userId = null)
        {
            var result = await SearchAsync(request, userId);
            if (result.Opportunities.Count == 0)
                return new ImportResult(0, 0, 0, [result.Message ?? "No JobDataLake opportunities matched this query."]);

            var created = 0;
            var updated = 0;
            var skipped = 0;
            var errors = new List<string>();

            foreach (var item in result.Opportunities)
            {
                if (string.IsNullOrWhiteSpace(item.Title) || string.IsNullOrWhiteSpace(item.Company.Name))
                {
                    skipped++;
                    errors.Add("Skipped JobDataLake opportunity without title or company.");
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
                        Country = item.Company.Country,
                        IsImported = true,
                        ImportedAt = DateTime.UtcNow,
                    SourceUrl = item.SourceUrl,
                    Website = DomainToWebsite(item.Company.Website),
                    SourceProvider = "JobDataLake"
                };
                    _db.Companies.Add(company);
                    await _db.SaveChangesAsync();
                }

                var job = await _db.JobOpportunities.FirstOrDefaultAsync(j => j.Title == item.Title && j.CompanyId == company.Id && j.UserId == userId);
                if (job == null)
                {
                    job = new JobOpportunity { UserId = userId, Title = item.Title, CompanyId = company.Id, IsImported = true, ImportedAt = DateTime.UtcNow };
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
                job.EmploymentType = ParseEmploymentType(item.EmploymentType);
                job.Location = item.Location;
                job.IsRemote = item.IsRemote;
                job.SalaryMin = item.SalaryMin;
                job.SalaryMax = item.SalaryMax;
                job.RequiredSkills = item.RequiredSkills;
                job.JobUrl = item.JobUrl;
                job.SourceUrl = item.SourceUrl;
                job.SourceProvider = "JobDataLake";
                job.IsActive = true;
            }

            await _db.SaveChangesAsync();
            if (userId.HasValue)
            {
                _usageTracker.Record(userId.Value, "JobDataLake", "import", requests: 0, imported: created + updated, errors: errors.Count);
            }

            return new ImportResult(created, updated, skipped, errors);
        }

        private static JobOpportunityResponse MapJob(JsonElement item)
        {
            var title = GetString(item, "title") ?? "Untitled role";
            var companyName = GetString(item, "company_name") ?? "Unknown company";
            var domain = GetString(item, "domain_name");
            var locations = GetStringArray(item, "locations");
            var countries = GetStringArray(item, "countries");
            var skills = GetStringArray(item, "required_skills");
            var remoteType = GetString(item, "remote_type");
            var employmentType = GetString(item, "employment_type");
            var url = GetString(item, "url");

            return new JobOpportunityResponse
            {
                Id = 0,
                Title = title,
                Description = BuildDescription(item),
                Type = InferOpportunityType(title, employmentType).ToString(),
                EmploymentType = ParseEmploymentType(employmentType)?.ToString(),
                Location = locations.Count > 0 ? string.Join(", ", locations.Take(2)) : string.Join(", ", countries),
                IsRemote = string.Equals(remoteType, "fully_remote", StringComparison.OrdinalIgnoreCase) ||
                           locations.Any(location => location.Contains("remote", StringComparison.OrdinalIgnoreCase)),
                SalaryMin = GetDecimal(item, "salary_min_usd"),
                SalaryMax = GetDecimal(item, "salary_max_usd"),
                RequiredSkills = skills.Count > 0 ? string.Join(",", skills) : null,
                JobUrl = url,
                SourceUrl = url,
                SourceProvider = "JobDataLake",
                IsActive = true,
                IsImported = true,
                CreatedAt = DateTime.UtcNow,
                Company = new CompanySummary
                {
                    Id = 0,
                    Name = companyName,
                    Industry = GetString(item, "industry") ?? "Hiring",
                    City = locations.FirstOrDefault(),
                    Country = countries.FirstOrDefault(),
                    Website = DomainToWebsite(domain),
                    SourceProvider = "JobDataLake"
                }
            };
        }

        private static string? DomainToWebsite(string? domain)
        {
            if (string.IsNullOrWhiteSpace(domain)) return null;
            var trimmed = domain.Trim();
            return trimmed.StartsWith("http", StringComparison.OrdinalIgnoreCase) ? trimmed : $"https://{trimmed}";
        }

        private static string? BuildDescription(JsonElement item)
        {
            var parts = new List<string>();
            AddPart(parts, "Function", GetString(item, "job_function"));
            AddPart(parts, "Remote", GetString(item, "remote_type"));
            AddPart(parts, "Seniority", string.Join(", ", GetStringArray(item, "seniority")));
            AddPart(parts, "Employment", GetString(item, "employment_type"));
            return parts.Count == 0 ? null : string.Join(Environment.NewLine, parts);
        }

        private static void AddPart(List<string> parts, string label, string? value)
        {
            if (!string.IsNullOrWhiteSpace(value))
                parts.Add($"{label}: {value}");
        }

        private static OpportunityType InferOpportunityType(string? title, string? text)
        {
            var source = $"{title} {text}".ToLowerInvariant();
            return source.Contains("intern") || source.Contains("graduate") ? OpportunityType.Internship : OpportunityType.Job;
        }

        private static EmploymentType? ParseEmploymentType(string? value)
        {
            var normalized = (value ?? string.Empty).Replace("-", "_", StringComparison.OrdinalIgnoreCase).ToLowerInvariant();
            return normalized switch
            {
                "full_time" or "fulltime" => EmploymentType.FullTime,
                "part_time" or "parttime" => EmploymentType.PartTime,
                "contract" => EmploymentType.Contract,
                _ => null
            };
        }

        private void RecordUsage(int? userId, string operation, JobDataLakeSearchResult result)
        {
            if (!userId.HasValue) return;
            _usageTracker.Record(
                userId.Value,
                "JobDataLake",
                operation,
                matched: result.Count,
                errors: string.IsNullOrWhiteSpace(result.Message) ? 0 : 1,
                message: result.Message);
        }

        private static string? GetString(JsonElement item, string name) =>
            item.TryGetProperty(name, out var value) && value.ValueKind != JsonValueKind.Null ? value.ToString() : null;

        private static int? GetInt(JsonElement item, string name) =>
            item.TryGetProperty(name, out var value) && value.TryGetInt32(out var parsed) ? parsed : null;

        private static decimal? GetDecimal(JsonElement item, string name) =>
            item.TryGetProperty(name, out var value) && value.TryGetDecimal(out var parsed) ? parsed : null;

        private static List<string> GetStringArray(JsonElement item, string name)
        {
            if (!item.TryGetProperty(name, out var value) || value.ValueKind != JsonValueKind.Array)
                return [];

            return value.EnumerateArray()
                .Select(element => element.ValueKind == JsonValueKind.String ? element.GetString() : element.ToString())
                .Where(text => !string.IsNullOrWhiteSpace(text))
                .Select(text => text!)
                .ToList();
        }
    }

    public class JobDataLakeOptions
    {
        public string ApiKey { get; set; } = string.Empty;
        public string BaseUrl { get; set; } = "https://api.jobdatalake.com/";
        public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);
    }
}
