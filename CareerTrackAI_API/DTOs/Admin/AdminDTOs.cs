using System.ComponentModel.DataAnnotations;
using CareerTrackAI.DTOs.Company;
using CareerTrackAI.DTOs.JobOpportunity;

namespace CareerTrackAI.DTOs.Admin
{
    public class AdminUserResponse
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? Major { get; set; }
        public string? City { get; set; }
        public string? CareerObjective { get; set; }
        public bool NotificationsEnabled { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
    }

    public class CreateAdminRequest
    {
        [Required]
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(8, ErrorMessage = "Password must be at least 8 characters.")]
        [RegularExpression(@"^(?=.*[A-Za-z])(?=.*\d).+$", ErrorMessage = "Password must include at least one letter and one number.")]
        public string Password { get; set; } = string.Empty;
    }

    public class AdminDatabaseResponse
    {
        public List<CompanyResponse> SharedCompanies { get; set; } = new();
        public List<JobOpportunityResponse> SharedOpportunities { get; set; } = new();
    }

    public class AdminNotificationResult
    {
        public int Sent { get; set; }
        public int MatchedUsers { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class AdminNotificationPreviewResponse
    {
        public int OpportunityId { get; set; }
        public int MatchedUsers { get; set; }
        public int Threshold { get; set; }
        public bool UsedAi { get; set; }
        public DateTime CheckedAt { get; set; }
        public List<int> TargetUserIds { get; set; } = new();
        public string Message { get; set; } = string.Empty;
    }

    public class AdminNotificationPreviewAllResponse
    {
        public DateTime CheckedAt { get; set; }
        public List<AdminNotificationPreviewResponse> Results { get; set; } = new();
    }

    public class AdminNotifyRequest
    {
        public List<int>? TargetUserIds { get; set; }
    }
}
