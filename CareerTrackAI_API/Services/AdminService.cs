using System.Text;
using System.Text.Json;
using CareerTrackAI.Data;
using CareerTrackAI.DTOs.Admin;
using CareerTrackAI.DTOs.Company;
using CareerTrackAI.DTOs.JobOpportunity;
using CareerTrackAI.Enums;
using CareerTrackAI.Models;
using Microsoft.EntityFrameworkCore;

namespace CareerTrackAI.Services
{
    public interface IAdminService
    {
        Task<List<AdminUserResponse>> GetUsersAsync(string? search);
        Task<AdminUserResponse?> CreateAdminAsync(CreateAdminRequest request);
        Task<AdminUserResponse?> MakeAdminAsync(int userId);
        Task<(bool Success, string Message)> RemoveAdminAsync(int userId);
        Task<(bool Success, string Message)> DeleteUserAsync(int userId, int currentUserId);
        Task<AdminDatabaseResponse> GetSharedDatabaseAsync(int adminUserId);
        Task<CompanyResponse> CreateSharedCompanyAsync(CreateCompanyRequest request);
        Task<CompanyResponse?> UpdateSharedCompanyAsync(int id, UpdateCompanyRequest request);
        Task<bool> DeleteSharedCompanyAsync(int id);
        Task<JobOpportunityResponse?> CreateSharedOpportunityAsync(CreateJobOpportunityRequest request);
        Task<JobOpportunityResponse?> UpdateSharedOpportunityAsync(int id, UpdateJobOpportunityRequest request);
        Task<bool> DeleteSharedOpportunityAsync(int id);
        Task<AdminNotificationPreviewResponse?> PreviewNotificationTargetsAsync(int adminUserId, int opportunityId);
        Task<AdminNotificationPreviewAllResponse> PreviewAllNotificationTargetsAsync(int adminUserId);
        Task<AdminNotificationResult?> NotifyInterestedUsersAsync(int adminUserId, int opportunityId, AdminNotifyRequest? request = null);
    }

    public class AdminService : IAdminService
    {
        private const int NotificationScoreThreshold = 60;
        private readonly AppDbContext _db;
        private readonly HttpClient _geminiClient;
        private readonly GeminiOptions _geminiOptions;
        private readonly IGeminiUsageTracker _usageTracker;

        public AdminService(AppDbContext db, IHttpClientFactory factory, GeminiOptions geminiOptions, IGeminiUsageTracker usageTracker)
        {
            _db = db;
            _geminiClient = factory.CreateClient("Gemini");
            _geminiOptions = geminiOptions;
            _usageTracker = usageTracker;
        }

        public async Task<List<AdminUserResponse>> GetUsersAsync(string? search)
        {
            var query = _db.Users.AsQueryable();
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(user => user.Email.ToLower().Contains(term) || user.FullName.ToLower().Contains(term));
            }

            var users = await query
                .OrderByDescending(user => user.Role == UserRole.Admin)
                .ThenBy(user => user.FullName)
                .Take(100)
                .ToListAsync();

            return users.Select(Map).ToList();
        }

        public async Task<AdminUserResponse?> CreateAdminAsync(CreateAdminRequest request)
        {
            var email = request.Email.Trim().ToLower();
            var existing = await _db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(user => user.Email == email);
            if (existing != null && !existing.IsDeleted) return null;
            if (existing != null)
            {
                existing.FullName = request.FullName.Trim();
                existing.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
                existing.Role = UserRole.Admin;
                existing.IsDeleted = false;
                existing.DeletedAt = null;
                existing.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                return Map(existing);
            }

            var user = new User
            {
                FullName = request.FullName.Trim(),
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = UserRole.Admin
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();
            return Map(user);
        }

        public async Task<AdminUserResponse?> MakeAdminAsync(int userId)
        {
            var user = await _db.Users.FirstOrDefaultAsync(item => item.Id == userId);
            if (user == null) return null;

            user.Role = UserRole.Admin;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Map(user);
        }

        public async Task<(bool Success, string Message)> RemoveAdminAsync(int userId)
        {
            var user = await _db.Users.FirstOrDefaultAsync(item => item.Id == userId);
            if (user == null) return (false, "User not found.");
            if (user.Role != UserRole.Admin) return (true, "User is already not an admin.");

            var otherAdmins = await _db.Users.CountAsync(item => item.Role == UserRole.Admin && item.Id != userId);
            if (otherAdmins == 0) return (false, "You must create another admin before removing this admin role.");

            user.Role = UserRole.Student;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return (true, "Admin role removed.");
        }

        public async Task<(bool Success, string Message)> DeleteUserAsync(int userId, int currentUserId)
        {
            var user = await _db.Users.FirstOrDefaultAsync(item => item.Id == userId);
            if (user == null) return (false, "User not found.");

            if (user.Role == UserRole.Admin)
            {
                var otherAdmins = await _db.Users.CountAsync(item => item.Role == UserRole.Admin && item.Id != userId);
                if (otherAdmins == 0) return (false, "You must create another admin before deleting this admin account.");
            }

            user.IsDeleted = true;
            user.DeletedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return (true, userId == currentUserId ? "Your admin account was deleted. Sign out now." : "User deleted.");
        }

        public async Task<AdminDatabaseResponse> GetSharedDatabaseAsync(int adminUserId)
        {
            var companies = await _db.Companies
                .Where(company => company.UserId == null)
                .OrderBy(company => company.Name)
                .ToListAsync();

            var opportunities = await _db.JobOpportunities
                .Include(job => job.Company)
                .Where(job => job.UserId == null)
                .OrderByDescending(job => job.CreatedAt)
                .ToListAsync();

            return new AdminDatabaseResponse
            {
                SharedCompanies = companies.Select(MapCompany).ToList(),
                SharedOpportunities = opportunities.Select(MapJob).ToList()
            };
        }

        public async Task<CompanyResponse> CreateSharedCompanyAsync(CreateCompanyRequest request)
        {
            var company = new Company
            {
                UserId = null,
                Name = request.Name.Trim(),
                Industry = request.Industry,
                Description = request.Description,
                City = request.City,
                Country = request.Country,
                Website = request.Website,
                Email = request.Email,
                Phone = request.Phone,
                LinkedInUrl = request.LinkedInUrl,
                LogoUrl = request.LogoUrl,
                SourceUrl = request.SourceUrl,
                SourceProvider = string.IsNullOrWhiteSpace(request.SourceProvider) ? "Admin Shared Database" : request.SourceProvider
            };

            _db.Companies.Add(company);
            await _db.SaveChangesAsync();
            return MapCompany(company);
        }

        public async Task<CompanyResponse?> UpdateSharedCompanyAsync(int id, UpdateCompanyRequest request)
        {
            var company = await _db.Companies.FirstOrDefaultAsync(item => item.Id == id && item.UserId == null);
            if (company == null) return null;

            if (request.Name != null) company.Name = request.Name.Trim();
            if (request.Industry != null) company.Industry = request.Industry;
            if (request.Description != null) company.Description = request.Description;
            if (request.City != null) company.City = request.City;
            if (request.Country != null) company.Country = request.Country;
            if (request.Website != null) company.Website = request.Website;
            if (request.Email != null) company.Email = request.Email;
            if (request.Phone != null) company.Phone = request.Phone;
            if (request.LinkedInUrl != null) company.LinkedInUrl = request.LinkedInUrl;
            if (request.LogoUrl != null) company.LogoUrl = request.LogoUrl;
            if (request.SourceUrl != null) company.SourceUrl = request.SourceUrl;
            if (request.SourceProvider != null) company.SourceProvider = request.SourceProvider;
            company.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return MapCompany(company);
        }

        public async Task<bool> DeleteSharedCompanyAsync(int id)
        {
            var company = await _db.Companies
                .Include(item => item.JobOpportunities.Where(job => job.UserId == null))
                .FirstOrDefaultAsync(item => item.Id == id && item.UserId == null);
            if (company == null) return false;

            var now = DateTime.UtcNow;
            foreach (var job in company.JobOpportunities)
            {
                job.IsDeleted = true;
                job.DeletedAt = now;
                job.UpdatedAt = now;
            }

            company.IsDeleted = true;
            company.DeletedAt = now;
            company.UpdatedAt = now;
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<JobOpportunityResponse?> CreateSharedOpportunityAsync(CreateJobOpportunityRequest request)
        {
            var company = await _db.Companies.FirstOrDefaultAsync(item => item.Id == request.CompanyId && item.UserId == null);
            if (company == null) return null;

            var job = new JobOpportunity
            {
                UserId = null,
                Title = request.Title.Trim(),
                Description = request.Description,
                Type = request.Type,
                EmploymentType = request.EmploymentType,
                Location = request.Location,
                IsRemote = request.IsRemote,
                SalaryMin = request.SalaryMin,
                SalaryMax = request.SalaryMax,
                ApplicationDeadline = request.ApplicationDeadline,
                RequiredSkills = request.RequiredSkills,
                JobUrl = request.JobUrl,
                SourceUrl = request.SourceUrl,
                SourceProvider = string.IsNullOrWhiteSpace(request.SourceProvider) ? "Admin Shared Database" : request.SourceProvider,
                IsActive = request.IsActive,
                CompanyId = company.Id
            };

            _db.JobOpportunities.Add(job);
            await _db.SaveChangesAsync();
            job.Company = company;
            return MapJob(job);
        }

        public async Task<JobOpportunityResponse?> UpdateSharedOpportunityAsync(int id, UpdateJobOpportunityRequest request)
        {
            var job = await _db.JobOpportunities
                .Include(item => item.Company)
                .FirstOrDefaultAsync(item => item.Id == id && item.UserId == null);
            if (job == null) return null;

            if (request.CompanyId.HasValue)
            {
                var company = await _db.Companies.FirstOrDefaultAsync(item => item.Id == request.CompanyId.Value && item.UserId == null);
                if (company == null) return null;
                job.CompanyId = company.Id;
                job.Company = company;
            }

            if (request.Title != null) job.Title = request.Title.Trim();
            if (request.Description != null) job.Description = request.Description;
            if (request.Type.HasValue) job.Type = request.Type.Value;
            if (request.EmploymentType.HasValue) job.EmploymentType = request.EmploymentType;
            if (request.Location != null) job.Location = request.Location;
            if (request.IsRemote.HasValue) job.IsRemote = request.IsRemote.Value;
            if (request.SalaryMin.HasValue) job.SalaryMin = request.SalaryMin;
            if (request.SalaryMax.HasValue) job.SalaryMax = request.SalaryMax;
            if (request.ApplicationDeadline.HasValue) job.ApplicationDeadline = request.ApplicationDeadline;
            if (request.RequiredSkills != null) job.RequiredSkills = request.RequiredSkills;
            if (request.JobUrl != null) job.JobUrl = request.JobUrl;
            if (request.SourceUrl != null) job.SourceUrl = request.SourceUrl;
            if (request.SourceProvider != null) job.SourceProvider = request.SourceProvider;
            if (request.IsActive.HasValue) job.IsActive = request.IsActive.Value;
            job.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            await _db.Entry(job).Reference(item => item.Company).LoadAsync();
            return MapJob(job);
        }

        public async Task<bool> DeleteSharedOpportunityAsync(int id)
        {
            var job = await _db.JobOpportunities.FirstOrDefaultAsync(item => item.Id == id && item.UserId == null);
            if (job == null) return false;

            job.IsDeleted = true;
            job.DeletedAt = DateTime.UtcNow;
            job.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<AdminNotificationPreviewResponse?> PreviewNotificationTargetsAsync(int adminUserId, int opportunityId)
        {
            var opportunity = await _db.JobOpportunities
                .Include(job => job.Company)
                .FirstOrDefaultAsync(job => job.Id == opportunityId && job.UserId == null);
            if (opportunity == null) return null;

            var users = await _db.Users
                .Where(user => user.NotificationsEnabled && user.Role != UserRole.Admin)
                .ToListAsync();

            var selection = await SelectNotificationTargetsAsync(adminUserId, opportunity, users);
            return BuildNotificationPreview(opportunity.Id, selection);
        }

        public async Task<AdminNotificationPreviewAllResponse> PreviewAllNotificationTargetsAsync(int adminUserId)
        {
            var checkedAt = DateTime.UtcNow;
            var opportunities = await _db.JobOpportunities
                .Include(job => job.Company)
                .Where(job => job.UserId == null)
                .OrderByDescending(job => job.CreatedAt)
                .ToListAsync();

            var users = await _db.Users
                .Where(user => user.NotificationsEnabled && user.Role != UserRole.Admin)
                .ToListAsync();

            var results = new List<AdminNotificationPreviewResponse>();
            foreach (var opportunity in opportunities)
            {
                var selection = await SelectNotificationTargetsAsync(adminUserId, opportunity, users);
                results.Add(BuildNotificationPreview(opportunity.Id, selection, checkedAt));
            }

            return new AdminNotificationPreviewAllResponse
            {
                CheckedAt = checkedAt,
                Results = results
            };
        }

        public async Task<AdminNotificationResult?> NotifyInterestedUsersAsync(int adminUserId, int opportunityId, AdminNotifyRequest? request = null)
        {
            var opportunity = await _db.JobOpportunities
                .Include(job => job.Company)
                .FirstOrDefaultAsync(job => job.Id == opportunityId && job.UserId == null);
            if (opportunity == null) return null;

            var users = await _db.Users
                .Where(user => user.NotificationsEnabled && user.Role != UserRole.Admin)
                .ToListAsync();

            NotificationTargetSelection selection;
            if (request?.TargetUserIds is { Count: > 0 })
            {
                var requestedIds = request.TargetUserIds.Distinct().ToHashSet();
                selection = new NotificationTargetSelection(users.Where(user => requestedIds.Contains(user.Id)).ToList(), false);
            }
            else if (request?.TargetUserIds is { Count: 0 })
            {
                selection = new NotificationTargetSelection([], false);
            }
            else
            {
                selection = await SelectNotificationTargetsAsync(adminUserId, opportunity, users);
            }

            if (selection.Users.Count == 0)
            {
                return new AdminNotificationResult
                {
                    Sent = 0,
                    MatchedUsers = 0,
                    Message = selection.UsedAi
                        ? $"AI did not find users with a match score of {NotificationScoreThreshold}+ for this opportunity."
                        : "No notification-enabled users matched this opportunity by profile rules."
                };
            }

            var title = "New shared opportunity";
            var message = $"{opportunity.Company.Name} added {opportunity.Title}. Review it in Data Hub and save it to your workspace if it fits your goals.";
            foreach (var user in selection.Users)
            {
                _db.Notifications.Add(new Notification
                {
                    UserId = user.Id,
                    Title = title,
                    Message = message,
                    Type = NotificationType.OpportunityAlert,
                    Link = "/data-hub",
                    ExpiresAt = opportunity.ApplicationDeadline?.AddDays(1)
                });
            }

            await _db.SaveChangesAsync();
            return new AdminNotificationResult
            {
                Sent = selection.Users.Count,
                MatchedUsers = selection.Users.Count,
                Message = request?.TargetUserIds is { Count: > 0 }
                    ? $"Sent to {selection.Users.Count} users from the latest notification check."
                    : selection.UsedAi
                    ? $"Sent to {selection.Users.Count} users with AI match score {NotificationScoreThreshold}+."
                    : $"Sent to {selection.Users.Count} users matched by fallback profile rules."
            };
        }

        private static AdminNotificationPreviewResponse BuildNotificationPreview(int opportunityId, NotificationTargetSelection selection, DateTime? checkedAt = null)
        {
            return new AdminNotificationPreviewResponse
            {
                OpportunityId = opportunityId,
                MatchedUsers = selection.Users.Count,
                Threshold = NotificationScoreThreshold,
                UsedAi = selection.UsedAi,
                CheckedAt = checkedAt ?? DateTime.UtcNow,
                TargetUserIds = selection.Users.Select(user => user.Id).ToList(),
                Message = selection.Users.Count == 0
                    ? selection.UsedAi
                        ? $"AI did not find users with a match score of {NotificationScoreThreshold}+ for this opportunity."
                        : "No notification-enabled users matched this opportunity by profile rules."
                    : selection.UsedAi
                        ? $"{selection.Users.Count} users matched with AI score {NotificationScoreThreshold}+."
                        : $"{selection.Users.Count} users matched by fallback profile rules."
            };
        }

        private static AdminUserResponse Map(User user) => new()
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role.ToString(),
            Major = user.Major,
            City = user.City,
            CareerObjective = user.CareerObjective,
            NotificationsEnabled = user.NotificationsEnabled,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt
        };

        private async Task<NotificationTargetSelection> SelectNotificationTargetsAsync(int adminUserId, JobOpportunity opportunity, List<User> users)
        {
            if (users.Count == 0)
                return new NotificationTargetSelection([], _geminiOptions.IsConfigured);

            var fallback = users
                .Where(user => ProfileRuleScore(user, opportunity) >= NotificationScoreThreshold)
                .ToList();

            if (!_geminiOptions.IsConfigured)
                return new NotificationTargetSelection(fallback, false);

            var aiScores = new Dictionary<int, int>();
            foreach (var chunk in users.Chunk(40))
            {
                var chunkScores = await ScoreNotificationChunkWithAiAsync(adminUserId, opportunity, chunk.ToList());
                foreach (var score in chunkScores)
                    aiScores[score.Key] = score.Value;
            }

            if (aiScores.Count == 0)
                return new NotificationTargetSelection(fallback, false);

            var selected = users
                .Where(user => aiScores.TryGetValue(user.Id, out var score) && score >= NotificationScoreThreshold)
                .ToList();

            return new NotificationTargetSelection(selected, true);
        }

        private async Task<Dictionary<int, int>> ScoreNotificationChunkWithAiAsync(int adminUserId, JobOpportunity opportunity, List<User> users)
        {
            var opportunityPayload = new
            {
                title = opportunity.Title,
                type = opportunity.Type.ToString(),
                employmentType = opportunity.EmploymentType?.ToString(),
                company = opportunity.Company.Name,
                industry = opportunity.Company.Industry,
                location = opportunity.Location,
                companyCity = opportunity.Company.City,
                companyCountry = opportunity.Company.Country,
                requiredSkills = opportunity.RequiredSkills,
                description = opportunity.Description
            };

            var userPayload = users.Select(user => new
            {
                userId = user.Id,
                major = user.Major,
                city = user.City,
                university = user.University,
                graduationYear = user.GraduationYear,
                careerObjective = user.CareerObjective,
                fallbackRuleScore = ProfileRuleScore(user, opportunity)
            }).ToList();

            var prompt =
                "Score whether each user should receive a notification about this shared opportunity.\n" +
                "Return JSON only in this exact shape: {\"matches\":[{\"userId\":1,\"score\":85,\"reason\":\"short\"}]}.\n" +
                "Rules:\n" +
                "- Score 0-100.\n" +
                "- 85-100: strong match by field/skills and location.\n" +
                "- 60-84: reasonable match by major, skills, role family, city, or nearby location.\n" +
                "- Below 60: weak or unrelated match.\n" +
                "- Consider related terms, not only exact words. Example: Software Engineering can match backend, developer, API, AI, machine learning, data, and web roles.\n" +
                "- Include every user exactly once.\n\n" +
                $"Opportunity: {JsonSerializer.Serialize(opportunityPayload)}\n" +
                $"Users: {JsonSerializer.Serialize(userPayload)}";

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
                generationConfig = new
                {
                    responseMimeType = "application/json"
                }
            });

            try
            {
                using var response = await _geminiClient.PostAsync(
                    $"v1beta/models/{_geminiOptions.ModelId}:generateContent",
                    new StringContent(body, Encoding.UTF8, "application/json"));

                var responseBody = await response.Content.ReadAsStringAsync();
                if (!response.IsSuccessStatusCode)
                    return new Dictionary<int, int>();

                using var doc = JsonDocument.Parse(responseBody);
                RecordGeminiUsage(adminUserId, "Admin notification matching", doc.RootElement);
                var text = ExtractGeminiText(doc.RootElement);
                var parsed = ParseAiMatchEnvelope(text);
                return parsed.Matches
                    .Where(match => users.Any(user => user.Id == match.UserId))
                    .GroupBy(match => match.UserId)
                    .ToDictionary(group => group.Key, group => Math.Clamp(group.First().Score, 0, 100));
            }
            catch
            {
                return new Dictionary<int, int>();
            }
        }

        private static CompanyResponse MapCompany(Company company) => new()
        {
            Id = company.Id,
            UserId = company.UserId,
            Name = company.Name,
            Industry = company.Industry,
            Description = company.Description,
            City = company.City,
            Country = company.Country,
            Website = company.Website,
            Email = company.Email,
            Phone = company.Phone,
            LinkedInUrl = company.LinkedInUrl,
            LogoUrl = company.LogoUrl,
            SourceUrl = company.SourceUrl,
            SourceProvider = company.SourceProvider,
            IsShared = company.UserId == null,
            IsImported = company.IsImported,
            CreatedAt = company.CreatedAt
        };

        private static JobOpportunityResponse MapJob(JobOpportunity job) => new()
        {
            Id = job.Id,
            UserId = job.UserId,
            Title = job.Title,
            Description = job.Description,
            Type = job.Type.ToString(),
            EmploymentType = job.EmploymentType?.ToString(),
            Location = job.Location,
            IsRemote = job.IsRemote,
            SalaryMin = job.SalaryMin,
            SalaryMax = job.SalaryMax,
            ApplicationDeadline = job.ApplicationDeadline,
            RequiredSkills = job.RequiredSkills,
            JobUrl = job.JobUrl,
            SourceUrl = job.SourceUrl,
            SourceProvider = job.SourceProvider,
            IsActive = job.IsActive,
            IsImported = job.IsImported,
            IsShared = job.UserId == null,
            CreatedAt = job.CreatedAt,
            Company = new CompanySummary
            {
                Id = job.Company.Id,
                UserId = job.Company.UserId,
                Name = job.Company.Name,
                Industry = job.Company.Industry,
                City = job.Company.City,
                Country = job.Company.Country,
                Website = job.Company.Website,
                LogoUrl = job.Company.LogoUrl,
                SourceUrl = job.Company.SourceUrl,
                SourceProvider = job.Company.SourceProvider,
                IsShared = job.Company.UserId == null
            }
        };

        private static int ProfileRuleScore(User user, JobOpportunity opportunity)
        {
            var haystack = NormalizeSearchText(string.Join(" ", new[]
            {
                opportunity.Title,
                opportunity.Description,
                opportunity.RequiredSkills,
                opportunity.Location,
                opportunity.Company.Name,
                opportunity.Company.Industry,
                opportunity.Company.City,
                opportunity.Company.Country
            }));

            var majorMatch = BuildProfileTerms(user.Major, user.CareerObjective).Any(term => haystack.Contains(term));
            var cityMatch = MatchesLocation(user.City, haystack);

            return (majorMatch, cityMatch) switch
            {
                (true, true) => 88,
                (true, false) => 70,
                (false, true) => 64,
                _ => 0
            };
        }

        private static bool MatchesLocation(string? city, string haystack)
        {
            var normalizedCity = NormalizeSearchText(city);
            if (string.IsNullOrWhiteSpace(normalizedCity)) return false;
            if (haystack.Contains(normalizedCity)) return true;

            var cityTokens = normalizedCity
                .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Where(token => token.Length > 2)
                .ToList();

            return cityTokens.Count > 0 && cityTokens.All(haystack.Contains);
        }

        private static List<string> BuildMajorTerms(string? major)
        {
            var normalizedMajor = NormalizeSearchText(major);
            if (string.IsNullOrWhiteSpace(normalizedMajor)) return [];

            var terms = normalizedMajor
                .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Where(token => token.Length > 2)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            if (normalizedMajor.Contains("software"))
            {
                foreach (var term in new[] { "backend", "frontend", "fullstack", "developer", "development", "programming", "application", "web", "api", "cloud" })
                    terms.Add(term);
            }

            if (normalizedMajor.Contains("computer") || normalizedMajor.Contains("software") || normalizedMajor.Contains("data"))
            {
                foreach (var term in new[] { "ai", "artificial intelligence", "machine learning", "ml", "data", "analytics", "automation" })
                    terms.Add(term);
            }

            if (normalizedMajor.Contains("business"))
            {
                foreach (var term in new[] { "business", "analyst", "marketing", "sales", "operations", "management" })
                    terms.Add(term);
            }

            return terms.ToList();
        }

        private static List<string> BuildProfileTerms(string? major, string? careerObjective)
        {
            var terms = BuildMajorTerms(major).ToHashSet(StringComparer.OrdinalIgnoreCase);
            var objective = NormalizeSearchText(careerObjective);
            if (!string.IsNullOrWhiteSpace(objective))
            {
                foreach (var token in objective.Split(' ', StringSplitOptions.RemoveEmptyEntries).Where(token => token.Length > 2))
                    terms.Add(token);

                if (objective.Contains("intern") || objective.Contains("internship"))
                    terms.Add("internship");
                if (objective.Contains("backend") || objective.Contains("api"))
                    terms.UnionWith(["backend", "api", "developer"]);
                if (objective.Contains("frontend") || objective.Contains("react"))
                    terms.UnionWith(["frontend", "react", "web"]);
                if (objective.Contains("ai") || objective.Contains("machine learning"))
                    terms.UnionWith(["ai", "machine learning", "ml", "data"]);
            }

            return terms.ToList();
        }

        private static string NormalizeSearchText(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;

            var builder = new StringBuilder(value.Length);
            foreach (var character in value.ToLowerInvariant())
            {
                builder.Append(char.IsLetterOrDigit(character) ? character : ' ');
            }

            return string.Join(' ', builder.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries));
        }

        private static string ExtractGeminiText(JsonElement root)
        {
            if (!root.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
                return string.Empty;

            var candidate = candidates[0];
            if (!candidate.TryGetProperty("content", out var content) ||
                !content.TryGetProperty("parts", out var parts) ||
                parts.GetArrayLength() == 0)
                return string.Empty;

            return parts[0].TryGetProperty("text", out var text) ? text.GetString() ?? string.Empty : string.Empty;
        }

        private static AiNotificationMatchEnvelope ParseAiMatchEnvelope(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return new AiNotificationMatchEnvelope();

            var cleaned = raw.Replace("```json", string.Empty, StringComparison.OrdinalIgnoreCase)
                .Replace("```", string.Empty)
                .Trim();

            var candidates = new List<string> { cleaned };
            var objectStart = cleaned.IndexOf('{');
            var objectEnd = cleaned.LastIndexOf('}');
            if (objectStart >= 0 && objectEnd > objectStart)
                candidates.Add(cleaned[objectStart..(objectEnd + 1)]);

            foreach (var candidate in candidates)
            {
                try
                {
                    return JsonSerializer.Deserialize<AiNotificationMatchEnvelope>(
                        candidate,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new AiNotificationMatchEnvelope();
                }
                catch
                {
                    // Try the next JSON candidate.
                }
            }

            return new AiNotificationMatchEnvelope();
        }

        private void RecordGeminiUsage(int userId, string feature, JsonElement root)
        {
            if (userId <= 0 || !root.TryGetProperty("usageMetadata", out var usage))
                return;

            var promptTokens = GetIntProperty(usage, "promptTokenCount");
            var outputTokens = GetIntProperty(usage, "candidatesTokenCount");
            var totalTokens = GetIntProperty(usage, "totalTokenCount");

            if (totalTokens == 0)
                totalTokens = promptTokens + outputTokens;

            _usageTracker.Record(userId, feature, promptTokens, outputTokens, totalTokens, _geminiOptions.ModelId);
        }

        private static int GetIntProperty(JsonElement element, string propertyName)
        {
            return element.TryGetProperty(propertyName, out var value) && value.TryGetInt32(out var number)
                ? number
                : 0;
        }

        private record NotificationTargetSelection(List<User> Users, bool UsedAi);

        private class AiNotificationMatchEnvelope
        {
            public List<AiNotificationMatchResult> Matches { get; set; } = [];
        }

        private class AiNotificationMatchResult
        {
            public int UserId { get; set; }
            public int Score { get; set; }
            public string? Reason { get; set; }
        }
    }
}
