using System.Text;
using System.Text.Json;
using CareerTrackAI.Data;
using CareerTrackAI.DTOs.JobOpportunity;
using Microsoft.EntityFrameworkCore;

namespace CareerTrackAI.Services
{
    public record AiSourcingRequest(string Prompt, int ResultsPerPage = 20, string? Provider = null, string? Country = null);
    public record AiSourcingPlan(string What, string? Where, string Reason, string Provider = "jobdatalake", string? Country = null);
    public record AiSourcingSearchResult(
        string Provider,
        int Count,
        string? Country,
        string Query,
        string Location,
        bool Configured,
        string? Message,
        List<JobOpportunityResponse> Opportunities);
    public record AiSourcingResult(AiSourcingPlan Plan, AiSourcingSearchResult Search, ImportResult? ImportResult);
    public record WebSourcedOpportunity(
        string Title,
        string CompanyName,
        string? Location,
        string? Type,
        string? EmploymentType,
        string? Description,
        string? RequiredSkills,
        string? JobUrl,
        string? SourceUrl);

    public interface IAiSourcingService
    {
        Task<AiSourcingResult> SearchAsync(int userId, AiSourcingRequest request);
        Task<AiSourcingResult> ImportAsync(int userId, AiSourcingRequest request);
    }

    public class AiSourcingService : IAiSourcingService
    {
        private readonly HttpClient _httpClient;
        private readonly AppDbContext _db;
        private readonly GeminiOptions _geminiOptions;
        private readonly IAdzunaJobImportService _adzunaService;
        private readonly IJobDataLakeImportService _jobDataLakeService;

        public AiSourcingService(
            IHttpClientFactory factory,
            AppDbContext db,
            GeminiOptions geminiOptions,
            IAdzunaJobImportService adzunaService,
            IJobDataLakeImportService jobDataLakeService)
        {
            _httpClient = factory.CreateClient("Gemini");
            _db = db;
            _geminiOptions = geminiOptions;
            _adzunaService = adzunaService;
            _jobDataLakeService = jobDataLakeService;
        }

        public async Task<AiSourcingResult> SearchAsync(int userId, AiSourcingRequest request)
        {
            var plan = await BuildPlanAsync(userId, request);
            var search = await SearchProviderAsync(userId, request, plan);
            return new AiSourcingResult(plan, search, null);
        }

        public async Task<AiSourcingResult> ImportAsync(int userId, AiSourcingRequest request)
        {
            var plan = await BuildPlanAsync(userId, request);
            var search = await SearchProviderAsync(userId, request, plan);
            var import = search.Opportunities.Count == 0
                ? new ImportResult(0, 0, 0, [search.Message ?? "No opportunities matched the AI sourcing plan."])
                : await ImportProviderAsync(userId, request, plan);

            return new AiSourcingResult(plan, search, import);
        }

        private async Task<AiSourcingSearchResult> SearchProviderAsync(int userId, AiSourcingRequest request, AiSourcingPlan plan)
        {
            if (string.Equals(plan.Provider, "adzuna", StringComparison.OrdinalIgnoreCase))
            {
                var adzuna = await _adzunaService.SearchAsync(new AdzunaSearchRequest(plan.What, plan.Where, request.ResultsPerPage, Country: plan.Country ?? request.Country), userId);
                return new AiSourcingSearchResult("Adzuna", adzuna.Count, adzuna.Country, adzuna.Query, adzuna.Location, adzuna.Configured, adzuna.Message, adzuna.Opportunities);
            }

            if (IsWebProvider(plan.Provider))
            {
                return await SearchWebAsync(request, plan);
            }

            var jdl = await _jobDataLakeService.SearchAsync(
                new JobDataLakeSearchRequest(plan.What, request.Prompt, plan.Country ?? request.Country, null, null, request.ResultsPerPage),
                userId);
            return new AiSourcingSearchResult("JobDataLake", jdl.Count, jdl.Country, jdl.Query, plan.Where ?? string.Empty, jdl.Configured, jdl.Message, jdl.Opportunities);
        }

        private async Task<ImportResult> ImportProviderAsync(int userId, AiSourcingRequest request, AiSourcingPlan plan)
        {
            if (string.Equals(plan.Provider, "adzuna", StringComparison.OrdinalIgnoreCase))
            {
                return await _adzunaService.ImportAsync(new AdzunaSearchRequest(plan.What, plan.Where, request.ResultsPerPage, Country: plan.Country ?? request.Country), userId);
            }

            if (IsWebProvider(plan.Provider))
            {
                return new ImportResult(0, 0, 0, ["Use AI preview rows, review them, then click Import selected. Web scout rows are intentionally reviewed before saving."]);
            }

            return await _jobDataLakeService.ImportAsync(
                new JobDataLakeSearchRequest(plan.What, request.Prompt, plan.Country ?? request.Country, null, null, request.ResultsPerPage),
                userId);
        }

        private async Task<AiSourcingPlan> BuildPlanAsync(int userId, AiSourcingRequest request)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            var fallback = BuildFallbackPlan(request.Prompt, user?.Major, user?.City);
            if (!_geminiOptions.IsConfigured) return fallback;

            var prompt =
                "Convert the user's sourcing request into a job sourcing plan. Return only valid JSON.\n\n" +
                "{ \"what\": \"short job keywords\", \"where\": \"city or country, can be empty\", \"reason\": \"brief reason\", \"provider\": \"jobdatalake, adzuna, google, or linkedin\", \"country\": \"ISO country code such as MY, SG, US, GB\" }\n\n" +
                "Rules:\n" +
                "- Keep what broad enough to return results.\n" +
                "- Prefer JobDataLake for broad global, semantic, remote, or LinkedIn-like discovery.\n" +
                "- Prefer google or linkedin only when the selected provider asks for web scouting.\n" +
                "- Prefer Adzuna only when the requested country is supported by Adzuna.\n" +
                "- If the user asks for Malaysia, set provider to jobdatalake and country to MY.\n" +
                "- If the caller selected a provider, respect it unless it is invalid.\n" +
                "- Prefer student, graduate, internship, junior, or entry-level keywords when suitable.\n\n" +
                $"User major: {user?.Major ?? "Not specified"}\n" +
                $"User city: {user?.City ?? "Not specified"}\n" +
                $"Selected provider: {request.Provider ?? "auto"}\n" +
                $"Selected country: {request.Country ?? "auto"}\n" +
                $"Request: {request.Prompt}";

            var body = JsonSerializer.Serialize(new
            {
                contents = new[]
                {
                    new
                    {
                        role = "user",
                        parts = new[] { new { text = prompt } }
                    }
                }
            });

            try
            {
                using var response = await _httpClient.PostAsync(
                    $"v1beta/models/{_geminiOptions.ModelId}:generateContent",
                    new StringContent(body, Encoding.UTF8, "application/json"));

                var responseBody = await response.Content.ReadAsStringAsync();
                if (!response.IsSuccessStatusCode) return fallback;

                using var doc = JsonDocument.Parse(responseBody);
                var text = doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString();

                var cleaned = (text ?? string.Empty).Replace("```json", "").Replace("```", "").Trim();
                var plan = JsonSerializer.Deserialize<AiSourcingPlan>(cleaned, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (plan == null || string.IsNullOrWhiteSpace(plan.What)) return fallback;

                return plan with
                {
                    What = plan.What.Trim(),
                    Where = string.IsNullOrWhiteSpace(plan.Where) ? fallback.Where : plan.Where.Trim(),
                    Reason = string.IsNullOrWhiteSpace(plan.Reason) ? "AI converted your request into a job search plan." : plan.Reason.Trim(),
                    Provider = NormalizeProvider(request.Provider ?? plan.Provider),
                    Country = string.IsNullOrWhiteSpace(request.Country) ? plan.Country?.Trim().ToUpperInvariant() : request.Country.Trim().ToUpperInvariant()
                };
            }
            catch
            {
                return fallback;
            }
        }

        private static AiSourcingPlan BuildFallbackPlan(string? prompt, string? major, string? city)
        {
            var source = string.IsNullOrWhiteSpace(prompt) ? $"{major} internship" : prompt.Trim();
            var lower = source.ToLowerInvariant();
            var where =
                lower.Contains("kuala lumpur") ? "Kuala Lumpur" :
                lower.Contains("selangor") ? "Selangor" :
                lower.Contains("malaysia") ? "Malaysia" :
                string.IsNullOrWhiteSpace(city) ? "Malaysia" : city;

            var what =
                lower.Contains("data") ? "data analyst intern" :
                lower.Contains("frontend") || lower.Contains("front-end") ? "frontend developer intern" :
                lower.Contains("backend") || lower.Contains("back-end") ? "backend developer intern" :
                lower.Contains("software") || lower.Contains("developer") ? "software developer intern" :
                string.IsNullOrWhiteSpace(major) ? "intern" : $"{major} intern";

            var provider = NormalizeProvider(null);
            var country =
                lower.Contains("malaysia") || lower.Contains("kuala lumpur") || lower.Contains("selangor") ? "MY" :
                lower.Contains("singapore") ? "SG" :
                null;

            return new AiSourcingPlan(what, where, "Fallback sourcing plan generated from the request and profile.", provider, country);
        }

        private static string NormalizeProvider(string? provider)
        {
            if (string.Equals(provider, "adzuna", StringComparison.OrdinalIgnoreCase)) return "adzuna";
            if (string.Equals(provider, "google", StringComparison.OrdinalIgnoreCase)) return "google";
            if (string.Equals(provider, "linkedin", StringComparison.OrdinalIgnoreCase)) return "linkedin";
            if (string.Equals(provider, "web", StringComparison.OrdinalIgnoreCase)) return "google";
            return "jobdatalake";
        }

        private static bool IsWebProvider(string? provider) =>
            string.Equals(provider, "google", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(provider, "linkedin", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(provider, "web", StringComparison.OrdinalIgnoreCase);

        private async Task<AiSourcingSearchResult> SearchWebAsync(AiSourcingRequest request, AiSourcingPlan plan)
        {
            if (!_geminiOptions.IsConfigured)
            {
                return new AiSourcingSearchResult("Google Search", 0, plan.Country ?? request.Country, plan.What, plan.Where ?? string.Empty, false, "Gemini is not configured, so web scout cannot run.", []);
            }

            var providerLabel = string.Equals(plan.Provider, "linkedin", StringComparison.OrdinalIgnoreCase) ? "LinkedIn Scout" : "Google Search";
            var limit = Math.Clamp(request.ResultsPerPage, 1, 12);
            var scoutInstruction = string.Equals(plan.Provider, "linkedin", StringComparison.OrdinalIgnoreCase)
                ? "Prioritize public LinkedIn Jobs result pages and official company career pages. Do not scrape private LinkedIn content."
                : "Prioritize official company career pages, public job boards, and credible public sources.";

            var prompt =
                "Use Google Search to find currently useful internship or job opportunities, then return JSON only.\n\n" +
                "JSON shape: { \"jobs\": [{ \"title\": \"...\", \"companyName\": \"...\", \"location\": \"...\", \"type\": \"Internship or Job\", \"employmentType\": \"FullTime, PartTime, or Contract\", \"description\": \"short useful note\", \"requiredSkills\": \"comma separated\", \"jobUrl\": \"https://...\", \"sourceUrl\": \"https://...\" }] }\n\n" +
                $"Limit: {limit}\n" +
                $"Request: {request.Prompt}\n" +
                $"Keywords: {plan.What}\n" +
                $"Country: {plan.Country ?? request.Country ?? "any"}\n" +
                $"Location: {plan.Where ?? "any"}\n" +
                scoutInstruction + "\n" +
                "Only include rows with a useful URL. If there are no reliable results, return { \"jobs\": [] }.";

            var body = JsonSerializer.Serialize(new
            {
                contents = new[]
                {
                    new
                    {
                        role = "user",
                        parts = new[] { new { text = prompt } }
                    }
                },
                tools = new[]
                {
                    new { google_search = new { } }
                }
            });

            try
            {
                using var response = await _httpClient.PostAsync(
                    $"v1beta/models/{_geminiOptions.ModelId}:generateContent",
                    new StringContent(body, Encoding.UTF8, "application/json"));

                var responseBody = await response.Content.ReadAsStringAsync();
                if (!response.IsSuccessStatusCode)
                    return new AiSourcingSearchResult(
                        providerLabel,
                        0,
                        plan.Country ?? request.Country,
                        plan.What,
                        plan.Where ?? string.Empty,
                        true,
                        FriendlyWebScoutError((int)response.StatusCode, responseBody),
                        []);

                using var doc = JsonDocument.Parse(responseBody);
                var text = doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString();

                var cleaned = (text ?? string.Empty).Replace("```json", "").Replace("```", "").Trim();
                var parsed = JsonSerializer.Deserialize<WebSourcingEnvelope>(cleaned, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                var opportunities = (parsed?.Jobs ?? [])
                    .Where(job => !string.IsNullOrWhiteSpace(job.Title) && !string.IsNullOrWhiteSpace(job.CompanyName))
                    .Take(limit)
                    .Select(job => new JobOpportunityResponse
                    {
                        Id = 0,
                        Title = job.Title,
                        Description = job.Description,
                        Type = string.IsNullOrWhiteSpace(job.Type) ? "Internship" : job.Type,
                        EmploymentType = NormalizeEmploymentText(job.EmploymentType),
                        Location = job.Location,
                        IsRemote = job.Location?.Contains("remote", StringComparison.OrdinalIgnoreCase) == true,
                        RequiredSkills = job.RequiredSkills,
                        JobUrl = job.JobUrl,
                        SourceUrl = job.SourceUrl ?? job.JobUrl,
                        SourceProvider = providerLabel,
                        IsActive = true,
                        IsImported = true,
                        CreatedAt = DateTime.UtcNow,
                        Company = new DTOs.Company.CompanySummary
                        {
                            Id = 0,
                            Name = job.CompanyName,
                            Country = plan.Country ?? request.Country,
                            City = job.Location,
                            SourceProvider = providerLabel
                        }
                    })
                    .ToList();

                return new AiSourcingSearchResult(
                    providerLabel,
                    opportunities.Count,
                    plan.Country ?? request.Country,
                    plan.What,
                    plan.Where ?? string.Empty,
                    true,
                    opportunities.Count == 0 ? "Web scout did not find reliable rows. Try broader keywords or use JobDataLake." : "Web scout results should be reviewed before importing.",
                    opportunities);
            }
            catch
            {
                return new AiSourcingSearchResult(providerLabel, 0, plan.Country ?? request.Country, plan.What, plan.Where ?? string.Empty, true, "Web scout could not parse results. Try JobDataLake or broader keywords.", []);
            }
        }

        private static string? NormalizeEmploymentText(string? value)
        {
            var normalized = (value ?? string.Empty).Replace("_", "", StringComparison.OrdinalIgnoreCase).Replace("-", "", StringComparison.OrdinalIgnoreCase).ToLowerInvariant();
            return normalized switch
            {
                "fulltime" => "FullTime",
                "parttime" => "PartTime",
                "contract" => "Contract",
                "internship" => "FullTime",
                _ => null
            };
        }

        private static string FriendlyWebScoutError(int statusCode, string responseBody)
        {
            var raw = responseBody.ToLowerInvariant();
            if (statusCode == 429 || raw.Contains("quota") || raw.Contains("resource_exhausted") || raw.Contains("rate limit"))
                return "AI web scouting is connected, but the Gemini quota or daily limit has been reached. Try again later or use Adzuna/JobDataLake directly.";

            if (statusCode is 401 or 403 || raw.Contains("api key") || raw.Contains("permission") || raw.Contains("unauthorized"))
                return "AI web scouting could not run because Gemini rejected the API key or model access.";

            if (statusCode == 404 || raw.Contains("not found"))
                return "AI web scouting could not find the configured Gemini model. Check the backend model setting.";

            if (statusCode >= 500)
                return "AI web scouting is temporarily unavailable from the provider. Try again shortly or use another source.";

            return "AI web scouting could not complete this search. Try broader keywords or use JobDataLake/Adzuna directly.";
        }

        private class WebSourcingEnvelope
        {
            public List<WebSourcedOpportunity> Jobs { get; set; } = [];
        }
    }
}
