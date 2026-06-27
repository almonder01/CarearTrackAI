using CareerTrackAI.Data;
using CareerTrackAI.DTOs.Company;
using CareerTrackAI.Models;
using Microsoft.EntityFrameworkCore;

namespace CareerTrackAI.Services
{
    public interface ICompanyService
    {
        Task<List<CompanyResponse>> GetAllAsync(string? industry, string? city, string? country);
        Task<CompanyResponse?> GetByIdAsync(int id);
        Task<CompanyResponse> CreateAsync(CreateCompanyRequest request);
        Task<CompanyResponse?> UpdateAsync(int id, UpdateCompanyRequest request);
        Task<bool> DeleteAsync(int id);
    }

    public class CompanyService : ICompanyService
    {
        private readonly AppDbContext _db;

        public CompanyService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<List<CompanyResponse>> GetAllAsync(string? industry, string? city, string? country)
        {
            var query = _db.Companies.AsQueryable();

            if (!string.IsNullOrEmpty(industry))
                query = query.Where(c => c.Industry != null && c.Industry.Contains(industry));

            if (!string.IsNullOrEmpty(city))
                query = query.Where(c => c.City != null && c.City.Contains(city));

            if (!string.IsNullOrEmpty(country))
                query = query.Where(c => c.Country != null && c.Country.Contains(country));

            var companies = await query.OrderBy(c => c.Name).ToListAsync();
            return companies.Select(MapToResponse).ToList();
        }

        public async Task<CompanyResponse?> GetByIdAsync(int id)
        {
            var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == id);
            return company == null ? null : MapToResponse(company);
        }

        public async Task<CompanyResponse> CreateAsync(CreateCompanyRequest request)
        {
            var company = new Company
            {
                Name = request.Name,
                Industry = request.Industry,
                Description = request.Description,
                City = request.City,
                Country = request.Country,
                Website = request.Website,
                Email = request.Email,
                Phone = request.Phone,
                LinkedInUrl = request.LinkedInUrl,
                LogoUrl = request.LogoUrl
            };

            _db.Companies.Add(company);
            await _db.SaveChangesAsync();
            return MapToResponse(company);
        }

        public async Task<CompanyResponse?> UpdateAsync(int id, UpdateCompanyRequest request)
        {
            var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == id);
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

            company.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return MapToResponse(company);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == id);
            if (company == null) return false;

            company.IsDeleted = true;
            company.DeletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return true;
        }

        private static CompanyResponse MapToResponse(Company c) => new()
        {
            Id = c.Id,
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
            IsImported = c.IsImported,
            CreatedAt = c.CreatedAt
        };
    }
}
