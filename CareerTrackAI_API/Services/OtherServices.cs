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

            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return await GetByIdAsync(userId);
        }
    }

    // ==================== DASHBOARD SERVICE ====================
    public interface IDashboardService
    {
        Task<DashboardStatsResponse> GetStatsAsync(int userId);
    }

    public class DashboardService : IDashboardService
    {
        private readonly AppDbContext _db;

        public DashboardService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<DashboardStatsResponse> GetStatsAsync(int userId)
        {
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
                    && j.IsActive)
                .Include(j => j.Company)
                .OrderBy(j => j.ApplicationDeadline)
                .Take(5)
                .ToListAsync();

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
                }).ToList()
            };
        }
    }
}
