using System.ComponentModel.DataAnnotations;
using CareerTrackAI.DTOs.Company;
using CareerTrackAI.Enums;

namespace CareerTrackAI.DTOs.JobOpportunity
{
    public class JobOpportunityResponse
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }

        /// <summary>
        /// "Internship" أو "Job" - مفتاح الفلتر الأساسي
        /// </summary>
        public string Type { get; set; } = string.Empty;

        /// <summary>
        /// "FullTime" / "PartTime" / "Contract" - أو null للـ Internship
        /// </summary>
        public string? EmploymentType { get; set; }

        public string? Location { get; set; }
        public bool IsRemote { get; set; }
        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }
        public DateTime? ApplicationDeadline { get; set; }
        public string? RequiredSkills { get; set; }
        public string? JobUrl { get; set; }
        public bool IsActive { get; set; }
        public bool IsImported { get; set; }
        public DateTime CreatedAt { get; set; }

        public CompanySummary Company { get; set; } = null!;
    }

    /// <summary>
    /// Admin فقط - POST /api/job-opportunities
    /// </summary>
    public class CreateJobOpportunityRequest
    {
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required]
        public OpportunityType Type { get; set; }

        public EmploymentType? EmploymentType { get; set; }

        [MaxLength(200)]
        public string? Location { get; set; }

        public bool IsRemote { get; set; } = false;

        [Range(0, double.MaxValue)]
        public decimal? SalaryMin { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? SalaryMax { get; set; }

        public DateTime? ApplicationDeadline { get; set; }

        public string? RequiredSkills { get; set; }

        [MaxLength(500)]
        [Url]
        public string? JobUrl { get; set; }

        [Required]
        public int CompanyId { get; set; }
    }

    /// <summary>
    /// Admin فقط - PUT /api/job-opportunities/{id}
    /// </summary>
    public class UpdateJobOpportunityRequest
    {
        [MaxLength(200)]
        public string? Title { get; set; }

        public string? Description { get; set; }
        public EmploymentType? EmploymentType { get; set; }

        [MaxLength(200)]
        public string? Location { get; set; }

        public bool? IsRemote { get; set; }
        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }
        public DateTime? ApplicationDeadline { get; set; }
        public string? RequiredSkills { get; set; }

        [MaxLength(500)]
        public string? JobUrl { get; set; }

        public bool? IsActive { get; set; }
    }
}
