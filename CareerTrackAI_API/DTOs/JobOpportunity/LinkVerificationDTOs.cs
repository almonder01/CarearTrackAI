namespace CareerTrackAI.DTOs.JobOpportunity
{
    public class VerifyOpportunityLinkRequest
    {
        public string? Url { get; set; }
        public string? Title { get; set; }
        public string? CompanyName { get; set; }
    }

    public class LinkVerificationResponse
    {
        public string Status { get; set; } = "Unknown";
        public string Message { get; set; } = string.Empty;
        public string? CheckedUrl { get; set; }
        public string? FinalUrl { get; set; }
        public int? StatusCode { get; set; }
        public bool IsReachable { get; set; }
        public bool IsLikelyApplicationLink { get; set; }
        public bool TimedOut { get; set; }
        public DateTime CheckedAt { get; set; } = DateTime.UtcNow;
    }
}
