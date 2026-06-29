using CareerTrackAI.Data;
using CareerTrackAI.DTOs.Company;
using CareerTrackAI.Models;
using Microsoft.EntityFrameworkCore;

namespace CareerTrackAI.Services
{
    public interface ICompanyService
    {
        Task<List<CompanyResponse>> GetAllAsync(int userId, string? industry, string? city, string? country, bool includeShared);
        Task<CompanyResponse?> GetByIdAsync(int id, int userId, bool includeShared = false);
        Task<CompanyResponse> CreateAsync(int userId, CreateCompanyRequest request);
        Task<SaveSharedCompanyResponse?> SaveSharedAsync(int id, int userId);
        Task<CompanyResponse?> UpdateAsync(int id, int userId, UpdateCompanyRequest request);
        Task<bool> DeleteAsync(int id, int userId);
    }

    public class CompanyService : ICompanyService
    {
        private readonly AppDbContext _db;

        public CompanyService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<List<CompanyResponse>> GetAllAsync(int userId, string? industry, string? city, string? country, bool includeShared)
        {
            var query = _db.Companies
                .Where(c => c.UserId == userId || (includeShared && c.UserId == null))
                .AsQueryable();

            if (!string.IsNullOrEmpty(industry))
                query = query.Where(c => c.Industry != null && c.Industry.Contains(industry));

            if (!string.IsNullOrEmpty(city))
                query = query.Where(c => c.City != null && c.City.Contains(city));

            if (!string.IsNullOrEmpty(country))
                query = query.Where(c => c.Country != null && c.Country.Contains(country));

            var companies = await query.OrderBy(c => c.Name).ToListAsync();
            return companies.Select(MapToResponse).ToList();
        }

        public async Task<CompanyResponse?> GetByIdAsync(int id, int userId, bool includeShared = false)
        {
            var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == id && (c.UserId == userId || (includeShared && c.UserId == null)));
            return company == null ? null : MapToResponse(company);
        }

        public async Task<CompanyResponse> CreateAsync(int userId, CreateCompanyRequest request)
        {
            var company = new Company
            {
                UserId = userId,
                Name = request.Name,
                Industry = request.Industry,
                Description = request.Description,
                City = request.City,
                Country = request.Country,
                Website = request.Website,
                Email = request.Email,
                Phone = request.Phone,
                LinkedInUrl = request.LinkedInUrl,
                LogoUrl = request.LogoUrl,
                SourceProvider = request.SourceProvider
            };

            _db.Companies.Add(company);
            await _db.SaveChangesAsync();
            return MapToResponse(company);
        }

        public async Task<SaveSharedCompanyResponse?> SaveSharedAsync(int id, int userId)
        {
            var shared = await _db.Companies
                .Include(c => c.JobOpportunities.Where(j => j.IsActive))
                .FirstOrDefaultAsync(c => c.Id == id && c.UserId == null);
            if (shared == null) return null;

            var company = await _db.Companies.FirstOrDefaultAsync(c => c.UserId == userId && c.Name == shared.Name);
            if (company == null)
            {
                company = new Company
                {
                    UserId = userId,
                    Name = shared.Name,
                    Industry = shared.Industry,
                    Description = shared.Description,
                    City = shared.City,
                    Country = shared.Country,
                    Website = shared.Website,
                    Email = shared.Email,
                    Phone = shared.Phone,
                    LinkedInUrl = shared.LinkedInUrl,
                    LogoUrl = shared.LogoUrl,
                    IsImported = true,
                    ImportedAt = DateTime.UtcNow,
                    SourceUrl = shared.SourceUrl,
                    SourceProvider = shared.SourceProvider ?? "Shared Database"
                };
                _db.Companies.Add(company);
                await _db.SaveChangesAsync();
            }

            var created = 0;
            var updated = 0;
            foreach (var sharedJob in shared.JobOpportunities)
            {
                var job = await _db.JobOpportunities.FirstOrDefaultAsync(j => j.UserId == userId && j.CompanyId == company.Id && j.Title == sharedJob.Title);
                if (job == null)
                {
                    job = new JobOpportunity
                    {
                        UserId = userId,
                        CompanyId = company.Id,
                        Title = sharedJob.Title,
                        IsImported = true,
                        ImportedAt = DateTime.UtcNow
                    };
                    _db.JobOpportunities.Add(job);
                    created++;
                }
                else
                {
                    updated++;
                    job.UpdatedAt = DateTime.UtcNow;
                }

                job.Description = sharedJob.Description;
                job.Type = sharedJob.Type;
                job.EmploymentType = sharedJob.EmploymentType;
                job.Location = sharedJob.Location;
                job.IsRemote = sharedJob.IsRemote;
                job.SalaryMin = sharedJob.SalaryMin;
                job.SalaryMax = sharedJob.SalaryMax;
                job.ApplicationDeadline = sharedJob.ApplicationDeadline;
                job.RequiredSkills = sharedJob.RequiredSkills;
                job.JobUrl = sharedJob.JobUrl;
                job.SourceUrl = sharedJob.SourceUrl;
                job.SourceProvider = sharedJob.SourceProvider ?? shared.SourceProvider ?? "Shared Database";
                job.IsActive = sharedJob.IsActive;
            }

            await _db.SaveChangesAsync();
            return new SaveSharedCompanyResponse
            {
                Company = MapToResponse(company),
                OpportunitiesCreated = created,
                OpportunitiesUpdated = updated
            };
        }

        public async Task<CompanyResponse?> UpdateAsync(int id, int userId, UpdateCompanyRequest request)
        {
            var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
            if (company == null) return null;

            if (request.Name != null) company.Name = request.Name;
            if (request.Industry != null) company.Industry = request.Industry;
            if (request.Description != null) company.Description = request.Description;
            if (request.City != null) company.City = request.City;
            if (request.Country != null) company.Country = request.Country;
            if (request.Website != null) company.Website = request.Website;
            if (request.Email != null) company.Email = request.Email;
            if (request.Phone != null) company.Phone = request.Phone;
            if (request.LinkedInUrl != null) company.LinkedInUrl = request.LinkedInUrl;
            if (request.LogoUrl != null) company.LogoUrl = request.LogoUrl;
            if (request.SourceProvider != null) company.SourceProvider = request.SourceProvider;

            company.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return MapToResponse(company);
        }

        public async Task<bool> DeleteAsync(int id, int userId)
        {
            var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
            if (company == null) return false;

            company.IsDeleted = true;
            company.DeletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return true;
        }

        private static CompanyResponse MapToResponse(Company c) => new()
        {
            Id = c.Id,
            UserId = c.UserId,
            Name = c.Name,
            Industry = c.Industry,
            Description = c.Description,
            City = c.City,
            Country = c.Country,
            Website = c.Website,
            Email = c.Email,
            Phone = c.Phone,
            LinkedInUrl = c.LinkedInUrl,
            LogoUrl = c.LogoUrl,
            SourceProvider = c.SourceProvider,
            IsShared = c.UserId == null,
            IsImported = c.IsImported,
            CreatedAt = c.CreatedAt
        };
    }
}
