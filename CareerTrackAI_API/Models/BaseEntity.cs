namespace CareerTrackAI.Models
{
    /// <summary>
    /// الكلاس الأساسي لجميع الكيانات
    /// كل model يرث منه تلقائياً يحصل على CreatedAt, UpdatedAt, IsDeleted
    /// </summary>
    public abstract class BaseEntity
    {
        public int Id { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        /// <summary>
        /// Soft Delete - لا نحذف من قاعدة البيانات أبداً
        /// Global Query Filter في AppDbContext يُخفيها تلقائياً
        /// </summary>
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
    }
}
