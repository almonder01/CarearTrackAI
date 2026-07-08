using System.ComponentModel.DataAnnotations;

namespace CareerTrackAI.DTOs.Resume
{
    public class ResumeResponse
    {
        public int Id { get; set; }
        public string Label { get; set; } = string.Empty;
        public string FileUrl { get; set; } = string.Empty;
        public string? FileType { get; set; }
        public DateTime? LastUsedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<ResumeVersionResponse> Versions { get; set; } = new();
    }

    public class ResumeVersionResponse
    {
        public int Id { get; set; }
        public string VersionName { get; set; } = string.Empty;
        public string FileUrl { get; set; } = string.Empty;
        public string? FileType { get; set; }
        public bool IsAiGenerated { get; set; }
        public int? TargetCompanyId { get; set; }
        public string? TargetCompanyName { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateResumeRequest
    {
        [Required]
        [MaxLength(150)]
        public string Label { get; set; } = string.Empty;
    }

    public class CreateAiResumeVersionRequest
    {
        public int? JobOpportunityId { get; set; }
        public int? TargetCompanyId { get; set; }

        [MaxLength(180)]
        public string? TargetRole { get; set; }

        [MaxLength(200)]
        public string? VersionName { get; set; }

        [MaxLength(1000)]
        public string? AdditionalInstructions { get; set; }
    }

    public class CreateAiResumeVersionResponse
    {
        public ResumeVersionResponse? Version { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? Preview { get; set; }
    }
}
