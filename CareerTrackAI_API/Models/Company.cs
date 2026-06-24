namespace CareerTrackAI.Models
{
    /// <summary>
    /// شركة - كيان عام مشترك بين جميع المستخدمين
    /// Admin فقط يضيف شركات أو تُستورد من AI
    /// </summary>
    public class Company : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string? Industry { get; set; }
        public string? Description { get; set; }
        public string? City { get; set; }       // يستخدمها AI: "أفضل الشركات القريبة مني"
        public string? Country { get; set; }
        public string? Website { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? LinkedInUrl { get; set; }
        public string? LogoUrl { get; set; }

        // AI import fields
        public bool IsImported { get; set; } = false;
        public DateTime? ImportedAt { get; set; }
        public string? SourceUrl { get; set; }

        // Navigation
        public ICollection<JobOpportunity> JobOpportunities { get; set; } = new List<JobOpportunity>();
    }
}
