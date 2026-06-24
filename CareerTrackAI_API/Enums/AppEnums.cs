namespace CareerTrackAI.Enums
{
    /// <summary>
    /// نوع الحساب
    /// </summary>
    public enum UserRole
    {
        Student = 1,
        Admin = 2
    }

    /// <summary>
    /// نوع الفرصة - الفصل الأساسي في الفلتر
    /// </summary>
    public enum OpportunityType
    {
        Internship = 1,   // تدريب
        Job = 2           // توظيف
    }

    /// <summary>
    /// نوع التوظيف - مستقل عن نوع الفرصة
    /// ينطبق على Job فقط، اختياري على Internship
    /// </summary>
    public enum EmploymentType
    {
        FullTime = 1,
        PartTime = 2,
        Contract = 3
    }

    /// <summary>
    /// مراحل الطلب - مطابق لأعمدة Kanban Board
    /// </summary>
    public enum ApplicationStatus
    {
        Planning = 1,
        Applied = 2,
        Interview = 3,
        Accepted = 4,
        Rejected = 5
    }

    /// <summary>
    /// نوع المقابلة
    /// </summary>
    public enum InterviewType
    {
        Online = 1,
        OnSite = 2,
        Phone = 3
    }

    /// <summary>
    /// نوع الإشعار
    /// </summary>
    public enum NotificationType
    {
        DeadlineReminder = 1,
        InterviewReminder = 2,
        StatusUpdate = 3,
        AIRecommendation = 4
    }
}
