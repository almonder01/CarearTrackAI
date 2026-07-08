using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.IO.Compression;
using System.Xml.Linq;
using CareerTrackAI.Data;
using CareerTrackAI.DTOs.AI;
using CareerTrackAI.DTOs.Resume;
using CareerTrackAI.Enums;
using Microsoft.EntityFrameworkCore;

namespace CareerTrackAI.Services
{
    public interface IAiService
    {
        Task<ChatResponse> ChatAsync(int userId, ChatRequest request);
        Task<AnalyzeResumeResponse> AnalyzeResumeAsync(int resumeId, int userId);
        Task<CreateAiResumeVersionResponse> CreateResumeVersionAsync(int resumeId, int userId, CreateAiResumeVersionRequest request);
        Task<GenerateCoverLetterResponse> GenerateCoverLetterAsync(int userId, GenerateCoverLetterRequest request);
        Task<RecommendationsResponse> GetRecommendationsAsync(int userId);
        Task<AiPingResponse> PingAsync(int userId);
    }

    public class AiService : IAiService
    {
        private readonly HttpClient _httpClient;
        private readonly AppDbContext _db;
        private readonly IGeminiUsageTracker _usageTracker;
        private readonly IResumeTextExtractionService _resumeTextExtractionService;
        private readonly IWebHostEnvironment _env;
        private readonly string _modelId;
        private readonly bool _isConfigured;

        public AiService(
            IHttpClientFactory factory,
            AppDbContext db,
            GeminiOptions options,
            IGeminiUsageTracker usageTracker,
            IResumeTextExtractionService resumeTextExtractionService,
            IWebHostEnvironment env)
        {
            _httpClient = factory.CreateClient("Gemini");
            _db = db;
            _usageTracker = usageTracker;
            _resumeTextExtractionService = resumeTextExtractionService;
            _env = env;
            _modelId = options.ModelId;
            _isConfigured = options.IsConfigured;
        }

        // ==================== CHAT ====================
        public async Task<ChatResponse> ChatAsync(int userId, ChatRequest request)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            var applications = await _db.Applications
                .Where(a => a.UserId == userId)
                .Include(a => a.JobOpportunity).ThenInclude(j => j.Company)
                .Include(a => a.Resume)
                .OrderByDescending(a => a.UpdatedAt ?? a.CreatedAt)
                .Take(12)
                .ToListAsync();
            var opportunities = await _db.JobOpportunities
                .Where(j => j.UserId == userId && j.IsActive)
                .Include(j => j.Company)
                .OrderByDescending(j => j.CreatedAt)
                .Take(12)
                .ToListAsync();
            var resumes = await _db.Resumes
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.CreatedAt)
                .Take(8)
                .ToListAsync();
            var interviews = await _db.Interviews
                .Where(i => i.Application.UserId == userId)
                .Include(i => i.Application).ThenInclude(a => a.JobOpportunity).ThenInclude(j => j.Company)
                .OrderBy(i => i.ScheduledAt)
                .Take(8)
                .ToListAsync();

            var appSummary = applications.Count == 0
                ? "No tracked applications yet."
                : string.Join("\n", applications.Select(a =>
                    $"- #{a.Id}: {a.JobOpportunity.Title} at {a.JobOpportunity.Company.Name}, status {a.Status}, notes: {TrimForPrompt(a.Notes, 80)}"));
            var opportunitySummary = opportunities.Count == 0
                ? "No personal opportunities yet."
                : string.Join("\n", opportunities.Select(j =>
                    $"- #{j.Id}: {j.Title} at {j.Company.Name}, source {j.SourceProvider ?? "Manual"}, location {j.Location ?? "n/a"}, deadline {j.ApplicationDeadline?.ToString("yyyy-MM-dd") ?? "n/a"}"));
            var resumeSummary = resumes.Count == 0
                ? "No CVs uploaded yet."
                : string.Join("\n", resumes.Select(r =>
                    $"- #{r.Id}: {r.Label}, type {r.FileType ?? "unknown"}, extracted text: {(string.IsNullOrWhiteSpace(r.ParsedContent) ? "no" : "yes")}"));
            var interviewSummary = interviews.Count == 0
                ? "No scheduled interviews yet."
                : string.Join("\n", interviews.Select(i =>
                    $"- #{i.Id}: {i.Title} for {i.Application.JobOpportunity.Title} at {i.Application.JobOpportunity.Company.Name}, {i.ScheduledAt:yyyy-MM-dd HH:mm}, {i.Type}, location/link: {TrimForPrompt(i.Location, 80)}"));

            var systemPrompt =
                "You are a professional AI assistant specialized in helping students and graduates find internship and employment opportunities.\n\n" +
                "Strict scope:\n" +
                "- Stay focused on CareerTrackAI, career planning, applications, resumes, interviews, job opportunities, and professional development.\n" +
                "- If the user asks for unrelated general content, politely redirect them back to the career workspace.\n" +
                "- Do not claim that you changed, created, deleted, imported, or scheduled data unless the backend endpoint actually did it.\n" +
                "- When suggesting an action inside the app, name the exact page and action.\n\n" +
                "Current user:\n" +
                $"- Name: {user?.FullName}\n" +
                $"- Major: {user?.Major ?? "Not specified"}\n" +
                $"- University: {user?.University ?? "Not specified"}\n" +
                $"- City: {user?.City ?? "Not specified"}\n" +
                $"- Career focus: {user?.CareerObjective ?? "Not specified"}\n\n" +
                "CareerTrackAI app map:\n" +
                "- Dashboard: overview charts, application progress, and quick metrics.\n" +
                "- Applications: track each application status and follow-up workflow.\n" +
                "- Opportunities: browse imported and manual job opportunities.\n" +
                "- Resumes: upload CVs, analyze them, create tailored AI DOCX versions for a target role or opportunity, download versions, and delete old CVs.\n" +
                "- Interviews: prepare and track interview events.\n" +
                "- Data Hub: import companies and opportunities from CSV, Adzuna, JobDataLake, and AI sourcing; preview rows before importing.\n" +
                "- AI Studio: chat, recommendations, and cover letter drafts.\n" +
                "- Usage: monitor Gemini, Adzuna, and JobDataLake usage.\n" +
                "- Settings: theme, layout, plan, notification, and AI/payment settings.\n\n" +
                "Current workspace snapshot:\n" +
                $"Applications:\n{appSummary}\n\n" +
                $"Opportunities:\n{opportunitySummary}\n\n" +
                $"CVs:\n{resumeSummary}\n\n" +
                $"Interviews:\n{interviewSummary}\n\n" +
                "Detailed page behavior:\n" +
                "- Data Hub is for importing, editing preview rows, saving shared companies, and sending selected rows to the user's workspace.\n" +
                "- Opportunities is for reviewing imported roles, opening posting links, verifying links, tracking applications, filtering by source, exporting CSV, and deleting opportunity rows.\n" +
                "- Applications is the Kanban board where status changes are made.\n" +
                "- Interviews is where Interview-stage applications become schedulable cards with dates, links, and prep notes.\n" +
                "- Resumes is where CVs are uploaded, analyzed, deleted, and turned into tailored AI resume versions. To create one: open Resumes, choose Create AI version, select a target opportunity or type a target role, add optional instructions, generate the version, then download the DOCX from Tailored versions.\n" +
                "- AI Studio contains this chat, recommendations, token test, and cover letter generation from a selected tracked application.\n\n" +
                "When users ask how to do something in the app, guide them to the exact page and action.\n\n" +
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

            var reply = await CallGeminiAsync(userId, "Career chat", systemPrompt, contents, () => BuildChatFallback(user, request.Message));
            return new ChatResponse { Reply = reply };
        }

        // ==================== ANALYZE RESUME ====================
        public async Task<AnalyzeResumeResponse> AnalyzeResumeAsync(int resumeId, int userId)
        {
            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
            var resume = await _db.Resumes
                .FirstOrDefaultAsync(r => r.Id == resumeId && r.UserId == userId);

            if (resume != null && string.IsNullOrWhiteSpace(resume.ParsedContent))
            {
                var filePath = ResolveResumePath(resume.FileUrl);
                resume.ParsedContent = await _resumeTextExtractionService.ExtractAsync(filePath, resume.FileType ?? "pdf");
                if (!string.IsNullOrWhiteSpace(resume.ParsedContent))
                {
                    resume.UpdatedAt = DateTime.UtcNow;
                }
            }

            if (resume != null)
            {
                resume.LastUsedAt = DateTime.UtcNow;
                resume.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }

            if (resume != null && string.IsNullOrWhiteSpace(resume.ParsedContent) && _isConfigured)
            {
                var filePath = ResolveResumePath(resume.FileUrl);
                var fileResult = await AnalyzeResumeFileWithGeminiAsync(userId, resume.FileType ?? "pdf", filePath, user);
                if (fileResult != null) return fileResult;
            }

            if (resume == null || string.IsNullOrEmpty(resume.ParsedContent))
                return new AnalyzeResumeResponse
                {
                    Strengths = new List<string> { "Resume file is uploaded and ready for tracking." },
                    Weaknesses = new List<string> { "Resume text has not been extracted yet, so live analysis cannot inspect the actual content." },
                    MissingSkills = new List<string> { "Add text extraction or paste resume content before relying on detailed skill gaps." },
                    Suggestions = new List<string> { "Upload a text-readable DOCX/PDF, then run analysis again.", "Use the CV label and target role to keep versions organized." },
                    OverallScore = 0,
                    ScoreBreakdown = BuildEmptyResumeBreakdown()
                };

            var jsonSchema =
                "{\n" +
                "  \"strengths\": [\"Strength 1\", \"Strength 2\"],\n" +
                "  \"weaknesses\": [\"Weakness 1\"],\n" +
                "  \"missingSkills\": [\"Missing Skill 1\"],\n" +
                "  \"suggestions\": [\"Suggestion 1\"],\n" +
                "  \"overallScore\": 75,\n" +
                "  \"scoreBreakdown\": {\n" +
                "    \"Role alignment\": 20,\n" +
                "    \"Skills evidence\": 18,\n" +
                "    \"Project impact\": 15,\n" +
                "    \"ATS clarity\": 15,\n" +
                "    \"Experience structure\": 12,\n" +
                "    \"Professional polish\": 10\n" +
                "  }\n" +
                "}";

            var prompt =
                "Analyze the following resume using this employer-style screening rubric and return JSON only.\n\n" +
                "Rubric, total 100 points:\n" +
                "- Role alignment, 20 points: relevance to software, internship, graduate, or stated target roles.\n" +
                "- Skills evidence, 20 points: clear technical and soft skills backed by examples.\n" +
                "- Project impact, 20 points: measurable outcomes, responsibilities, and project complexity.\n" +
                "- ATS clarity, 15 points: readable structure, keywords, section clarity, and scanability.\n" +
                "- Experience structure, 15 points: education, experience, dates, and achievements are organized.\n" +
                "- Professional polish, 10 points: concise language, grammar, consistency, and no obvious gaps.\n\n" +
                "The scoreBreakdown values must add up to overallScore and must not exceed the category maximums above.\n\n" +
                jsonSchema + "\n\n" +
                "Target profile:\n" +
                $"- Major: {user?.Major ?? "Not specified"}\n" +
                $"- Career Focus: {user?.CareerObjective ?? "Not specified"}\n\n" +
                "Resume:\n" +
                resume.ParsedContent;

            var contents = new List<object>
            {
                new { role = "user", parts = new[] { new { text = prompt } } }
            };

            var raw = await CallGeminiAsync(userId, "Resume analysis", null, contents, () => ResumeAnalysisFallbackJson(resume.ParsedContent));
            var parsed = ParseJsonResponse<AnalyzeResumeResponse>(raw);
            return IsUsefulAnalysis(parsed)
                ? parsed!
                : ParseJsonResponse<AnalyzeResumeResponse>(ResumeAnalysisFallbackJson(resume.ParsedContent))!;
        }

        // ==================== CREATE AI RESUME VERSION ====================
        public async Task<CreateAiResumeVersionResponse> CreateResumeVersionAsync(int resumeId, int userId, CreateAiResumeVersionRequest request)
        {
            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
            var resume = await _db.Resumes.FirstOrDefaultAsync(r => r.Id == resumeId && r.UserId == userId);
            if (resume == null)
            {
                return new CreateAiResumeVersionResponse { Message = "Resume not found." };
            }

            var job = request.JobOpportunityId.HasValue
                ? await _db.JobOpportunities
                    .Include(j => j.Company)
                    .FirstOrDefaultAsync(j => j.Id == request.JobOpportunityId.Value && (j.UserId == userId || j.UserId == null))
                : null;

            if (request.JobOpportunityId.HasValue && job == null)
            {
                return new CreateAiResumeVersionResponse { Message = "Selected opportunity is not available in your workspace." };
            }

            var targetCompany = job?.Company;
            if (targetCompany == null && request.TargetCompanyId.HasValue)
            {
                targetCompany = await _db.Companies
                    .FirstOrDefaultAsync(c => c.Id == request.TargetCompanyId.Value && (c.UserId == userId || c.UserId == null));
            }

            if (request.TargetCompanyId.HasValue && targetCompany == null)
            {
                return new CreateAiResumeVersionResponse { Message = "Selected company is not available in your workspace." };
            }

            if (string.IsNullOrWhiteSpace(resume.ParsedContent))
            {
                var filePath = ResolveResumePath(resume.FileUrl);
                resume.ParsedContent = await _resumeTextExtractionService.ExtractAsync(filePath, resume.FileType ?? "pdf");
                if (!string.IsNullOrWhiteSpace(resume.ParsedContent))
                {
                    resume.UpdatedAt = DateTime.UtcNow;
                    await _db.SaveChangesAsync();
                }
            }

            var targetRole = FirstNonEmpty(request.TargetRole, job?.Title, user?.CareerObjective, "Target role")!;
            var targetCompanyName = FirstNonEmpty(targetCompany?.Name, "General target")!;
            var versionName = FirstNonEmpty(request.VersionName, $"{targetRole} - {targetCompanyName}")!;
            versionName = versionName.Length > 200 ? versionName[..200] : versionName;
            var resumeAnalysis = string.IsNullOrWhiteSpace(resume.ParsedContent)
                ? null
                : BuildLocalResumeAnalysis(resume.ParsedContent);

            var tailoredText = string.IsNullOrWhiteSpace(resume.ParsedContent)
                ? await GenerateTailoredResumeFromFileAsync(userId, resume, user, job, targetCompany, targetRole, request.AdditionalInstructions, resumeAnalysis)
                : await GenerateTailoredResumeFromTextAsync(userId, resume.ParsedContent, user, job, targetCompany, targetRole, request.AdditionalInstructions, resumeAnalysis);

            if (string.IsNullOrWhiteSpace(tailoredText))
            {
                return new CreateAiResumeVersionResponse
                {
                    Message = "CareerTrackAI could not read enough resume content to create a tailored version. Upload a text-readable PDF/DOCX or try another file."
                };
            }

            tailoredText = CleanGeneratedDocumentText(tailoredText);
            var fileUrl = await SaveTailoredResumeDocxAsync(userId, versionName, tailoredText);
            var version = new Models.ResumeVersion
            {
                ResumeId = resume.Id,
                VersionName = versionName,
                FileUrl = fileUrl,
                FileType = "docx",
                TargetCompanyId = targetCompany?.Id,
                IsAiGenerated = true
            };

            _db.ResumeVersions.Add(version);
            resume.LastUsedAt = DateTime.UtcNow;
            resume.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            await _db.Entry(version).Reference(v => v.TargetCompany).LoadAsync();

            return new CreateAiResumeVersionResponse
            {
                Version = MapResumeVersion(version),
                Message = _isConfigured
                    ? "AI resume version created. Review it before submitting to an employer."
                    : "Resume version created using local fallback guidance because Gemini is not configured.",
                Preview = BuildTextPreview(tailoredText)
            };
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
                $"- Career Focus: {user?.CareerObjective ?? "Not specified"}\n" +
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

            var raw = await CallGeminiAsync(userId, "Cover letter", null, contents, () => CoverLetterFallbackJson(user, job));
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
                $"- Career Focus: {user?.CareerObjective ?? "Not specified"}\n" +
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

            var raw = await CallGeminiAsync(userId, "Recommendations", null, contents, () => RecommendationsFallbackJson(user, totalApps, accepted, rejected));
            return ParseJsonResponse<RecommendationsResponse>(raw) ?? new RecommendationsResponse();
        }

        public async Task<AiPingResponse> PingAsync(int userId)
        {
            if (!_isConfigured)
            {
                return new AiPingResponse
                {
                    Success = false,
                    Model = _modelId,
                    Mode = "local-fallback",
                    Message = "Gemini API key is not configured."
                };
            }

            var body = JsonSerializer.Serialize(new
            {
                contents = new[]
                {
                    new
                    {
                        role = "user",
                        parts = new[] { new { text = "Reply with exactly: OK" } }
                    }
                }
            });

            try
            {
                using var response = await _httpClient.PostAsync(
                    $"v1beta/models/{_modelId}:generateContent",
                    new StringContent(body, Encoding.UTF8, "application/json"));
                var responseBody = await response.Content.ReadAsStringAsync();
                if (!response.IsSuccessStatusCode)
                {
                    return new AiPingResponse
                    {
                        Success = false,
                        Model = _modelId,
                        Mode = "error",
                        Message = FriendlyGeminiPingError((int)response.StatusCode, responseBody),
                        Reply = responseBody[..Math.Min(220, responseBody.Length)]
                    };
                }

                using var doc = JsonDocument.Parse(responseBody);
                var text = ExtractGeminiText(doc.RootElement);
                RecordGeminiUsage(userId, "Provider ping", doc.RootElement);

                return new AiPingResponse
                {
                    Success = !string.IsNullOrWhiteSpace(text),
                    Model = _modelId,
                    Mode = "live",
                    Message = string.IsNullOrWhiteSpace(text) ? "Gemini responded without text." : "Gemini responded successfully.",
                    Reply = text
                };
            }
            catch (Exception ex)
            {
                return new AiPingResponse
                {
                    Success = false,
                    Model = _modelId,
                    Mode = "error",
                    Message = FriendlyGeminiException(ex.Message),
                    Reply = ex.Message
                };
            }
        }

        private static string FriendlyGeminiPingError(int statusCode, string responseBody)
        {
            var raw = responseBody.ToLowerInvariant();
            if (statusCode == 429 || raw.Contains("quota") || raw.Contains("resource_exhausted") || raw.Contains("rate limit"))
                return "Gemini is connected, but the API quota or daily limit has been reached. Try again later or switch to another API key.";

            if (statusCode == 400 && raw.Contains("api key"))
                return "Gemini rejected the API key. Check that the key is correct and enabled for Google AI Studio.";

            if (statusCode is 401 or 403 || raw.Contains("permission") || raw.Contains("unauthorized"))
                return "Gemini rejected this request. Check the API key permissions and model access.";

            if (statusCode == 404 || raw.Contains("not found"))
                return "The configured Gemini model was not found. Check the model name in backend settings.";

            if (statusCode >= 500)
                return "Gemini is currently returning a server error. Try again shortly.";

            return "Gemini did not accept the test request. Check the API key and backend AI settings.";
        }

        private static string FriendlyGeminiException(string message)
        {
            var raw = message.ToLowerInvariant();
            if (raw.Contains("socket") || raw.Contains("network") || raw.Contains("dns") || raw.Contains("timed out") || raw.Contains("timeout"))
                return "The backend could not reach Gemini right now. Check the internet connection and try again.";

            return "The Gemini token test could not be completed. Check the backend logs for technical details.";
        }

        // ==================== PRIVATE HELPERS ====================
        private async Task<string> CallGeminiAsync(
            int userId,
            string feature,
            string? systemPrompt,
            List<object> contents,
            Func<string> fallback)
        {
            if (!_isConfigured)
                return fallback();

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
            string responseBody;
            try
            {
                var response = await _httpClient.PostAsync(url, content);
                responseBody = await response.Content.ReadAsStringAsync();
            }
            catch
            {
                return fallback();
            }

            using var doc = JsonDocument.Parse(responseBody);
            var root = doc.RootElement;

            // Check for API-level error first
            if (root.TryGetProperty("error", out var error))
            {
                var message = error.TryGetProperty("message", out var msg) ? msg.GetString() : "Unknown error";
                return fallback();
            }

            // Safely navigate the expected structure
            if (!root.TryGetProperty("candidates", out var candidates) ||
                candidates.GetArrayLength() == 0)
                return fallback();

            var candidate = candidates[0];

            // Handle safety blocks (finishReason: SAFETY)
            if (candidate.TryGetProperty("finishReason", out var reason) &&
                reason.GetString() == "SAFETY")
                return fallback();

            if (!candidate.TryGetProperty("content", out var contentEl) ||
                !contentEl.TryGetProperty("parts", out var parts) ||
                parts.GetArrayLength() == 0)
                return fallback();

            RecordGeminiUsage(userId, feature, root);

            return ExtractGeminiText(root);
        }

        private async Task<AnalyzeResumeResponse?> AnalyzeResumeFileWithGeminiAsync(int userId, string fileType, string filePath, Models.User? user)
        {
            if (!File.Exists(filePath)) return null;

            var normalized = fileType.Trim().ToLowerInvariant();
            var mimeType = normalized == "pdf"
                ? "application/pdf"
                : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

            var bytes = await File.ReadAllBytesAsync(filePath);
            if (bytes.Length == 0 || bytes.Length > 18 * 1024 * 1024) return null;

            var jsonSchema =
                "{\n" +
                "  \"strengths\": [\"Strength 1\", \"Strength 2\"],\n" +
                "  \"weaknesses\": [\"Weakness 1\"],\n" +
                "  \"missingSkills\": [\"Missing Skill 1\"],\n" +
                "  \"suggestions\": [\"Suggestion 1\"],\n" +
                "  \"overallScore\": 75,\n" +
                "  \"scoreBreakdown\": {\n" +
                "    \"Role alignment\": 20,\n" +
                "    \"Skills evidence\": 18,\n" +
                "    \"Project impact\": 15,\n" +
                "    \"ATS clarity\": 15,\n" +
                "    \"Experience structure\": 12,\n" +
                "    \"Professional polish\": 10\n" +
                "  }\n" +
                "}";

            var requestBody = new Dictionary<string, object>
            {
                ["contents"] = new object[]
                {
                    new Dictionary<string, object>
                    {
                        ["role"] = "user",
                        ["parts"] = new object[]
                        {
                            new Dictionary<string, object>
                            {
                                ["text"] =
                                    "Analyze this resume file using an employer-style screening rubric and return valid JSON only using this shape:\n\n" +
                                    "Rubric: Role alignment 20, Skills evidence 20, Project impact 20, ATS clarity 15, Experience structure 15, Professional polish 10. " +
                                    "The scoreBreakdown values must add up to overallScore.\n\n" +
                                    $"Target profile: Major {user?.Major ?? "Not specified"}; Career focus {user?.CareerObjective ?? "Not specified"}.\n\n" +
                                    jsonSchema
                            },
                            new Dictionary<string, object>
                            {
                                ["inline_data"] = new Dictionary<string, object>
                                {
                                    ["mime_type"] = mimeType,
                                    ["data"] = Convert.ToBase64String(bytes)
                                }
                            }
                        }
                    }
                }
            };

            try
            {
                using var response = await _httpClient.PostAsync(
                    $"v1beta/models/{_modelId}:generateContent",
                    new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json"));

                var responseBody = await response.Content.ReadAsStringAsync();
                if (!response.IsSuccessStatusCode) return null;

                using var doc = JsonDocument.Parse(responseBody);
                RecordGeminiUsage(userId, "Resume file analysis", doc.RootElement);
                var raw = ExtractGeminiText(doc.RootElement);
                var parsed = ParseJsonResponse<AnalyzeResumeResponse>(raw);
                return IsUsefulAnalysis(parsed) ? parsed : null;
            }
            catch
            {
                return null;
            }
        }

        private static string ExtractGeminiText(JsonElement root)
        {
            if (!root.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
                return string.Empty;

            var candidate = candidates[0];
            if (!candidate.TryGetProperty("content", out var contentEl) ||
                !contentEl.TryGetProperty("parts", out var parts) ||
                parts.GetArrayLength() == 0)
                return string.Empty;

            return parts[0].TryGetProperty("text", out var text)
                ? text.GetString() ?? string.Empty
                : string.Empty;
        }

        private void RecordGeminiUsage(int userId, string feature, JsonElement root)
        {
            if (!root.TryGetProperty("usageMetadata", out var usage))
                return;

            var promptTokens = GetIntProperty(usage, "promptTokenCount");
            var outputTokens = GetIntProperty(usage, "candidatesTokenCount");
            var totalTokens = GetIntProperty(usage, "totalTokenCount");

            if (totalTokens == 0)
                totalTokens = promptTokens + outputTokens;

            _usageTracker.Record(userId, feature, promptTokens, outputTokens, totalTokens, _modelId);
        }

        private async Task<string?> GenerateTailoredResumeFromTextAsync(
            int userId,
            string resumeText,
            Models.User? user,
            Models.JobOpportunity? job,
            Models.Company? targetCompany,
            string targetRole,
            string? additionalInstructions,
            AnalyzeResumeResponse? resumeAnalysis)
        {
            var prompt = BuildResumeVersionPrompt(resumeText, user, job, targetCompany, targetRole, additionalInstructions, resumeAnalysis, hasAttachedFile: false);
            var contents = new List<object>
            {
                new { role = "user", parts = new[] { new { text = prompt } } }
            };

            return await CallGeminiAsync(
                userId,
                "Resume version generation",
                null,
                contents,
                () => BuildLocalTailoredResume(resumeText, user, job, targetCompany, targetRole, additionalInstructions, resumeAnalysis));
        }

        private async Task<string?> GenerateTailoredResumeFromFileAsync(
            int userId,
            Models.Resume resume,
            Models.User? user,
            Models.JobOpportunity? job,
            Models.Company? targetCompany,
            string targetRole,
            string? additionalInstructions,
            AnalyzeResumeResponse? resumeAnalysis)
        {
            if (!_isConfigured) return null;

            var filePath = ResolveResumePath(resume.FileUrl);
            if (!File.Exists(filePath)) return null;

            var bytes = await File.ReadAllBytesAsync(filePath);
            if (bytes.Length == 0 || bytes.Length > 18 * 1024 * 1024) return null;

            var normalized = (resume.FileType ?? "pdf").Trim().ToLowerInvariant();
            var mimeType = normalized == "pdf"
                ? "application/pdf"
                : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

            var prompt = BuildResumeVersionPrompt(null, user, job, targetCompany, targetRole, additionalInstructions, resumeAnalysis, hasAttachedFile: true);
            var requestBody = new Dictionary<string, object>
            {
                ["contents"] = new object[]
                {
                    new Dictionary<string, object>
                    {
                        ["role"] = "user",
                        ["parts"] = new object[]
                        {
                            new Dictionary<string, object> { ["text"] = prompt },
                            new Dictionary<string, object>
                            {
                                ["inline_data"] = new Dictionary<string, object>
                                {
                                    ["mime_type"] = mimeType,
                                    ["data"] = Convert.ToBase64String(bytes)
                                }
                            }
                        }
                    }
                }
            };

            try
            {
                using var response = await _httpClient.PostAsync(
                    $"v1beta/models/{_modelId}:generateContent",
                    new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json"));

                var responseBody = await response.Content.ReadAsStringAsync();
                if (!response.IsSuccessStatusCode) return null;

                using var doc = JsonDocument.Parse(responseBody);
                RecordGeminiUsage(userId, "Resume file version generation", doc.RootElement);
                return ExtractGeminiText(doc.RootElement);
            }
            catch
            {
                return null;
            }
        }

        private static string BuildResumeVersionPrompt(
            string? resumeText,
            Models.User? user,
            Models.JobOpportunity? job,
            Models.Company? targetCompany,
            string targetRole,
            string? additionalInstructions,
            AnalyzeResumeResponse? resumeAnalysis,
            bool hasAttachedFile)
        {
            var companyName = targetCompany?.Name ?? job?.Company.Name ?? "the target company";
            var jobContext = job == null
                ? "No specific opportunity was selected."
                : "Selected opportunity:\n" +
                  $"- Title: {job.Title}\n" +
                  $"- Company: {job.Company.Name}\n" +
                  $"- Type: {job.Type}\n" +
                  $"- Employment: {job.EmploymentType?.ToString() ?? "Not specified"}\n" +
                  $"- Location: {job.Location ?? job.Company.City ?? "Not specified"}\n" +
                  $"- Required skills: {job.RequiredSkills ?? "Not specified"}\n" +
                  $"- Description: {TrimForPrompt(job.Description, 1200)}\n";

            var sourceResume = hasAttachedFile
                ? "Use the attached resume file as the only source of candidate facts."
                : $"Original resume text:\n{TrimForPrompt(resumeText, 14000)}";
            var analysisGuidance = BuildResumeAnalysisGuidance(resumeAnalysis);

            return
                "Create a tailored resume version for a student or fresh graduate. Return only the final resume text, with no markdown fences and no explanation.\n\n" +
                "Employer-style resume standard:\n" +
                "- Optimize for role alignment (20), skills evidence (20), project impact (20), ATS clarity (15), experience structure (15), and professional polish (10).\n" +
                "- Use recruiter-friendly section headings and concise bullet points.\n" +
                "- Prefer a one-page structure for students/new graduates unless the original resume clearly supports more.\n" +
                "- Put the most relevant skills and projects near the top after the summary.\n" +
                "- Every bullet should start with a strong action verb when possible and should keep the original facts truthful.\n\n" +
                "Critical rules:\n" +
                "- Do not use Markdown formatting symbols such as **, __, ###, or code fences in the final resume.\n" +
                "- Do not invent employers, degrees, dates, certifications, GPA, awards, links, projects, technologies, or metrics that are not present in the original resume.\n" +
                "- You may rewrite, reorder, summarize, and emphasize existing facts to fit the target role, but do not add unsupported achievements.\n" +
                "- Use the resume analysis below to improve weak areas only when the original facts support the improvement.\n" +
                "- Keep the resume ATS-friendly with clear sections such as Summary, Skills, Projects, Education, Experience, and Links when those facts exist.\n" +
                "- If a section has no supporting facts, omit it instead of fabricating details.\n" +
                "- Use concise professional English.\n\n" +
                "Candidate profile:\n" +
                $"- Name: {user?.FullName ?? "Not specified"}\n" +
                $"- Major: {user?.Major ?? "Not specified"}\n" +
                $"- University: {user?.University ?? "Not specified"}\n" +
                $"- City: {user?.City ?? "Not specified"}\n" +
                $"- Career focus: {user?.CareerObjective ?? "Not specified"}\n\n" +
                "Target:\n" +
                $"- Role: {targetRole}\n" +
                $"- Company: {companyName}\n\n" +
                jobContext + "\n" +
                analysisGuidance +
                (string.IsNullOrWhiteSpace(additionalInstructions) ? "" : $"Additional user instructions: {additionalInstructions}\n\n") +
                sourceResume;
        }

        private static string BuildResumeAnalysisGuidance(AnalyzeResumeResponse? resumeAnalysis)
        {
            if (resumeAnalysis == null)
            {
                return
                    "Resume analysis guidance:\n" +
                    "- No extracted-text analysis is available. Still follow the employer-style rubric and use only facts from the resume source.\n\n";
            }

            var breakdown = resumeAnalysis.ScoreBreakdown.Count == 0
                ? "No detailed score breakdown available."
                : string.Join("; ", resumeAnalysis.ScoreBreakdown.Select(item => $"{item.Key}: {item.Value}"));

            return
                "Resume analysis guidance:\n" +
                $"- Current screening score: {resumeAnalysis.OverallScore}/100.\n" +
                $"- Score breakdown: {breakdown}.\n" +
                $"- Strengths to preserve: {JoinPromptList(resumeAnalysis.Strengths)}\n" +
                $"- Weaknesses to improve truthfully: {JoinPromptList(resumeAnalysis.Weaknesses)}\n" +
                $"- Missing skills or signals to address only if supported by the original resume: {JoinPromptList(resumeAnalysis.MissingSkills)}\n" +
                $"- Suggestions to apply: {JoinPromptList(resumeAnalysis.Suggestions)}\n\n";
        }

        private static string BuildLocalTailoredResume(
            string? resumeText,
            Models.User? user,
            Models.JobOpportunity? job,
            Models.Company? targetCompany,
            string targetRole,
            string? additionalInstructions,
            AnalyzeResumeResponse? resumeAnalysis)
        {
            var companyName = targetCompany?.Name ?? job?.Company.Name ?? "Target Company";
            var original = string.IsNullOrWhiteSpace(resumeText)
                ? "Original resume text was not readable."
                : TrimForPrompt(resumeText, 6000);
            var analysisGuidance = BuildResumeAnalysisGuidance(resumeAnalysis);

            return
                $"{user?.FullName ?? "Candidate"}\n\n" +
                $"TARGETED RESUME VERSION: {targetRole} at {companyName}\n\n" +
                "SUMMARY\n" +
                $"- Student or fresh graduate focused on {user?.CareerObjective ?? user?.Major ?? targetRole}. This version should be reviewed manually before submission.\n\n" +
                "ATS AND SCREENING STANDARD\n" +
                "- Prioritize role alignment, skills evidence, project impact, ATS clarity, experience structure, and professional polish.\n" +
                "- Reorder and rewrite only the facts already present in the original resume.\n\n" +
                "TARGET ALIGNMENT NOTES\n" +
                $"- Target role: {targetRole}\n" +
                $"- Target company: {companyName}\n" +
                (job?.RequiredSkills == null ? "" : $"- Skills to emphasize from the job post: {job.RequiredSkills}\n") +
                (string.IsNullOrWhiteSpace(additionalInstructions) ? "" : $"- User instructions: {additionalInstructions}\n") +
                "\n" +
                analysisGuidance +
                "\nORIGINAL RESUME CONTENT TO REWORK\n" +
                original;
        }

        private async Task<string> SaveTailoredResumeDocxAsync(int userId, string versionName, string content)
        {
            var webRoot = Path.GetFullPath(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"));
            var folder = Path.Combine(webRoot, "uploads", "resumes", userId.ToString(), "versions");
            Directory.CreateDirectory(folder);

            var fileName = $"{Guid.NewGuid()}.docx";
            var filePath = Path.Combine(folder, fileName);
            await Task.Run(() => WriteSimpleDocx(filePath, versionName, content));
            return $"/uploads/resumes/{userId}/versions/{fileName}";
        }

        private static void WriteSimpleDocx(string filePath, string title, string content)
        {
            if (File.Exists(filePath)) File.Delete(filePath);
            using var archive = ZipFile.Open(filePath, ZipArchiveMode.Create);
            AddTextEntry(
                archive,
                "[Content_Types].xml",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
                "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">" +
                "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>" +
                "<Default Extension=\"xml\" ContentType=\"application/xml\"/>" +
                "<Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/>" +
                "</Types>");
            AddTextEntry(
                archive,
                "_rels/.rels",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
                "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
                "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/>" +
                "</Relationships>");

            XNamespace w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
            var paragraphs = new List<XElement>
            {
                BuildDocxParagraph(w, title, bold: true, centered: true, fontSizeHalfPoints: 32, spacingAfter: 180)
            };
            foreach (var rawLine in content.Replace("\r\n", "\n").Split('\n'))
            {
                var line = rawLine.Trim();
                if (string.IsNullOrWhiteSpace(line))
                {
                    paragraphs.Add(BuildDocxParagraph(w, string.Empty, spacingAfter: 80));
                    continue;
                }

                var normalizedLine = NormalizeResumeDocumentLine(line);
                var isBullet = IsResumeBulletLine(line);
                var isHeading = !isBullet && IsResumeSectionHeading(normalizedLine);
                paragraphs.Add(BuildDocxParagraph(
                    w,
                    normalizedLine,
                    bold: isHeading,
                    bullet: isBullet,
                    fontSizeHalfPoints: isHeading ? 24 : 22,
                    spacingBefore: isHeading ? 160 : 0,
                    spacingAfter: isHeading ? 70 : 45));
            }

            var document = new XDocument(
                new XElement(w + "document",
                    new XAttribute(XNamespace.Xmlns + "w", w),
                    new XElement(w + "body",
                        paragraphs,
                        new XElement(w + "sectPr",
                            new XElement(w + "pgSz", new XAttribute(w + "w", "12240"), new XAttribute(w + "h", "15840")),
                            new XElement(w + "pgMar",
                                new XAttribute(w + "top", "1080"),
                                new XAttribute(w + "right", "1080"),
                                new XAttribute(w + "bottom", "1080"),
                                new XAttribute(w + "left", "1080"))))));

            AddTextEntry(archive, "word/document.xml", document.ToString(SaveOptions.DisableFormatting));
        }

        private static XElement BuildDocxParagraph(
            XNamespace w,
            string text,
            bool bold = false,
            bool centered = false,
            bool bullet = false,
            int fontSizeHalfPoints = 22,
            int spacingBefore = 0,
            int spacingAfter = 60)
        {
            return new XElement(w + "p",
                new XElement(w + "pPr",
                    centered ? new XElement(w + "jc", new XAttribute(w + "val", "center")) : null,
                    bullet ? new XElement(w + "ind", new XAttribute(w + "left", "360"), new XAttribute(w + "hanging", "180")) : null,
                    new XElement(w + "spacing",
                        new XAttribute(w + "before", spacingBefore.ToString()),
                        new XAttribute(w + "after", spacingAfter.ToString()))),
                new XElement(w + "r",
                    new XElement(w + "rPr",
                        new XElement(w + "rFonts",
                            new XAttribute(w + "ascii", "Calibri"),
                            new XAttribute(w + "hAnsi", "Calibri"),
                            new XAttribute(w + "cs", "Calibri")),
                        bold ? new XElement(w + "b") : null,
                        new XElement(w + "sz", new XAttribute(w + "val", fontSizeHalfPoints.ToString())),
                        new XElement(w + "szCs", new XAttribute(w + "val", fontSizeHalfPoints.ToString()))),
                    new XElement(w + "t", new XAttribute(XNamespace.Xml + "space", "preserve"), text)));
        }

        private static bool IsResumeBulletLine(string line)
        {
            var trimmed = line.TrimStart();
            return trimmed.StartsWith("- ") || trimmed.StartsWith("* ") || trimmed.StartsWith("• ");
        }

        private static string NormalizeResumeDocumentLine(string line)
        {
            var trimmed = line.Trim();
            if (trimmed.StartsWith("- ") || trimmed.StartsWith("* "))
                return "• " + StripMarkdownDecorations(trimmed[2..].Trim());

            if (trimmed.StartsWith("• "))
                return "• " + StripMarkdownDecorations(trimmed[2..].Trim());

            return StripMarkdownDecorations(trimmed.TrimEnd());
        }

        private static bool IsResumeSectionHeading(string line)
        {
            var normalized = Regex.Replace(line.Trim().TrimEnd(':'), @"\s+", " ");
            if (normalized.Length is < 3 or > 56) return false;

            var upper = normalized.ToUpperInvariant();
            var knownHeadings = new HashSet<string>
            {
                "SUMMARY",
                "PROFESSIONAL SUMMARY",
                "PROFILE",
                "SKILLS",
                "TECHNICAL SKILLS",
                "PROJECTS",
                "EXPERIENCE",
                "WORK EXPERIENCE",
                "EDUCATION",
                "CERTIFICATIONS",
                "ACHIEVEMENTS",
                "LINKS",
                "CONTACT",
                "TARGET ALIGNMENT NOTES",
                "ATS AND SCREENING STANDARD",
                "ORIGINAL RESUME CONTENT TO REWORK"
            };

            return knownHeadings.Contains(upper) ||
                   (normalized == upper && Regex.IsMatch(upper, @"^[A-Z0-9 &/+\-.]+$"));
        }

        private static void AddTextEntry(ZipArchive archive, string name, string content)
        {
            var entry = archive.CreateEntry(name);
            using var stream = entry.Open();
            using var writer = new StreamWriter(stream, Encoding.UTF8);
            writer.Write(content);
        }

        private static string CleanGeneratedDocumentText(string value)
        {
            var cleaned = value
                .Replace("```text", "", StringComparison.OrdinalIgnoreCase)
                .Replace("```markdown", "", StringComparison.OrdinalIgnoreCase)
                .Replace("```", "", StringComparison.OrdinalIgnoreCase)
                .Trim();

            var lines = cleaned
                .Replace("\r\n", "\n")
                .Split('\n')
                .Select(line => StripMarkdownDecorations(line))
                .ToList();

            return string.Join("\n", lines).Trim();
        }

        private static string StripMarkdownDecorations(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;

            var text = value.Trim();
            text = Regex.Replace(text, @"^\s{0,3}#{1,6}\s*", "");
            text = Regex.Replace(text, @"^\s*>\s*", "");
            text = Regex.Replace(text, @"\*\*(.*?)\*\*", "$1");
            text = Regex.Replace(text, @"__(.*?)__", "$1");
            text = Regex.Replace(text, @"(?<!\*)\*(?!\s)(.*?)(?<!\s)\*(?!\*)", "$1");
            text = Regex.Replace(text, @"_(?!\s)(.*?)(?<!\s)_", "$1");
            text = Regex.Replace(text, @"`([^`]*)`", "$1");
            return text.Trim();
        }

        private static string BuildTextPreview(string value)
        {
            var clean = Regex.Replace(value, @"\s+", " ").Trim();
            return clean.Length <= 700 ? clean : clean[..700] + "...";
        }

        private static string? FirstNonEmpty(params string?[] values) =>
            values.Select(value => value?.Trim()).FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));

        private static ResumeVersionResponse MapResumeVersion(Models.ResumeVersion version) => new()
        {
            Id = version.Id,
            VersionName = version.VersionName,
            FileUrl = version.FileUrl,
            FileType = version.FileType,
            IsAiGenerated = version.IsAiGenerated,
            TargetCompanyId = version.TargetCompanyId,
            TargetCompanyName = version.TargetCompany?.Name,
            CreatedAt = version.CreatedAt
        };

        private string ResolveResumePath(string fileUrl)
        {
            var relative = fileUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
            return Path.Combine(_env.WebRootPath ?? "wwwroot", relative.StartsWith("uploads", StringComparison.OrdinalIgnoreCase) ? relative : fileUrl);
        }

        private static int GetIntProperty(JsonElement element, string propertyName)
        {
            return element.TryGetProperty(propertyName, out var value) && value.TryGetInt32(out var number)
                ? number
                : 0;
        }

        private static string BuildChatFallback(Models.User? user, string message)
        {
            var major = string.IsNullOrWhiteSpace(user?.Major) ? "your target field" : user!.Major;
            return
                "Live AI is unavailable for this request, so this is a local guidance response. " +
                $"For {major}, focus this week on three actions: tailor one resume version for your top company, " +
                "move every active opportunity into the application pipeline, and prepare one measurable project story for interviews. " +
                $"Your question was: \"{message}\".";
        }

        private static string TrimForPrompt(string? value, int maxLength)
        {
            if (string.IsNullOrWhiteSpace(value)) return "none";
            var text = value.Replace("\r", " ").Replace("\n", " ").Trim();
            return text.Length <= maxLength ? text : text[..maxLength] + "...";
        }

        private static string JoinPromptList(IEnumerable<string>? values)
        {
            var items = values?
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => TrimForPrompt(value, 180))
                .Take(5)
                .ToList() ?? new List<string>();

            return items.Count == 0 ? "None available." : string.Join("; ", items) + ".";
        }

        private static string ResumeAnalysisFallbackJson(string? resumeText = null)
        {
            var local = BuildLocalResumeAnalysis(resumeText);
            return JsonSerializer.Serialize(local);
        }

        private static AnalyzeResumeResponse BuildLocalResumeAnalysis(string? resumeText)
        {
            var text = (resumeText ?? string.Empty).ToLowerInvariant();
            var hasText = text.Length > 80;
            var techMatches = CountMatches(text, "react", "javascript", "typescript", "c#", ".net", "asp.net", "sql", "python", "java", "api", "git", "cloud", "ai", "machine learning");
            var sectionMatches = CountMatches(text, "education", "experience", "projects", "skills", "certifications", "summary");
            var hasMetrics = Regex.IsMatch(text, @"\b\d+(\.\d+)?\s*(%|percent|users|projects|apis|requests|seconds|ms|hours|days)\b");
            var hasDates = Regex.IsMatch(text, @"\b(20\d{2}|19\d{2})\b");
            var hasLinks = text.Contains("github") || text.Contains("linkedin") || text.Contains("portfolio") || text.Contains("http");
            var hasProjects = text.Contains("project") || text.Contains("capstone") || text.Contains("built") || text.Contains("developed");
            var hasRoleSignals = CountMatches(text, "software", "developer", "engineer", "frontend", "backend", "full stack", "intern", "web");

            var breakdown = new Dictionary<string, int>
            {
                ["Role alignment"] = Clamp((hasRoleSignals * 4) + (hasText ? 4 : 0), 0, 20),
                ["Skills evidence"] = Clamp((techMatches * 2) + (hasProjects ? 4 : 0), 0, 20),
                ["Project impact"] = Clamp((hasProjects ? 8 : 0) + (hasMetrics ? 8 : 0) + (text.Contains("improved") || text.Contains("reduced") || text.Contains("optimized") ? 4 : 0), 0, 20),
                ["ATS clarity"] = Clamp((sectionMatches * 3) + (hasLinks ? 3 : 0), 0, 15),
                ["Experience structure"] = Clamp((hasDates ? 5 : 0) + (text.Contains("university") || text.Contains("degree") || text.Contains("diploma") ? 5 : 0) + (text.Contains("experience") ? 5 : 0), 0, 15),
                ["Professional polish"] = Clamp((hasText ? 4 : 0) + (text.Length is > 800 and < 7000 ? 3 : 0) + (hasLinks ? 3 : 0), 0, 10)
            };

            var score = breakdown.Values.Sum();
            return new AnalyzeResumeResponse
            {
                Strengths = new()
                {
                    hasProjects ? "Projects are visible and can support role fit." : "The resume has a readable structure for initial screening.",
                    techMatches >= 4 ? "Technical keywords are present for ATS matching." : "The resume can be adapted toward the target role.",
                    hasLinks ? "Portfolio or profile links help recruiters verify work." : "The resume is ready for basic tracking and improvement."
                },
                Weaknesses = new()
                {
                    hasMetrics ? "Some impact is present, but each major project should still show clearer outcomes." : "Project impact needs measurable outcomes.",
                    sectionMatches >= 4 ? "Sections are present, but ordering and relevance should be checked against each job." : "Standard sections such as Skills, Projects, and Experience should be clearer."
                },
                MissingSkills = techMatches >= 6
                    ? new() { "Role-specific keywords from the exact job description", "Interview-ready achievement stories" }
                    : new() { "More role-specific technical keywords", "Measurable project outcomes", "Links to GitHub, LinkedIn, or portfolio work" },
                Suggestions = new()
                {
                    "Tailor the top skills and first project to the target role.",
                    "Add numbers to show scope, users, performance, or results.",
                    "Keep section headings ATS-friendly: Skills, Projects, Education, Experience."
                },
                OverallScore = score,
                ScoreBreakdown = breakdown
            };
        }

        private static int CountMatches(string text, params string[] needles) =>
            needles.Count(needle => text.Contains(needle, StringComparison.OrdinalIgnoreCase));

        private static int Clamp(int value, int min, int max) => Math.Min(max, Math.Max(min, value));

        private static Dictionary<string, int> BuildEmptyResumeBreakdown() => new()
        {
            ["Role alignment"] = 0,
            ["Skills evidence"] = 0,
            ["Project impact"] = 0,
            ["ATS clarity"] = 0,
            ["Experience structure"] = 0,
            ["Professional polish"] = 0
        };

        private static bool IsUsefulAnalysis(AnalyzeResumeResponse? response) =>
            response != null &&
            (response.Strengths.Count > 0 ||
             response.Weaknesses.Count > 0 ||
             response.MissingSkills.Count > 0 ||
             response.Suggestions.Count > 0 ||
             response.OverallScore > 0);

        private static string CoverLetterFallbackJson(Models.User? user, Models.JobOpportunity job) =>
            JsonSerializer.Serialize(new GenerateCoverLetterResponse
            {
                Subject = $"Application for {job.Title}",
                CoverLetter =
                    $"Dear {job.Company.Name} Hiring Team,\n\n" +
                    $"I am excited to apply for the {job.Title} opportunity. My background in {user?.Major ?? "my field"} and my project experience make me motivated to contribute, learn quickly, and support your team with reliable execution.\n\n" +
                    "Best regards,\n" +
                    $"{user?.FullName ?? "Applicant"}"
            });

        private static string RecommendationsFallbackJson(Models.User? user, int totalApps, int accepted, int rejected) =>
            JsonSerializer.Serialize(new RecommendationsResponse
            {
                Summary = "Live AI is unavailable for this request, so these recommendations are generated locally from your profile and application counts.",
                CompaniesToFollow = new(),
                SkillsToLearn = new() { "Resume tailoring", "Interview storytelling", user?.Major == "Software Engineering" ? "React testing" : "Role-specific portfolio work" },
                ApplicationTips = new()
                {
                    $"You currently have {totalApps} tracked applications, {accepted} accepted, and {rejected} rejected.",
                    "Follow up 5 business days after applying.",
                    "Use one tailored resume per high-priority company."
                }
            });

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
