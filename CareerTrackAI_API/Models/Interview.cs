using CareerTrackAI.Enums;

namespace CareerTrackAI.Models
{
    /// <summary>
    /// المقابلة - مرتبطة بطلب تقديم معين
    /// </summary>
    public class Interview : BaseEntity
    {
        public string Title { get; set; } = string.Empty;
        public DateTime ScheduledAt { get; set; }
        public int DurationMinutes { get; set; } = 60;

        public InterviewType Type { get; set; } = InterviewType.Online;

        public string? Location { get; set; }  // لينك زووم أو عنوان فعلي
        public string? Notes { get; set; }

        public bool ReminderSent { get; set; } = false;

        // FK
        public int ApplicationId { get; set; }
        public Application Application { get; set; } = null!;
    }
}
