using CareerTrackAI.Enums;

namespace CareerTrackAI.Models
{
    public class Application : BaseEntity
    {
        public ApplicationStatus Status { get; set; } = ApplicationStatus.Planning;
        public DateTime? StatusUpdatedAt { get; set; }

        /// <summary>
        /// وقت الضغط على "قدّمت" - مستقل عن CreatedAt
        /// المستخدم قد ينشئ البطاقة قبل أسبوعين ثم يقدم اليوم
        /// </summary>
        public DateTime? AppliedAt { get; set; }

        public string? Notes { get; set; }
        public bool FollowUpSent { get; set; } = false;
        public DateTime? FollowUpSentAt { get; set; }

        // FKs
        public int UserId { get; set; }
        public User User { get; set; } = null!;

        public int JobOpportunityId { get; set; }
        public JobOpportunity JobOpportunity { get; set; } = null!;

        public int? ResumeId { get; set; }
        public Resume? Resume { get; set; }

        public int? ResumeVersionId { get; set; }
        public ResumeVersion? ResumeVersion { get; set; }

        // Navigation
        public ICollection<Interview> Interviews { get; set; } = new List<Interview>();
    }
}
