namespace CareerTrackAI.DTOs.Notification
{
    public class NotificationResponse
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public bool IsRead { get; set; }

        /// <summary>
        /// مسار مباشر للفرونت اند مثل /applications/15
        /// </summary>
        public string? Link { get; set; }

        public DateTime? ExpiresAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// قائمة الإشعارات مع عدد غير المقروء - يُستخدم في الـ header badge
    /// </summary>
    public class NotificationListResponse
    {
        public List<NotificationResponse> Notifications { get; set; } = new();
        public int UnreadCount { get; set; }
    }
}
