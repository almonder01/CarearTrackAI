using CareerTrackAI.Data;
using CareerTrackAI.DTOs.Notification;
using CareerTrackAI.DTOs.User;
using CareerTrackAI.DTOs.Dashboard;
using CareerTrackAI.Enums;
using Microsoft.EntityFrameworkCore;

namespace CareerTrackAI.Services
{
    // ==================== NOTIFICATION SERVICE ====================
    public interface INotificationService
    {
        Task<NotificationListResponse> GetAllAsync(int userId);
        Task<bool> MarkAsReadAsync(int id, int userId);
        Task MarkAllAsReadAsync(int userId);
        Task<bool> DeleteAsync(int id, int userId);
    }

    public class NotificationService : INotificationService
    {
        private readonly AppDbContext _db;

        public NotificationService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<NotificationListResponse> GetAllAsync(int userId)
        {
            var now = DateTime.UtcNow;

            var notifications = await _db.Notifications
                .Where(n => n.UserId == userId && (n.ExpiresAt == null || n.ExpiresAt > now))
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            return new NotificationListResponse
            {
                Notifications = notifications.Select(n => new NotificationResponse
                {
                    Id = n.Id,
                    Title = n.Title,
                    Message = n.Message,
                    Type = n.Type.ToString(),
                    IsRead = n.IsRead,
                    Link = n.Link,
                    ExpiresAt = n.ExpiresAt,
                    CreatedAt = n.CreatedAt
                }).ToList(),
                UnreadCount = notifications.Count(n => !n.IsRead)
            };
        }

        public async Task<bool> MarkAsReadAsync(int id, int userId)
        {
            var notification = await _db.Notifications
                .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

            if (notification == null) return false;

            notification.IsRead = true;
            notification.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task MarkAllAsReadAsync(int userId)
        {
            var unread = await _db.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ToListAsync();

            foreach (var n in unread)
            {
                n.IsRead = true;
                n.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
        }

        public async Task<bool> DeleteAsync(int id, int userId)
        {
            var notification = await _db.Notifications
                .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

            if (notification == null) return false;

            notification.IsDeleted = true;
            notification.DeletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return true;
        }
    }

    // ==================== USER SERVICE ====================
    public interface IUserService
    {
        Task<UserResponse?> GetByIdAsync(int userId);
        Task<UserResponse?> UpdateAsync(int userId, UpdateUserRequest request);
    }

    public class UserService : IUserService
    {
        private readonly AppDbContext _db;

        public UserService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<UserResponse?> GetByIdAsync(int userId)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            return user == null ? null : new UserResponse
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                Role = user.Role.ToString(),
                University = user.University,
                Major = user.Major,
                City = user.City,
                GraduationYear = user.GraduationYear,
                CareerObjective = user.CareerObjective,
                NotificationsEnabled = user.NotificationsEnabled,
                LastLoginAt = user.LastLoginAt,
                CreatedAt = user.CreatedAt
            };
        }

        public async Task<UserResponse?> UpdateAsync(int userId, UpdateUserRequest request)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return null;

            user.FullName = request.FullName;
            if (request.University != null) user.University = request.University;
            if (request.Major != null) user.Major = request.Major;
            if (request.City != null) user.City = request.City;
            if (request.GraduationYear.HasValue) user.GraduationYear = request.GraduationYear;
            if (request.CareerObjective != null) user.CareerObjective = request.CareerObjective;
            if (request.NotificationsEnabled.HasValue) user.NotificationsEnabled = request.NotificationsEnabled.Value;

            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return await GetByIdAsync(userId);
        }
    }

    // ==================== DASHBOARD SERVICE ====================
    public interface IDashboardService
    {
        Task<DashboardStatsResponse> GetStatsAsync(int userId, string activityGrain = "month");
        Task<FirstRunChecklistResponse> GetFirstRunChecklistAsync(int userId);
    }

    public class DashboardService : IDashboardService
    {
        private readonly AppDbContext _db;
        private readonly GeminiOptions _geminiOptions;

        public DashboardService(AppDbContext db, GeminiOptions geminiOptions)
        {
            _db = db;
            _geminiOptions = geminiOptions;
        }

        public async Task<DashboardStatsResponse> GetStatsAsync(int userId, string activityGrain = "month")
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            var applications = await _db.Applications
                .Where(a => a.UserId == userId)
                .Include(a => a.JobOpportunity).ThenInclude(j => j.Company)
                .ToListAsync();

            var total = applications.Count;
            var accepted = applications.Count(a => a.Status == ApplicationStatus.Accepted);
            var rejected = applications.Count(a => a.Status == ApplicationStatus.Rejected);
            var pending = total - accepted - rejected;

            // المقابلات القادمة خلال 7 أيام
            var now = DateTime.UtcNow;
            var upcomingInterviews = await _db.Interviews
                .Where(i => i.Application.UserId == userId
                    && i.ScheduledAt >= now
                    && i.ScheduledAt <= now.AddDays(7))
                .Include(i => i.Application).ThenInclude(a => a.JobOpportunity).ThenInclude(j => j.Company)
                .OrderBy(i => i.ScheduledAt)
                .Take(5)
                .ToListAsync();

            // الفرص التي يقترب موعدها خلال 3 أيام
            var deadlineAlerts = await _db.JobOpportunities
                .Where(j => j.ApplicationDeadline >= now
                    && j.ApplicationDeadline <= now.AddDays(3)
                    && j.UserId == userId
                    && j.IsActive)
                .Include(j => j.Company)
                .OrderBy(j => j.ApplicationDeadline)
                .Take(5)
                .ToListAsync();

            var activity = BuildApplicationActivity(applications, user?.CreatedAt ?? now, now, activityGrain);

            return new DashboardStatsResponse
            {
                TotalApplications = total,
                Accepted = accepted,
                Rejected = rejected,
                Pending = pending,
                SuccessRate = total == 0 ? 0 : Math.Round((double)accepted / total * 100, 1),
                ByStatus = new StatusBreakdown
                {
                    Planning = applications.Count(a => a.Status == ApplicationStatus.Planning),
                    Applied = applications.Count(a => a.Status == ApplicationStatus.Applied),
                    Interview = applications.Count(a => a.Status == ApplicationStatus.Interview),
                    Accepted = accepted,
                    Rejected = rejected
                },
                RecentApplications = applications
                    .OrderByDescending(a => a.CreatedAt)
                    .Take(5)
                    .Select(a => new RecentApplication
                    {
                        Id = a.Id,
                        CompanyName = a.JobOpportunity.Company.Name,
                        JobTitle = a.JobOpportunity.Title,
                        Status = a.Status.ToString(),
                        CreatedAt = a.CreatedAt
                    }).ToList(),
                UpcomingInterviews = upcomingInterviews.Select(i => new UpcomingInterview
                {
                    Id = i.Id,
                    CompanyName = i.Application.JobOpportunity.Company.Name,
                    JobTitle = i.Application.JobOpportunity.Title,
                    InterviewTitle = i.Title,
                    ScheduledAt = i.ScheduledAt,
                    Type = i.Type.ToString(),
                    Location = i.Location
                }).ToList(),
                DeadlineAlerts = deadlineAlerts.Select(j => new DeadlineAlert
                {
                    JobOpportunityId = j.Id,
                    CompanyName = j.Company.Name,
                    JobTitle = j.Title,
                    ApplicationDeadline = j.ApplicationDeadline!.Value,
                    DaysRemaining = (int)(j.ApplicationDeadline.Value - now).TotalDays
                }).ToList(),
                ApplicationActivity = activity
            };
        }

        private static List<ApplicationActivityPoint> BuildApplicationActivity(List<Models.Application> applications, DateTime createdAt, DateTime now, string grain)
        {
            var normalized = (grain ?? "month").Trim().ToLowerInvariant();
            if (normalized is not ("day" or "month" or "year")) normalized = "month";

            var start = createdAt.Date;
            var end = now.Date.AddDays(1);
            if (normalized == "day" && (end - start).TotalDays > 180)
                start = end.AddDays(-180);

            var points = new List<ApplicationActivityPoint>();
            for (var cursor = AlignStart(start, normalized); cursor < end;)
            {
                var next = NextBucket(cursor, normalized);
                var label = normalized switch
                {
                    "day" => cursor.ToString("MMM d"),
                    "year" => cursor.ToString("yyyy"),
                    _ => cursor.ToString("MMM yyyy")
                };

                points.Add(new ApplicationActivityPoint
                {
                    Week = label,
                    Grain = normalized,
                    From = cursor,
                    To = next.AddTicks(-1),
                    Applications = applications.Count(a => a.CreatedAt >= cursor && a.CreatedAt < next),
                    Replies = applications.Count(a =>
                        (a.Status == ApplicationStatus.Accepted || a.Status == ApplicationStatus.Rejected)
                        && (a.StatusUpdatedAt ?? a.UpdatedAt ?? a.CreatedAt) >= cursor
                        && (a.StatusUpdatedAt ?? a.UpdatedAt ?? a.CreatedAt) < next)
                });

                cursor = next;
            }

            return points;
        }

        private static DateTime AlignStart(DateTime value, string grain) => grain switch
        {
            "year" => new DateTime(value.Year, 1, 1),
            "month" => new DateTime(value.Year, value.Month, 1),
            _ => value.Date
        };

        private static DateTime NextBucket(DateTime value, string grain) => grain switch
        {
            "year" => value.AddYears(1),
            "month" => value.AddMonths(1),
            _ => value.AddDays(1)
        };

        public async Task<FirstRunChecklistResponse> GetFirstRunChecklistAsync(int userId)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            var profileReady = user != null
                && !string.IsNullOrWhiteSpace(user.FullName)
                && !string.IsNullOrWhiteSpace(user.Major)
                && !string.IsNullOrWhiteSpace(user.City)
                && !string.IsNullOrWhiteSpace(user.CareerObjective);

            var resumeCount = await _db.Resumes.CountAsync(r => r.UserId == userId);
            var companyCount = await _db.Companies.CountAsync(c => c.UserId == userId);
            var opportunityCount = await _db.JobOpportunities.CountAsync(j => j.UserId == userId && j.IsActive);
            var applicationCount = await _db.Applications.CountAsync(a => a.UserId == userId);

            var items = new List<FirstRunChecklistItem>
            {
                new()
                {
                    Id = "profile",
                    Title = "Complete your profile",
                    Description = "Add your major, city, and career focus so matching and AI guidance can use real context.",
                    Route = "/profile",
                    ActionLabel = profileReady ? "Review profile" : "Complete profile",
                    Completed = profileReady
                },
                new()
                {
                    Id = "resume",
                    Title = "Add your first CV",
                    Description = "Upload a resume or create a version that AI can analyze and tailor.",
                    Route = "/resumes",
                    ActionLabel = resumeCount > 0 ? "Manage CVs" : "Add CV",
                    Completed = resumeCount > 0,
                    Count = resumeCount
                },
                new()
                {
                    Id = "companies",
                    Title = "Build your company list",
                    Description = "Import, search, or add real companies before tracking applications.",
                    Route = "/data-hub",
                    ActionLabel = companyCount > 0 ? "Review companies" : "Add companies",
                    Completed = companyCount > 0,
                    Count = companyCount
                },
                new()
                {
                    Id = "opportunities",
                    Title = "Find real opportunities",
                    Description = "Use JobDataLake, Adzuna, CSV import, or AI sourcing to create reviewable rows.",
                    Route = "/data-hub",
                    ActionLabel = opportunityCount > 0 ? "Review opportunities" : "Find opportunities",
                    Completed = opportunityCount > 0,
                    Count = opportunityCount
                },
                new()
                {
                    Id = "applications",
                    Title = "Track your first application",
                    Description = "Move one opportunity into the application pipeline and update its status.",
                    Route = "/opportunities",
                    ActionLabel = applicationCount > 0 ? "Open pipeline" : "Track application",
                    Completed = applicationCount > 0,
                    Count = applicationCount
                },
                new()
                {
                    Id = "gemini",
                    Title = "Connect Gemini",
                    Description = "Enable live AI for recommendations, chat, resume analysis, and sourcing.",
                    Route = "/settings",
                    ActionLabel = _geminiOptions.IsConfigured ? "AI settings" : "Connect Gemini",
                    Completed = _geminiOptions.IsConfigured,
                    Status = _geminiOptions.IsConfigured ? "Live" : "Local fallback"
                }
            };

            return new FirstRunChecklistResponse
            {
                Completed = items.Count(item => item.Completed),
                Total = items.Count,
                Items = items
            };
        }
    }
}
