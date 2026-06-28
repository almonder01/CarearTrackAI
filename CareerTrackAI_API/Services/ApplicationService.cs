using CareerTrackAI.Data;
using CareerTrackAI.DTOs.Application;
using CareerTrackAI.Enums;
using CareerTrackAI.Models;
using Microsoft.EntityFrameworkCore;

namespace CareerTrackAI.Services
{
    public interface IApplicationService
    {
        Task<List<ApplicationResponse>> GetAllAsync(int userId, ApplicationStatus? status);
        Task<ApplicationResponse?> GetByIdAsync(int id, int userId);
        Task<ApplicationResponse> CreateAsync(int userId, CreateApplicationRequest request);
        Task<ApplicationResponse?> UpdateStatusAsync(int id, int userId, UpdateApplicationStatusRequest request);
        Task<ApplicationResponse?> UpdateAsync(int id, int userId, UpdateApplicationRequest request);
        Task<bool> DeleteAsync(int id, int userId);
    }

    public class ApplicationService : IApplicationService
    {
        private readonly AppDbContext _db;

        public ApplicationService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<List<ApplicationResponse>> GetAllAsync(int userId, ApplicationStatus? status)
        {
            var query = _db.Applications
                .Where(a => a.UserId == userId)
                .Include(a => a.JobOpportunity).ThenInclude(j => j.Company)
                .Include(a => a.Resume)
                .Include(a => a.ResumeVersion)
                .Include(a => a.Interviews)
                .AsQueryable();

            if (status.HasValue)
                query = query.Where(a => a.Status == status.Value);

            var applications = await query
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

            return applications.Select(MapToResponse).ToList();
        }

        public async Task<ApplicationResponse?> GetByIdAsync(int id, int userId)
        {
            var application = await _db.Applications
                .Where(a => a.Id == id && a.UserId == userId)
                .Include(a => a.JobOpportunity).ThenInclude(j => j.Company)
                .Include(a => a.Resume)
                .Include(a => a.ResumeVersion)
                .Include(a => a.Interviews)
                .FirstOrDefaultAsync();

            return application == null ? null : MapToResponse(application);
        }

        public async Task<ApplicationResponse> CreateAsync(int userId, CreateApplicationRequest request)
        {
            var job = await _db.JobOpportunities.FirstOrDefaultAsync(j => j.Id == request.JobOpportunityId && (j.UserId == userId || j.UserId == null));
            if (job == null)
                throw new InvalidOperationException("Opportunity is not available in this workspace.");

            var application = new Application
            {
                UserId = userId,
                JobOpportunityId = request.JobOpportunityId,
                ResumeId = request.ResumeId,
                ResumeVersionId = request.ResumeVersionId,
                Notes = request.Notes,
                Status = ApplicationStatus.Planning
            };

            _db.Applications.Add(application);
            await _db.SaveChangesAsync();

            // نعيد جلبه مع العلاقات كاملة
            return (await GetByIdAsync(application.Id, userId))!;
        }

        public async Task<ApplicationResponse?> UpdateStatusAsync(int id, int userId, UpdateApplicationStatusRequest request)
        {
            var application = await _db.Applications
                .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

            if (application == null) return null;

            application.Status = request.Status;
            application.StatusUpdatedAt = DateTime.UtcNow;
            application.UpdatedAt = DateTime.UtcNow;

            // نسجل وقت التقديم الفعلي لما ينتقل من Planning لـ Applied
            if (request.Status == ApplicationStatus.Applied && application.AppliedAt == null)
                application.AppliedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return await GetByIdAsync(id, userId);
        }

        public async Task<ApplicationResponse?> UpdateAsync(int id, int userId, UpdateApplicationRequest request)
        {
            var application = await _db.Applications
                .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

            if (application == null) return null;

            if (request.Notes != null) application.Notes = request.Notes;
            if (request.AppliedAt.HasValue) application.AppliedAt = request.AppliedAt;
            if (request.ResumeId.HasValue) application.ResumeId = request.ResumeId;
            if (request.ResumeVersionId.HasValue) application.ResumeVersionId = request.ResumeVersionId;

            if (request.FollowUpSent.HasValue)
            {
                application.FollowUpSent = request.FollowUpSent.Value;
                if (request.FollowUpSent.Value && application.FollowUpSentAt == null)
                    application.FollowUpSentAt = DateTime.UtcNow;
            }

            application.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return await GetByIdAsync(id, userId);
        }

        public async Task<bool> DeleteAsync(int id, int userId)
        {
            var application = await _db.Applications
                .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

            if (application == null) return false;

            // Soft Delete
            application.IsDeleted = true;
            application.DeletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return true;
        }

        // ==================== MAPPER ====================
        private static ApplicationResponse MapToResponse(Application a) => new()
        {
            Id = a.Id,
            Status = a.Status.ToString(),
            AppliedAt = a.AppliedAt,
            StatusUpdatedAt = a.StatusUpdatedAt,
            Notes = a.Notes,
            FollowUpSent = a.FollowUpSent,
            FollowUpSentAt = a.FollowUpSentAt,
            CreatedAt = a.CreatedAt,
            JobOpportunity = new DTOs.JobOpportunity.JobOpportunityResponse
            {
                Id = a.JobOpportunity.Id,
                UserId = a.JobOpportunity.UserId,
                Title = a.JobOpportunity.Title,
                Description = a.JobOpportunity.Description,
                Type = a.JobOpportunity.Type.ToString(),
                EmploymentType = a.JobOpportunity.EmploymentType?.ToString(),
                Location = a.JobOpportunity.Location,
                IsRemote = a.JobOpportunity.IsRemote,
                SalaryMin = a.JobOpportunity.SalaryMin,
                SalaryMax = a.JobOpportunity.SalaryMax,
                ApplicationDeadline = a.JobOpportunity.ApplicationDeadline,
                RequiredSkills = a.JobOpportunity.RequiredSkills,
                JobUrl = a.JobOpportunity.JobUrl,
                SourceUrl = a.JobOpportunity.SourceUrl,
                SourceProvider = a.JobOpportunity.SourceProvider,
                IsActive = a.JobOpportunity.IsActive,
                IsImported = a.JobOpportunity.IsImported,
                IsShared = a.JobOpportunity.UserId == null,
                CreatedAt = a.JobOpportunity.CreatedAt,
                Company = new DTOs.Company.CompanySummary
                {
                    Id = a.JobOpportunity.Company.Id,
                    UserId = a.JobOpportunity.Company.UserId,
                    Name = a.JobOpportunity.Company.Name,
                    Industry = a.JobOpportunity.Company.Industry,
                    City = a.JobOpportunity.Company.City,
                    Country = a.JobOpportunity.Company.Country,
                    Website = a.JobOpportunity.Company.Website,
                    LogoUrl = a.JobOpportunity.Company.LogoUrl,
                    SourceProvider = a.JobOpportunity.Company.SourceProvider,
                    IsShared = a.JobOpportunity.Company.UserId == null
                }
            },
            Resume = a.Resume == null ? null : new ResumeSummary
            {
                Id = a.Resume.Id,
                Label = a.Resume.Label
            },
            ResumeVersion = a.ResumeVersion == null ? null : new ResumeVersionSummary
            {
                Id = a.ResumeVersion.Id,
                VersionName = a.ResumeVersion.VersionName
            },
            Interviews = a.Interviews.Select(i => new InterviewSummary
            {
                Id = i.Id,
                Title = i.Title,
                ScheduledAt = i.ScheduledAt,
                Type = i.Type.ToString(),
                Location = i.Location
            }).ToList()
        };
    }
}
