namespace CareerTrackAI.Models
{
    /// <summary>
    /// Refresh Tokens - تُستخدم لتجديد JWT بدون إعادة تسجيل دخول
    /// لا ترث من BaseEntity - لا نحتاج Soft Delete هنا، نحذف المنتهية فعلياً
    /// </summary>
    public class RefreshToken
    {
        public int Id { get; set; }
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }

        /// <summary>
        /// null = لا يزال صالحاً
        /// قيمة = تم إلغاؤه (logout أو استخدام مشبوه)
        /// </summary>
        public DateTime? RevokedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
        public bool IsRevoked => RevokedAt != null;
        public bool IsActive => !IsExpired && !IsRevoked;

        // FK
        public int UserId { get; set; }
        public User User { get; set; } = null!;
    }
}
