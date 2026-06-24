namespace CareerTrackAI.Models
{
    /// <summary>
    /// السيرة الذاتية الأصلية - لا تُعدَّل أبداً
    /// كل تخصيص يذهب إلى ResumeVersion
    /// </summary>
    public class Resume : BaseEntity
    {
        public string Label { get; set; } = string.Empty;
        public string FileUrl { get; set; } = string.Empty;
        public string? FileType { get; set; }

        /// <summary>
        /// نص السيرة الذاتية المستخرج - يستخدمه AI للتحليل والتخصيص
        /// </summary>
        public string? ParsedContent { get; set; }

        public DateTime? LastUsedAt { get; set; }

        // FK
        public int UserId { get; set; }
        public User User { get; set; } = null!;

        // Navigation
        public ICollection<ResumeVersion> Versions { get; set; } = new List<ResumeVersion>();
        public ICollection<Application> Applications { get; set; } = new List<Application>();
    }

    /// <summary>
    /// نسخة AI مخصصة من السيرة لشركة معينة
    /// </summary>
    public class ResumeVersion : BaseEntity
    {
        public string VersionName { get; set; } = string.Empty;  // "CV for STC - Jun 2025"
        public string FileUrl { get; set; } = string.Empty;
        public string? FileType { get; set; }
        public bool IsAiGenerated { get; set; } = true;

        /// <summary>
        /// الشركة التي خُصصت لها هذه النسخة
        /// اختياري - قد تكون نسخة عامة بدون شركة محددة
        /// </summary>
        public int? TargetCompanyId { get; set; }
        public Company? TargetCompany { get; set; }

        // FK للسيرة الأصل
        public int ResumeId { get; set; }
        public Resume Resume { get; set; } = null!;
    }
}
