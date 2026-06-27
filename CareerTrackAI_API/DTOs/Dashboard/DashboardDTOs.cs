namespace CareerTrackAI.DTOs.Dashboard
{
    /// <summary>
    /// GET /api/dashboard/stats
    /// كل شيء يُحسب لحظياً من جدول Applications - لا يوجد جدول Dashboard
    /// </summary>
    public class DashboardStatsResponse
    {
        public int TotalApplications { get; set; }
        public int Accepted { get; set; }
        public int Rejected { get; set; }
        public int Pending { get; set; }

        /// <summary>
        /// نسبة القبول: Accepted / TotalApplications * 100
        /// </summary>
        public double SuccessRate { get; set; }

        /// <summary>
        /// توزيع الطلبات على أعمدة الكانبان
        /// </summary>
        public StatusBreakdown ByStatus { get; set; } = new();

        /// <summary>
        /// آخر 5 طلبات للعرض في الـ Dashboard
        /// </summary>
        public List<RecentApplication> RecentApplications { get; set; } = new();

        /// <summary>
        /// المقابلات القادمة خلال 7 أيام
        /// </summary>
        public List<UpcomingInterview> UpcomingInterviews { get; set; } = new();

        /// <summary>
        /// الفرص التي يقترب موعد تقديمها (خلال 3 أيام)
        /// </summary>
        public List<DeadlineAlert> DeadlineAlerts { get; set; } = new();
    }

    public class StatusBreakdown
    {
        public int Planning { get; set; }
        public int Applied { get; set; }
        public int Interview { get; set; }
        public int Accepted { get; set; }
        public int Rejected { get; set; }
    }

    public class RecentApplication
    {
        public int Id { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public string JobTitle { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class UpcomingInterview
    {
        public int Id { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public string JobTitle { get; set; } = string.Empty;
        public string InterviewTitle { get; set; } = string.Empty;
        public DateTime ScheduledAt { get; set; }
        public string Type { get; set; } = string.Empty;
        public string? Location { get; set; }
    }

    public class DeadlineAlert
    {
        public int JobOpportunityId { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public string JobTitle { get; set; } = string.Empty;
        public DateTime ApplicationDeadline { get; set; }

        /// <summary>
        /// كم يوم تبقى - يحسبها الـ Backend
        /// </summary>
        public int DaysRemaining { get; set; }
    }
}
