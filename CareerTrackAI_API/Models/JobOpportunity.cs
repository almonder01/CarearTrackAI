using CareerTrackAI.Enums;

namespace CareerTrackAI.Models
{
    public class JobOpportunity : BaseEntity
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }

        /// <summary>
        /// Internship أو Job - هذا مفتاح الفلتر الأساسي في الفرونت اند
        /// </summary>
        public OpportunityType Type { get; set; }

        /// <summary>
        /// FullTime / PartTime / Contract - ينطبق على Job، اختياري على Internship
        /// </summary>
        public EmploymentType? EmploymentType { get; set; }

        public string? Location { get; set; }
        public bool IsRemote { get; set; } = false;
        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }
        public DateTime? ApplicationDeadline { get; set; }
        public string? RequiredSkills { get; set; }  // JSON string
        public string? JobUrl { get; set; }

        // AI import
        public bool IsImported { get; set; } = false;
        public DateTime? ImportedAt { get; set; }
        public string? SourceUrl { get; set; }

        /// <summary>
        /// false بعد انتهاء Deadline أو بقرار Admin
        /// </summary>
        public bool IsActive { get; set; } = true;

        // FK
        public int CompanyId { get; set; }
        public Company Company { get; set; } = null!;

        // Navigation
        public ICollection<Application> Applications { get; set; } = new List<Application>();
    }
}
