namespace CareerTrackAI.Models
{
    public class GeminiUsageLog : BaseEntity
    {
        public int UserId { get; set; }
        public string Feature { get; set; } = string.Empty;
        public int PromptTokens { get; set; }
        public int OutputTokens { get; set; }
        public int TotalTokens { get; set; }
        public string Model { get; set; } = string.Empty;

        public User User { get; set; } = null!;
    }
}
