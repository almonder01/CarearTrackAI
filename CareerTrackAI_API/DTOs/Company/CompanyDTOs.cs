using System.ComponentModel.DataAnnotations;

namespace CareerTrackAI.DTOs.Company
{
    public class CompanyResponse
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Industry { get; set; }
        public string? Description { get; set; }
        public string? City { get; set; }
        public string? Country { get; set; }
        public string? Website { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? LinkedInUrl { get; set; }
        public string? LogoUrl { get; set; }
        public bool IsImported { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// نسخة مختصرة تُستخدم داخل responses أخرى مثل JobOpportunityResponse
    /// </summary>
    public class CompanySummary
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Industry { get; set; }
        public string? City { get; set; }
        public string? Country { get; set; }
        public string? LogoUrl { get; set; }
    }

    /// <summary>
    /// Admin فقط - POST /api/companies
    /// </summary>
    public class CreateCompanyRequest
    {
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? Industry { get; set; }

        public string? Description { get; set; }

        [MaxLength(100)]
        public string? City { get; set; }

        [MaxLength(100)]
        public string? Country { get; set; }

        [MaxLength(500)]
        [Url]
        public string? Website { get; set; }

        [MaxLength(255)]
        [EmailAddress]
        public string? Email { get; set; }

        [MaxLength(50)]
        public string? Phone { get; set; }

        [MaxLength(500)]
        public string? LinkedInUrl { get; set; }

        [MaxLength(500)]
        public string? LogoUrl { get; set; }
    }

    /// <summary>
    /// Admin فقط - PUT /api/companies/{id}
    /// نفس الحقول لكن كلها اختيارية
    /// </summary>
    public class UpdateCompanyRequest
    {
        [MaxLength(200)]
        public string? Name { get; set; }

        [MaxLength(100)]
        public string? Industry { get; set; }

        public string? Description { get; set; }

        [MaxLength(100)]
        public string? City { get; set; }

        [MaxLength(100)]
        public string? Country { get; set; }

        [MaxLength(500)]
        public string? Website { get; set; }

        [MaxLength(255)]
        [EmailAddress]
        public string? Email { get; set; }

        [MaxLength(50)]
        public string? Phone { get; set; }

        [MaxLength(500)]
        public string? LinkedInUrl { get; set; }

        [MaxLength(500)]
        public string? LogoUrl { get; set; }
    }
}
