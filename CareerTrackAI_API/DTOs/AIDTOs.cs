using System.ComponentModel.DataAnnotations;

namespace CareerTrackAI.DTOs.AI
{
    public class ChatRequest
    {
        [Required]
        public string Message { get; set; } = string.Empty;

        /// <summary>
        /// تاريخ المحادثة - الفرونت اند يرسله كاملاً في كل request
        /// </summary>
        public List<ChatMessage> History { get; set; } = new();
    }

    public class ChatMessage
    {
        public string Role { get; set; } = string.Empty;  // "user" or "model"
        public string Content { get; set; } = string.Empty;
    }

    public class ChatResponse
    {
        public string Reply { get; set; } = string.Empty;
    }

    public class AnalyzeResumeResponse
    {
        public List<string> Strengths { get; set; } = new();
        public List<string> Weaknesses { get; set; } = new();
        public List<string> MissingSkills { get; set; } = new();
        public List<string> Suggestions { get; set; } = new();
        public int OverallScore { get; set; }  // 0-100
    }

    public class GenerateCoverLetterRequest
    {
        [Required]
        public int JobOpportunityId { get; set; }

        public int? ResumeId { get; set; }

        /// <summary>
        /// تعليمات إضافية - مثال: "اجعلها رسمية" أو "ركّز على مهارات Python"
        /// </summary>
        public string? AdditionalNotes { get; set; }
    }

    public class GenerateCoverLetterResponse
    {
        public string CoverLetter { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;  // موضوع الإيميل
    }

    public class RecommendationsResponse
    {
        public List<string> CompaniesToFollow { get; set; } = new();
        public List<string> SkillsToLearn { get; set; } = new();
        public List<string> ApplicationTips { get; set; } = new();
        public string Summary { get; set; } = string.Empty;
    }

    public class AiPingResponse
    {
        public bool Success { get; set; }
        public string Provider { get; set; } = "Gemini";
        public string Model { get; set; } = string.Empty;
        public string Mode { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? Reply { get; set; }
    }
}
