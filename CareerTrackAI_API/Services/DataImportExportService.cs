using System.Globalization;
using System.Text;
using CareerTrackAI.Data;
using CareerTrackAI.Enums;
using CareerTrackAI.Models;
using Microsoft.EntityFrameworkCore;

namespace CareerTrackAI.Services
{
    public record ImportResult(int Created, int Updated, int Skipped, List<string> Errors);

    public interface IDataImportExportService
    {
        Task<string> ExportCompaniesCsvAsync(int userId);
        Task<ImportResult> ImportCompaniesCsvAsync(IFormFile file, int userId);
        Task<string> ExportJobOpportunitiesCsvAsync(int userId);
        Task<ImportResult> ImportJobOpportunitiesCsvAsync(IFormFile file, int userId);
    }

    public class DataImportExportService : IDataImportExportService
    {
        private readonly AppDbContext _db;

        public DataImportExportService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<string> ExportCompaniesCsvAsync(int userId)
        {
            var companies = await _db.Companies.Where(c => c.UserId == userId).OrderBy(c => c.Name).ToListAsync();
            var rows = new List<string>
            {
                "name,industry,description,city,country,website,email,phone,linkedInUrl,logoUrl,sourceProvider"
            };

            rows.AddRange(companies.Select(c => string.Join(",", new[]
            {
                Csv(c.Name),
                Csv(c.Industry),
                Csv(c.Description),
                Csv(c.City),
                Csv(c.Country),
                Csv(c.Website),
                Csv(c.Email),
                Csv(c.Phone),
                Csv(c.LinkedInUrl),
                Csv(c.LogoUrl),
                Csv(c.SourceProvider)
            })));

            return string.Join(Environment.NewLine, rows);
        }

        public async Task<ImportResult> ImportCompaniesCsvAsync(IFormFile file, int userId)
        {
            var rows = await ReadRowsAsync(file);
            var created = 0;
            var updated = 0;
            var skipped = 0;
            var errors = new List<string>();

            foreach (var row in rows)
            {
                var name = Get(row, "name");
                if (string.IsNullOrWhiteSpace(name))
                {
                    skipped++;
                    errors.Add("Skipped company row without a name.");
                    continue;
                }

                var company = await _db.Companies.FirstOrDefaultAsync(c => c.Name == name && c.UserId == userId);
                if (company == null)
                {
                    company = new Company { UserId = userId, Name = name, IsImported = true, ImportedAt = DateTime.UtcNow };
                    _db.Companies.Add(company);
                    created++;
                }
                else
                {
                    updated++;
                    company.UpdatedAt = DateTime.UtcNow;
                }

                company.Industry = Pick(Get(row, "industry"), company.Industry);
                company.Description = Pick(Get(row, "description"), Get(row, "notes"), company.Description);
                company.City = Pick(Get(row, "city"), company.City);
                company.Country = Pick(Get(row, "country"), company.Country);
                company.Website = Pick(Get(row, "website"), company.Website);
                company.Email = Pick(Get(row, "email"), company.Email);
                company.Phone = Pick(Get(row, "phone"), company.Phone);
                company.LinkedInUrl = Pick(Get(row, "linkedInUrl"), Get(row, "linkedinurl"), company.LinkedInUrl);
                company.LogoUrl = Pick(Get(row, "logoUrl"), Get(row, "logourl"), company.LogoUrl);
                company.SourceUrl = Pick(Get(row, "sourceUrl"), Get(row, "sourceurl"), company.SourceUrl);
                company.SourceProvider = Pick(Get(row, "sourceProvider"), Get(row, "source"), company.SourceProvider);
            }

            await _db.SaveChangesAsync();
            return new ImportResult(created, updated, skipped, errors);
        }

        public async Task<string> ExportJobOpportunitiesCsvAsync(int userId)
        {
            var jobs = await _db.JobOpportunities.Where(j => j.UserId == userId).Include(j => j.Company).OrderByDescending(j => j.CreatedAt).ToListAsync();
            var rows = new List<string>
            {
                "title,companyName,type,employmentType,description,location,isRemote,salaryMin,salaryMax,applicationDeadline,requiredSkills,jobUrl,sourceUrl,sourceProvider"
            };

            rows.AddRange(jobs.Select(j => string.Join(",", new[]
            {
                Csv(j.Title),
                Csv(j.Company.Name),
                Csv(j.Type.ToString()),
                Csv(j.EmploymentType?.ToString()),
                Csv(j.Description),
                Csv(j.Location),
                Csv(j.IsRemote.ToString()),
                Csv(j.SalaryMin?.ToString(CultureInfo.InvariantCulture)),
                Csv(j.SalaryMax?.ToString(CultureInfo.InvariantCulture)),
                Csv(j.ApplicationDeadline?.ToString("yyyy-MM-dd")),
                Csv(j.RequiredSkills),
                Csv(j.JobUrl),
                Csv(j.SourceUrl),
                Csv(j.SourceProvider)
            })));

            return string.Join(Environment.NewLine, rows);
        }

        public async Task<ImportResult> ImportJobOpportunitiesCsvAsync(IFormFile file, int userId)
        {
            var rows = await ReadRowsAsync(file);
            var created = 0;
            var updated = 0;
            var skipped = 0;
            var errors = new List<string>();

            foreach (var row in rows)
            {
                var title = Get(row, "title");
                var companyName = Get(row, "companyName", "company");
                if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(companyName))
                {
                    skipped++;
                    errors.Add("Skipped opportunity row without title or companyName.");
                    continue;
                }

                var company = await _db.Companies.FirstOrDefaultAsync(c => c.Name == companyName && c.UserId == userId);
                if (company == null)
                {
                    company = new Company
                    {
                        UserId = userId,
                        Name = companyName,
                        Industry = Get(row, "industry"),
                        City = Get(row, "city"),
                        Country = Pick(Get(row, "country"), "Saudi Arabia"),
                        SourceProvider = Pick(Get(row, "sourceProvider"), Get(row, "source")),
                        IsImported = true,
                        ImportedAt = DateTime.UtcNow
                    };
                    _db.Companies.Add(company);
                    await _db.SaveChangesAsync();
                }

                var job = await _db.JobOpportunities.FirstOrDefaultAsync(j => j.Title == title && j.CompanyId == company.Id && j.UserId == userId);
                if (job == null)
                {
                    job = new JobOpportunity { UserId = userId, Title = title, CompanyId = company.Id, IsImported = true, ImportedAt = DateTime.UtcNow };
                    _db.JobOpportunities.Add(job);
                    created++;
                }
                else
                {
                    updated++;
                    job.UpdatedAt = DateTime.UtcNow;
                }

                job.Description = Pick(Get(row, "description"), job.Description);
                job.Type = ParseEnum(Get(row, "type"), OpportunityType.Internship);
                job.EmploymentType = ParseNullableEnum<EmploymentType>(Get(row, "employmentType", "employment"));
                job.Location = Pick(Get(row, "location"), job.Location);
                job.IsRemote = ParseBool(Get(row, "isRemote"), job.IsRemote);
                job.SalaryMin = ParseDecimal(Get(row, "salaryMin"), job.SalaryMin);
                job.SalaryMax = ParseDecimal(Get(row, "salaryMax"), job.SalaryMax);
                job.ApplicationDeadline = ParseDate(Get(row, "applicationDeadline", "deadline"), job.ApplicationDeadline);
                job.RequiredSkills = Pick(Get(row, "requiredSkills", "skills"), job.RequiredSkills);
                job.JobUrl = Pick(Get(row, "jobUrl", "url"), job.JobUrl);
                job.SourceUrl = Pick(Get(row, "sourceUrl"), job.SourceUrl);
                job.SourceProvider = Pick(Get(row, "sourceProvider"), Get(row, "source"), job.SourceProvider);
            }

            await _db.SaveChangesAsync();
            return new ImportResult(created, updated, skipped, errors);
        }

        private static async Task<List<Dictionary<string, string>>> ReadRowsAsync(IFormFile file)
        {
            using var reader = new StreamReader(file.OpenReadStream(), Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
            var text = await reader.ReadToEndAsync();
            var lines = text.Split(["\r\n", "\n"], StringSplitOptions.RemoveEmptyEntries);
            if (lines.Length < 2) return [];

            var headers = ParseLine(lines[0]).Select(Normalize).ToList();
            return lines.Skip(1).Select(line =>
            {
                var values = ParseLine(line);
                var row = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                for (var i = 0; i < headers.Count; i++)
                    row[headers[i]] = i < values.Count ? values[i] : string.Empty;
                return row;
            }).ToList();
        }

        private static List<string> ParseLine(string line)
        {
            var values = new List<string>();
            var current = new StringBuilder();
            var quoted = false;

            for (var i = 0; i < line.Length; i++)
            {
                var ch = line[i];
                if (ch == '"' && i + 1 < line.Length && line[i + 1] == '"')
                {
                    current.Append('"');
                    i++;
                }
                else if (ch == '"')
                {
                    quoted = !quoted;
                }
                else if (ch == ',' && !quoted)
                {
                    values.Add(current.ToString().Trim());
                    current.Clear();
                }
                else
                {
                    current.Append(ch);
                }
            }

            values.Add(current.ToString().Trim());
            return values;
        }

        private static string Csv(string? value)
        {
            var text = value ?? string.Empty;
            return text.Contains(',') || text.Contains('"') || text.Contains('\n')
                ? $"\"{text.Replace("\"", "\"\"")}\""
                : text;
        }

        private static string Normalize(string value) => value.Trim().Replace(" ", "", StringComparison.OrdinalIgnoreCase);

        private static string? Get(Dictionary<string, string> row, params string[] keys)
        {
            foreach (var key in keys.Select(Normalize))
            {
                if (row.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value))
                    return value.Trim();
            }
            return null;
        }

        private static string? Pick(params string?[] values) => values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));

        private static T ParseEnum<T>(string? value, T fallback) where T : struct =>
            Enum.TryParse<T>(value, ignoreCase: true, out var parsed) ? parsed : fallback;

        private static T? ParseNullableEnum<T>(string? value) where T : struct =>
            Enum.TryParse<T>(value, ignoreCase: true, out var parsed) ? parsed : null;

        private static bool ParseBool(string? value, bool fallback) =>
            bool.TryParse(value, out var parsed) ? parsed : fallback;

        private static decimal? ParseDecimal(string? value, decimal? fallback) =>
            decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed) ? parsed : fallback;

        private static DateTime? ParseDate(string? value, DateTime? fallback) =>
            DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsed) ? parsed.ToUniversalTime() : fallback;
    }
}
