using CareerTrackAI.Data;
using CareerTrackAI.DTOs.Company;
using CareerTrackAI.DTOs.JobOpportunity;
using CareerTrackAI.Enums;
using CareerTrackAI.Models;
using Microsoft.EntityFrameworkCore;

namespace CareerTrackAI.Services
{
    public interface IJobOpportunityService
    {
        Task<List<JobOpportunityResponse>> GetAllAsync(int userId, OpportunityType? type, EmploymentType? employmentType, int? companyId, bool includeShared);
        Task<JobOpportunityResponse?> GetByIdAsync(int id, int userId, bool includeShared = false);
        Task<JobOpportunityResponse> CreateAsync(int userId, CreateJobOpportunityRequest request);
        Task<JobOpportunityResponse?> UpdateAsync(int id, int userId, UpdateJobOpportunityRequest request);
        Task<bool> DeleteAsync(int id, int userId);
        Task<DeleteAllOpportunitiesResult> DeleteAllAsync(int userId);
    }

    public record DeleteAllOpportunitiesResult(int OpportunitiesDeleted, int ApplicationsDeleted, int InterviewsDeleted);

    public class JobOpportunityService : IJobOpportunityService
    {
        private readonly AppDbContext _db;

        public JobOpportunityService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<List<JobOpportunityResponse>> GetAllAsync(int userId, OpportunityType? type, EmploymentType? employmentType, int? companyId, bool includeShared)
        {
            var query = _db.JobOpportunities
                .Include(j => j.Company)
                .Where(j => j.UserId == userId || (includeShared && j.UserId == null))
                .AsQueryable();

            if (type.HasValue)
                query = query.Where(j => j.Type == type.Value);

            if (employmentType.HasValue)
                query = query.Where(j => j.EmploymentType == employmentType.Value);

            if (companyId.HasValue)
                query = query.Where(j => j.CompanyId == companyId.Value);

            var jobs = await query.OrderByDescending(j => j.CreatedAt).ToListAsync();
            return jobs.Select(MapToResponse).ToList();
        }

        public async Task<JobOpportunityResponse?> GetByIdAsync(int id, int userId, bool includeShared = false)
        {
            var job = await _db.JobOpportunities
                .Include(j => j.Company)
                .FirstOrDefaultAsync(j => j.Id == id && (j.UserId == userId || (includeShared && j.UserId == null)));

            return job == null ? null : MapToResponse(job);
        }

        public async Task<JobOpportunityResponse> CreateAsync(int userId, CreateJobOpportunityRequest request)
        {
            var job = new JobOpportunity
            {
                UserId = userId,
                Title = request.Title,
                Description = request.Description,
                Type = request.Type,
                EmploymentType = request.EmploymentType,
                Location = request.Location,
                IsRemote = request.IsRemote,
                SalaryMin = request.SalaryMin,
                SalaryMax = request.SalaryMax,
                ApplicationDeadline = request.ApplicationDeadline,
                RequiredSkills = request.RequiredSkills,
                JobUrl = request.JobUrl,
                CompanyId = request.CompanyId
            };

            _db.JobOpportunities.Add(job);
            await _db.SaveChangesAsync();

            return (await GetByIdAsync(job.Id, userId))!;
        }

        public async Task<JobOpportunityResponse?> UpdateAsync(int id, int userId, UpdateJobOpportunityRequest request)
        {
            var job = await _db.JobOpportunities.FirstOrDefaultAsync(j => j.Id == id && j.UserId == userId);
            if (job == null) return null;

            if (request.Title != null) job.Title = request.Title;
            if (request.Description != null) job.Description = request.Description;
            if (request.EmploymentType.HasValue) job.EmploymentType = request.EmploymentType;
            if (request.Location != null) job.Location = request.Location;
            if (request.IsRemote.HasValue) job.IsRemote = request.IsRemote.Value;
            if (request.SalaryMin.HasValue) job.SalaryMin = request.SalaryMin;
            if (request.SalaryMax.HasValue) job.SalaryMax = request.SalaryMax;
            if (request.ApplicationDeadline.HasValue) job.ApplicationDeadline = request.ApplicationDeadline;
            if (request.RequiredSkills != null) job.RequiredSkills = request.RequiredSkills;
            if (request.JobUrl != null) job.JobUrl = request.JobUrl;
            if (request.IsActive.HasValue) job.IsActive = request.IsActive.Value;

            job.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return await GetByIdAsync(id, userId);
        }

        public async Task<bool> DeleteAsync(int id, int userId)
        {
            var job = await _db.JobOpportunities.FirstOrDefaultAsync(j => j.Id == id && j.UserId == userId);
            if (job == null) return false;

            await SoftDeleteLinkedRowsAsync(new List<int> { job.Id }, userId);
            job.IsDeleted = true;
            job.DeletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<DeleteAllOpportunitiesResult> DeleteAllAsync(int userId)
        {
            var jobs = await _db.JobOpportunities
                .Where(j => j.UserId == userId)
                .ToListAsync();

            if (jobs.Count == 0)
                return new DeleteAllOpportunitiesResult(0, 0, 0);

            var now = DateTime.UtcNow;
            var jobIds = jobs.Select(j => j.Id).ToList();
            var linkedCounts = await SoftDeleteLinkedRowsAsync(jobIds, userId);

            foreach (var job in jobs)
            {
                job.IsDeleted = true;
                job.DeletedAt = now;
                job.UpdatedAt = now;
            }

            await _db.SaveChangesAsync();
            return new DeleteAllOpportunitiesResult(jobs.Count, linkedCounts.ApplicationsDeleted, linkedCounts.InterviewsDeleted);
        }

        private async Task<(int ApplicationsDeleted, int InterviewsDeleted)> SoftDeleteLinkedRowsAsync(List<int> jobIds, int userId)
        {
            var now = DateTime.UtcNow;
            var applications = await _db.Applications
                .Where(a => a.UserId == userId && jobIds.Contains(a.JobOpportunityId))
                .ToListAsync();
            var applicationIds = applications.Select(a => a.Id).ToList();
            var interviews = applicationIds.Count == 0
                ? new List<Interview>()
                : await _db.Interviews
                    .Where(i => applicationIds.Contains(i.ApplicationId))
                    .ToListAsync();

            foreach (var interview in interviews)
            {
                interview.IsDeleted = true;
                interview.DeletedAt = now;
                interview.UpdatedAt = now;
            }

            foreach (var application in applications)
            {
                application.IsDeleted = true;
                application.DeletedAt = now;
                application.UpdatedAt = now;
            }

            return (applications.Count, interviews.Count);
        }

        private static JobOpportunityResponse MapToResponse(JobOpportunity j) => new()
        {
            Id = j.Id,
            UserId = j.UserId,
            Title = j.Title,
            Description = j.Description,
            Type = j.Type.ToString(),
            EmploymentType = j.EmploymentType?.ToString(),
            Location = j.Location,
            IsRemote = j.IsRemote,
            SalaryMin = j.SalaryMin,
            SalaryMax = j.SalaryMax,
            ApplicationDeadline = j.ApplicationDeadline,
            RequiredSkills = j.RequiredSkills,
            JobUrl = j.JobUrl,
            SourceUrl = j.SourceUrl,
            SourceProvider = j.SourceProvider,
            IsActive = j.IsActive,
            IsImported = j.IsImported,
            IsShared = j.UserId == null,
            CreatedAt = j.CreatedAt,
            Company = new CompanySummary
            {
                Id = j.Company.Id,
                UserId = j.Company.UserId,
                Name = j.Company.Name,
                Industry = j.Company.Industry,
                City = j.Company.City,
                Country = j.Company.Country,
                Website = j.Company.Website,
                LogoUrl = j.Company.LogoUrl,
                SourceProvider = j.Company.SourceProvider,
                IsShared = j.Company.UserId == null
            }
        };
    }
}
