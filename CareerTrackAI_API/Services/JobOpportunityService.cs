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
        Task<List<JobOpportunityResponse>> GetAllAsync(OpportunityType? type, EmploymentType? employmentType, int? companyId);
        Task<JobOpportunityResponse?> GetByIdAsync(int id);
        Task<JobOpportunityResponse> CreateAsync(CreateJobOpportunityRequest request);
        Task<JobOpportunityResponse?> UpdateAsync(int id, UpdateJobOpportunityRequest request);
        Task<bool> DeleteAsync(int id);
    }

    public class JobOpportunityService : IJobOpportunityService
    {
        private readonly AppDbContext _db;

        public JobOpportunityService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<List<JobOpportunityResponse>> GetAllAsync(OpportunityType? type, EmploymentType? employmentType, int? companyId)
        {
            var query = _db.JobOpportunities
                .Include(j => j.Company)
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

        public async Task<JobOpportunityResponse?> GetByIdAsync(int id)
        {
            var job = await _db.JobOpportunities
                .Include(j => j.Company)
                .FirstOrDefaultAsync(j => j.Id == id);

            return job == null ? null : MapToResponse(job);
        }

        public async Task<JobOpportunityResponse> CreateAsync(CreateJobOpportunityRequest request)
        {
            var job = new JobOpportunity
            {
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

            return (await GetByIdAsync(job.Id))!;
        }

        public async Task<JobOpportunityResponse?> UpdateAsync(int id, UpdateJobOpportunityRequest request)
        {
            var job = await _db.JobOpportunities.FirstOrDefaultAsync(j => j.Id == id);
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
            return await GetByIdAsync(id);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var job = await _db.JobOpportunities.FirstOrDefaultAsync(j => j.Id == id);
            if (job == null) return false;

            job.IsDeleted = true;
            job.DeletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return true;
        }

        private static JobOpportunityResponse MapToResponse(JobOpportunity j) => new()
        {
            Id = j.Id,
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
            IsActive = j.IsActive,
            IsImported = j.IsImported,
            CreatedAt = j.CreatedAt,
            Company = new CompanySummary
            {
                Id = j.Company.Id,
                Name = j.Company.Name,
                Industry = j.Company.Industry,
                City = j.Company.City,
                Country = j.Company.Country,
                LogoUrl = j.Company.LogoUrl
            }
        };
    }
}
