using System.ComponentModel.DataAnnotations;

namespace CareerTrackAI.DTOs.User
{
    /// <summary>
    /// ما يستقبله الفرونت اند من GET /api/users/me
    /// </summary>
    public class UserResponse
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? University { get; set; }
        public string? Major { get; set; }
        public string? City { get; set; }
        public int? GraduationYear { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// PUT /api/users/me - المستخدم يعدّل بياناته الشخصية فقط
    /// Email وRole لا يتغيران من هنا
    /// </summary>
    public class UpdateUserRequest
    {
        [Required]
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? University { get; set; }

        [MaxLength(200)]
        public string? Major { get; set; }

        [MaxLength(100)]
        public string? City { get; set; }

        [Range(2000, 2100)]
        public int? GraduationYear { get; set; }
    }
}
