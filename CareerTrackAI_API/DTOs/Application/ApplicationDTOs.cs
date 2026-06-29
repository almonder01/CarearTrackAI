using System.ComponentModel.DataAnnotations;
using CareerTrackAI.DTOs.JobOpportunity;
using CareerTrackAI.Enums;

namespace CareerTrackAI.DTOs.Application
{
    public class ApplicationResponse
    {
        public int Id { get; set; }

        /// <summary>
        /// القيمة النصية مباشرة: "Planning" / "Applied" / "Interview" / "Accepted" / "Rejected"
        /// الفرونت اند يستخدمها كمفتاح لعمود الكانبان
        /// </summary>
        public string Status { get; set; } = string.Empty;

        public DateTime? AppliedAt { get; set; }
        public DateTime? StatusUpdatedAt { get; set; }
        public string? Notes { get; set; }
        public bool FollowUpSent { get; set; }
        public DateTime? FollowUpSentAt { get; set; }
        public DateTime CreatedAt { get; set; }

        public JobOpportunityResponse JobOpportunity { get; set; } = null!;
        public ResumeSummary? Resume { get; set; }
        public ResumeVersionSummary? ResumeVersion { get; set; }
        public List<InterviewSummary> Interviews { get; set; } = new();
    }

    /// <summary>
    /// POST /api/applications - إنشاء طلب جديد
    /// </summary>
    public class CreateApplicationRequest
    {
        [Required]
        public int JobOpportunityId { get; set; }

        public int? ResumeId { get; set; }
        public int? ResumeVersionId { get; set; }
        public string? Notes { get; set; }
    }

    /// <summary>
    /// PATCH /api/applications/{id}/status - تغيير حالة الكانبان فقط
    /// </summary>
    public class UpdateApplicationStatusRequest
    {
        [Required]
        public ApplicationStatus Status { get; set; }
    }

    /// <summary>
    /// PATCH /api/applications/{id} - تعديل الملاحظات والمتابعة
    /// </summary>
    public class UpdateApplicationRequest
    {
        public string? Notes { get; set; }
        public bool? FollowUpSent { get; set; }
        public DateTime? AppliedAt { get; set; }
        public int? ResumeId { get; set; }
        public int? ResumeVersionId { get; set; }
    }

    // Summaries مستخدمة داخل ApplicationResponse
    public class ResumeSummary
    {
        public int Id { get; set; }
        public string Label { get; set; } = string.Empty;
    }

    public class ResumeVersionSummary
    {
        public int Id { get; set; }
        public string VersionName { get; set; } = string.Empty;
    }

    public class InterviewSummary
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime ScheduledAt { get; set; }
        public string Type { get; set; } = string.Empty;
        public string? Location { get; set; }
    }
}
