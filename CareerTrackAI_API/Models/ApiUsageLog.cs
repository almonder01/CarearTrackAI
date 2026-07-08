namespace CareerTrackAI.Models
{
    public class ApiUsageLog : BaseEntity
    {
        public int UserId { get; set; }
        public string Provider { get; set; } = string.Empty;
        public string Operation { get; set; } = string.Empty;
        public int Requests { get; set; }
        public int Matched { get; set; }
        public int Imported { get; set; }
        public int Errors { get; set; }
        public string? Message { get; set; }

        public User User { get; set; } = null!;
    }
}
