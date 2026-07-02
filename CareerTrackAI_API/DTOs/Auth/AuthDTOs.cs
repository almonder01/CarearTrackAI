using System.ComponentModel.DataAnnotations;

namespace CareerTrackAI.DTOs.Auth
{
    public class RegisterRequest
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

        public string? University { get; set; }
        public string? Major { get; set; }
        public string? City { get; set; }
        public int? GraduationYear { get; set; }
        [MaxLength(1000)]
        public string? CareerObjective { get; set; }
    }

    public class LoginRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }

    public class RefreshTokenRequest
    {
        [Required]
        public string RefreshToken { get; set; } = string.Empty;
    }

    public class AuthResponse
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public AuthUserInfo User { get; set; } = null!;
    }

    /// <summary>
    /// بيانات المستخدم المرفقة مع كل Auth response - مختصرة عن قصد
    /// </summary>
    public class AuthUserInfo
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public bool NotificationsEnabled { get; set; }
        public string? CareerObjective { get; set; }
    }
}
