using System.ComponentModel.DataAnnotations;
using CareerTrackAI.Enums;

namespace CareerTrackAI.DTOs.Interview
{
    public class InterviewResponse
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime ScheduledAt { get; set; }
        public int DurationMinutes { get; set; }
        public string Type { get; set; } = string.Empty;
        public string? Location { get; set; }
        public string? Notes { get; set; }
        public bool ReminderSent { get; set; }
        public DateTime CreatedAt { get; set; }

        /// <summary>
        /// بيانات الطلب المرتبط - يفيد الفرونت اند في صفحة التقويم
        /// </summary>
        public int ApplicationId { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public string JobTitle { get; set; } = string.Empty;
    }

    /// <summary>
    /// POST /api/applications/{applicationId}/interviews
    /// </summary>
    public class CreateInterviewRequest
    {
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public DateTime ScheduledAt { get; set; }

        [Range(15, 480)]
        public int DurationMinutes { get; set; } = 60;

        [Required]
        public InterviewType Type { get; set; }

        [MaxLength(500)]
        public string? Location { get; set; }

        public string? Notes { get; set; }
    }

    /// <summary>
    /// PUT /api/interviews/{id}
    /// </summary>
    public class UpdateInterviewRequest
    {
        [MaxLength(200)]
        public string? Title { get; set; }

        public DateTime? ScheduledAt { get; set; }

        [Range(15, 480)]
        public int? DurationMinutes { get; set; }

        public InterviewType? Type { get; set; }

        [MaxLength(500)]
        public string? Location { get; set; }

        public string? Notes { get; set; }
    }
}
