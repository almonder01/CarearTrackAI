using Microsoft.EntityFrameworkCore;
using CareerTrackAI.Models;
using CareerTrackAI.Enums;

namespace CareerTrackAI.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Company> Companies { get; set; }
        public DbSet<JobOpportunity> JobOpportunities { get; set; }
        public DbSet<Application> Applications { get; set; }
        public DbSet<Resume> Resumes { get; set; }
        public DbSet<ResumeVersion> ResumeVersions { get; set; }
        public DbSet<Interview> Interviews { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ==================== GLOBAL SOFT DELETE FILTERS ====================
            // تسري على كل query تلقائياً - للوصول للمحذوفات: .IgnoreQueryFilters()
            modelBuilder.Entity<User>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<Company>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<JobOpportunity>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<Application>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<Resume>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<ResumeVersion>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<Interview>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<Notification>().HasQueryFilter(e => !e.IsDeleted);

            // ==================== USER ====================
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasIndex(u => u.Email).IsUnique();
                entity.Property(u => u.Email).IsRequired().HasMaxLength(255);
                entity.Property(u => u.FullName).IsRequired().HasMaxLength(150);
                entity.Property(u => u.PasswordHash).IsRequired();
                entity.Property(u => u.Role)
                      .HasConversion<string>()
                      .HasDefaultValue(UserRole.Student);
            });

            // ==================== REFRESH TOKEN ====================
            modelBuilder.Entity<RefreshToken>(entity =>
            {
                entity.HasKey(r => r.Id);
                entity.HasIndex(r => r.Token).IsUnique();
                entity.Property(r => r.Token).IsRequired();

                entity.HasOne(r => r.User)
                      .WithMany(u => u.RefreshTokens)
                      .HasForeignKey(r => r.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // ==================== COMPANY ====================
            modelBuilder.Entity<Company>(entity =>
            {
                entity.Property(c => c.Name).IsRequired().HasMaxLength(200);
                entity.Property(c => c.Website).HasMaxLength(500);
                entity.Property(c => c.Email).HasMaxLength(255);
                // Index للبحث والفلتر الجغرافي
                entity.HasIndex(c => c.Country);
                entity.HasIndex(c => c.City);
                entity.HasIndex(c => c.Industry);
            });

            // ==================== JOB OPPORTUNITY ====================
            modelBuilder.Entity<JobOpportunity>(entity =>
            {
                entity.Property(j => j.Title).IsRequired().HasMaxLength(200);
                entity.Property(j => j.Type).HasConversion<string>();
                entity.Property(j => j.EmploymentType).HasConversion<string>();

                entity.HasIndex(j => j.Type);
                entity.HasIndex(j => j.IsActive);
                entity.HasIndex(j => j.ApplicationDeadline);

                entity.HasOne(j => j.Company)
                      .WithMany(c => c.JobOpportunities)
                      .HasForeignKey(j => j.CompanyId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // ==================== APPLICATION ====================
            modelBuilder.Entity<Application>(entity =>
            {
                entity.Property(a => a.Status)
                      .HasConversion<string>()
                      .HasDefaultValue(ApplicationStatus.Planning);

                // Unique: مستخدم واحد لا يقدم على نفس الفرصة مرتين
                entity.HasIndex(a => new { a.UserId, a.JobOpportunityId }).IsUnique();
                entity.HasIndex(a => a.Status);

                entity.HasOne(a => a.User)
                      .WithMany(u => u.Applications)
                      .HasForeignKey(a => a.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(a => a.JobOpportunity)
                      .WithMany(j => j.Applications)
                      .HasForeignKey(a => a.JobOpportunityId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(a => a.Resume)
                      .WithMany(r => r.Applications)
                      .HasForeignKey(a => a.ResumeId)
                      .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(a => a.ResumeVersion)
                      .WithMany()
                      .HasForeignKey(a => a.ResumeVersionId)
                      .OnDelete(DeleteBehavior.SetNull);
            });

            // ==================== RESUME ====================
            modelBuilder.Entity<Resume>(entity =>
            {
                entity.Property(r => r.Label).IsRequired().HasMaxLength(150);
                entity.Property(r => r.FileUrl).IsRequired();

                entity.HasOne(r => r.User)
                      .WithMany(u => u.Resumes)
                      .HasForeignKey(r => r.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // ==================== RESUME VERSION ====================
            modelBuilder.Entity<ResumeVersion>(entity =>
            {
                entity.Property(rv => rv.VersionName).IsRequired().HasMaxLength(200);
                entity.Property(rv => rv.FileUrl).IsRequired();

                entity.HasOne(rv => rv.Resume)
                      .WithMany(r => r.Versions)
                      .HasForeignKey(rv => rv.ResumeId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(rv => rv.TargetCompany)
                      .WithMany()
                      .HasForeignKey(rv => rv.TargetCompanyId)
                      .OnDelete(DeleteBehavior.SetNull);
            });

            // ==================== INTERVIEW ====================
            modelBuilder.Entity<Interview>(entity =>
            {
                entity.Property(i => i.Title).IsRequired().HasMaxLength(200);
                entity.Property(i => i.Type).HasConversion<string>();
                entity.HasIndex(i => i.ScheduledAt);

                entity.HasOne(i => i.Application)
                      .WithMany(a => a.Interviews)
                      .HasForeignKey(i => i.ApplicationId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // ==================== NOTIFICATION ====================
            modelBuilder.Entity<Notification>(entity =>
            {
                entity.Property(n => n.Title).IsRequired().HasMaxLength(200);
                entity.Property(n => n.Message).IsRequired();
                entity.Property(n => n.Type).HasConversion<string>();
                entity.HasIndex(n => new { n.UserId, n.IsRead });
                entity.HasIndex(n => n.ExpiresAt);

                entity.HasOne(n => n.User)
                      .WithMany(u => u.Notifications)
                      .HasForeignKey(n => n.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
