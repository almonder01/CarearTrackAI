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
}
