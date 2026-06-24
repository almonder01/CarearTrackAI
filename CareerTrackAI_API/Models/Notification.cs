using CareerTrackAI.Enums;

namespace CareerTrackAI.Models
{
    public class Notification : BaseEntity
    {
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public NotificationType Type { get; set; }
        public bool IsRead { get; set; } = false;

        /// <summary>
        /// مسار التنقل في الفرونت اند - مثال: /applications/15
        /// </summary>
        public string? Link { get; set; }

        public DateTime? ScheduledFor { get; set; }

        /// <summary>
        /// بعد هذا الوقت لا يُعرض الإشعار
        /// مثال: تذكير Deadline ينتهي بعد مرور الموعد
        /// </summary>
        public DateTime? ExpiresAt { get; set; }

        // FK
        public int UserId { get; set; }
        public User User { get; set; } = null!;
    }
}
