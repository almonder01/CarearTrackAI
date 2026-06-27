using System.Text;
using System.Text.Json;
using CareerTrackAI.Data;
using CareerTrackAI.DTOs.AI;
using CareerTrackAI.Enums;
using Microsoft.EntityFrameworkCore;

namespace CareerTrackAI.Services
{
    public interface IAiService
    {
        Task<ChatResponse> ChatAsync(int userId, ChatRequest request);
        Task<AnalyzeResumeResponse> AnalyzeResumeAsync(int resumeId, int userId);
        Task<GenerateCoverLetterResponse> GenerateCoverLetterAsync(int userId, GenerateCoverLetterRequest request);
        Task<RecommendationsResponse> GetRecommendationsAsync(int userId);
    }

    public class AiService : IAiService
    {
        private readonly HttpClient _httpClient;
        private readonly AppDbContext _db;
        private readonly string _modelId;

        public AiService(IHttpClientFactory factory, AppDbContext db, GeminiOptions options)
        {
            _httpClient = factory.CreateClient("Gemini");
            _db = db;
            _modelId = options.ModelId;
        }

        // ==================== CHAT ====================
        public async Task<ChatResponse> ChatAsync(int userId, ChatRequest request)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);

            var systemPrompt =
                "You are a professional AI assistant specialized in helping students and graduates find internship and employment opportunities.\n\n" +
                "Current user:\n" +
                $"- Name: {user?.FullName}\n" +
                $"- Major: {user?.Major ?? "Not specified"}\n" +
                $"- University: {user?.University ?? "Not specified"}\n" +
                $"- City: {user?.City ?? "Not specified"}\n\n" +
                "Always respond in the same language used by the user. Keep your answers concise, helpful, and professional.";

            var contents = new List<object>();

            foreach (var msg in request.History)
            {
                contents.Add(new
                {
                    role = msg.Role,
                    parts = new[] { new { text = msg.Content } }
                });
            }

            contents.Add(new
            {
                role = "user",
                parts = new[] { new { text = request.Message } }
            });

            var reply = await CallGeminiAsync(systemPrompt, contents);
            return new ChatResponse { Reply = reply };
        }

        // ==================== ANALYZE RESUME ====================
        public async Task<AnalyzeResumeResponse> AnalyzeResumeAsync(int resumeId, int userId)
        {
            var resume = await _db.Resumes
                .FirstOrDefaultAsync(r => r.Id == resumeId && r.UserId == userId);

            if (resume == null || string.IsNullOrEmpty(resume.ParsedContent))
                return new AnalyzeResumeResponse
                {
                    Weaknesses = new List<string> { "Resume content has not been extracted yet." }
                };

            var jsonSchema =
                "{\n" +
                "  \"strengths\": [\"Strength 1\", \"Strength 2\"],\n" +
                "  \"weaknesses\": [\"Weakness 1\"],\n" +
                "  \"missingSkills\": [\"Missing Skill 1\"],\n" +
                "  \"suggestions\": [\"Suggestion 1\"],\n" +
                "  \"overallScore\": 75\n" +
                "}";

            var prompt =
                "Analyze the following resume and return your response in JSON format only, without any additional text.\n\n" +
                jsonSchema + "\n\n" +
                "Resume:\n" +
                resume.ParsedContent;

            var contents = new List<object>
            {
                new { role = "user", parts = new[] { new { text = prompt } } }
            };

            var raw = await CallGeminiAsync(null, contents);
            return ParseJsonResponse<AnalyzeResumeResponse>(raw) ?? new AnalyzeResumeResponse();
        }

        // ==================== GENERATE COVER LETTER ====================
        public async Task<GenerateCoverLetterResponse> GenerateCoverLetterAsync(int userId, GenerateCoverLetterRequest request)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);

            var job = await _db.JobOpportunities
                .Include(j => j.Company)
                .FirstOrDefaultAsync(j => j.Id == request.JobOpportunityId);

            if (job == null)
                return new GenerateCoverLetterResponse { CoverLetter = "Job opportunity not found." };

            string resumeContext = string.Empty;
            if (request.ResumeId.HasValue)
            {
                var resume = await _db.Resumes
                    .FirstOrDefaultAsync(r => r.Id == request.ResumeId && r.UserId == userId);
                resumeContext = resume?.ParsedContent ?? string.Empty;
            }

            var jsonSchema =
                "{\n" +
                "  \"subject\": \"Email Subject\",\n" +
                "  \"coverLetter\": \"Complete cover letter text\"\n" +
                "}";

            var prompt =
                "Write a professional cover letter for the following job opportunity and return your response as valid JSON only.\n\n" +
                jsonSchema + "\n\n" +
                "Applicant Information:\n" +
                $"- Name: {user?.FullName}\n" +
                $"- Major: {user?.Major}\n" +
                $"- University: {user?.University}\n" +
                (string.IsNullOrEmpty(resumeContext) ? "" : $"- Resume Summary: {resumeContext[..Math.Min(500, resumeContext.Length)]}\n") +
                "\nJob Information:\n" +
                $"- Title: {job.Title}\n" +
                $"- Company: {job.Company.Name}\n" +
                $"- Type: {(job.Type == OpportunityType.Internship ? "Internship" : "Full-time Job")}\n" +
                $"- Description: {job.Description ?? "Not provided"}\n" +
                (string.IsNullOrEmpty(request.AdditionalNotes) ? "" : $"- Additional Instructions: {request.AdditionalNotes}\n") +
                "\nRequirements:\n" +
                "- Tailor the cover letter to the job description.\n" +
                "- Highlight relevant education, skills, and experience.\n" +
                "- Maintain a professional, confident, and concise tone.\n" +
                "- Return only valid JSON with no markdown or additional text.";

            var contents = new List<object>
            {
                new { role = "user", parts = new[] { new { text = prompt } } }
            };

            var raw = await CallGeminiAsync(null, contents);
            return ParseJsonResponse<GenerateCoverLetterResponse>(raw) ?? new GenerateCoverLetterResponse();
        }

        // ==================== RECOMMENDATIONS ====================
        public async Task<RecommendationsResponse> GetRecommendationsAsync(int userId)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);

            var applications = await _db.Applications
                .Where(a => a.UserId == userId)
                .Include(a => a.JobOpportunity).ThenInclude(j => j.Company)
                .ToListAsync();

            var totalApps = applications.Count;
            var accepted = applications.Count(a => a.Status == ApplicationStatus.Accepted);
            var rejected = applications.Count(a => a.Status == ApplicationStatus.Rejected);

            var companiesApplied = applications
                .Select(a => a.JobOpportunity.Company.Name)
                .Distinct()
                .Take(10)
                .ToList();

            var jsonSchema =
                "{\n" +
                "  \"companiesToFollow\": [\"Company 1\", \"Company 2\"],\n" +
                "  \"skillsToLearn\": [\"Skill 1\", \"Skill 2\"],\n" +
                "  \"applicationTips\": [\"Tip 1\", \"Tip 2\"],\n" +
                "  \"summary\": \"A brief summary of the user's current situation and best next steps.\"\n" +
                "}";

            var prompt =
                "Based on the user information below, provide personalized career recommendations and return your response as valid JSON only.\n\n" +
                jsonSchema + "\n\n" +
                "User Information:\n" +
                $"- Major: {user?.Major ?? "Not specified"}\n" +
                $"- City: {user?.City ?? "Not specified"}\n" +
                $"- Total Applications: {totalApps}\n" +
                $"- Accepted: {accepted}\n" +
                $"- Rejected: {rejected}\n" +
                $"- Companies Applied To: {string.Join(", ", companiesApplied)}\n\n" +
                "Requirements:\n" +
                "- Recommend companies that align with the user's major and career goals.\n" +
                "- Suggest the most valuable technical and soft skills to learn.\n" +
                "- Provide practical tips to improve future applications.\n" +
                "- Return only valid JSON with no markdown or additional text.";

            var contents = new List<object>
            {
                new { role = "user", parts = new[] { new { text = prompt } } }
            };

            var raw = await CallGeminiAsync(null, contents);
            return ParseJsonResponse<RecommendationsResponse>(raw) ?? new RecommendationsResponse();
        }

        // ==================== PRIVATE HELPERS ====================
        private async Task<string> CallGeminiAsync(string? systemPrompt, List<object> contents)
        {
            var requestBody = new Dictionary<string, object>
            {
                ["contents"] = contents
            };

            if (!string.IsNullOrEmpty(systemPrompt))
            {
                requestBody["systemInstruction"] = new
                {
                    parts = new[] { new { text = systemPrompt } }
                };
            }

            var json = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var url = $"v1beta/models/{_modelId}:generateContent";
            var response = await _httpClient.PostAsync(url, content);
            var responseBody = await response.Content.ReadAsStringAsync();

            using var doc = JsonDocument.Parse(responseBody);
            var root = doc.RootElement;

            // Check for API-level error first
            if (root.TryGetProperty("error", out var error))
            {
                var message = error.TryGetProperty("message", out var msg) ? msg.GetString() : "Unknown error";
                throw new InvalidOperationException($"Gemini API error: {message}");
            }

            // Safely navigate the expected structure
            if (!root.TryGetProperty("candidates", out var candidates) ||
                candidates.GetArrayLength() == 0)
                throw new InvalidOperationException($"Gemini returned no candidates. Response: {responseBody}");

            var candidate = candidates[0];

            // Handle safety blocks (finishReason: SAFETY)
            if (candidate.TryGetProperty("finishReason", out var reason) &&
                reason.GetString() == "SAFETY")
                throw new InvalidOperationException("Gemini blocked the response due to safety filters.");

            if (!candidate.TryGetProperty("content", out var contentEl) ||
                !contentEl.TryGetProperty("parts", out var parts) ||
                parts.GetArrayLength() == 0)
                throw new InvalidOperationException($"Unexpected Gemini response structure. Response: {responseBody}");

            return parts[0].TryGetProperty("text", out var text)
                ? text.GetString() ?? string.Empty
                : string.Empty;
        }

        private static T? ParseJsonResponse<T>(string raw)
        {
            try
            {
                var cleaned = raw
                    .Replace("```json", "")
                    .Replace("```", "")
                    .Trim();

                return JsonSerializer.Deserialize<T>(cleaned, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
            }
            catch
            {
                return default;
            }
        }
    }
}