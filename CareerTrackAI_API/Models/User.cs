using CareerTrackAI.Enums;

namespace CareerTrackAI.Models
{
    public class User : BaseEntity
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public UserRole Role { get; set; } = UserRole.Student;

        // يستخدمها الذكاء الاصطناعي للتوصيات
        public string? University { get; set; }
        public string? Major { get; set; }
        public string? City { get; set; }
        public int? GraduationYear { get; set; }

        public DateTime? LastLoginAt { get; set; }

        // Navigation
        public ICollection<Application> Applications { get; set; } = new List<Application>();
        public ICollection<Resume> Resumes { get; set; } = new List<Resume>();
        public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
        public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    }
}
