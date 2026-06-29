using CareerTrackAI.Data;
using CareerTrackAI.DTOs.Resume;
using CareerTrackAI.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;

namespace CareerTrackAI.Services
{
    public interface IResumeService
    {
        Task<List<ResumeResponse>> GetAllAsync(int userId);
        Task<ResumeResponse?> GetByIdAsync(int id, int userId);
        Task<ResumeResponse> CreateAsync(int userId, string label, string fileUrl, string? fileType, string? parsedContent);
        Task<bool> DeleteAsync(int id, int userId);
        Task<ResumeVersionResponse?> CreateVersionAsync(int resumeId, int userId, string versionName, string fileUrl, string? fileType, int? targetCompanyId);
        Task<List<ResumeVersionResponse>> GetVersionsAsync(int resumeId, int userId);
    }

    public class ResumeService : IResumeService
    {
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;

        public ResumeService(AppDbContext db, IWebHostEnvironment env)
        {
            _db = db;
            _env = env;
        }

        public async Task<List<ResumeResponse>> GetAllAsync(int userId)
        {
            var resumes = await _db.Resumes
                .Where(r => r.UserId == userId)
                .Include(r => r.Versions)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return resumes.Select(MapToResponse).ToList();
        }

        public async Task<ResumeResponse?> GetByIdAsync(int id, int userId)
        {
            var resume = await _db.Resumes
                .Where(r => r.Id == id && r.UserId == userId)
                .Include(r => r.Versions).ThenInclude(v => v.TargetCompany)
                .FirstOrDefaultAsync();

            return resume == null ? null : MapToResponse(resume);
        }

        public async Task<ResumeResponse> CreateAsync(int userId, string label, string fileUrl, string? fileType, string? parsedContent)
        {
            var resume = new Resume
            {
                UserId = userId,
                Label = label,
                FileUrl = fileUrl,
                FileType = fileType,
                ParsedContent = parsedContent
            };

            _db.Resumes.Add(resume);
            await _db.SaveChangesAsync();
            return (await GetByIdAsync(resume.Id, userId))!;
        }

        public async Task<bool> DeleteAsync(int id, int userId)
        {
            var resume = await _db.Resumes
                .Include(r => r.Versions)
                .FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);
            if (resume == null) return false;

            var now = DateTime.UtcNow;
            var filesToDelete = new List<string?> { resume.FileUrl };
            filesToDelete.AddRange(resume.Versions.Select(version => version.FileUrl));

            var versionIds = resume.Versions.Select(version => version.Id).ToList();
            var linkedApplications = await _db.Applications
                .Where(application =>
                    application.UserId == userId &&
                    (application.ResumeId == resume.Id || (application.ResumeVersionId.HasValue && versionIds.Contains(application.ResumeVersionId.Value))))
                .ToListAsync();

            foreach (var application in linkedApplications)
            {
                if (application.ResumeId == resume.Id) application.ResumeId = null;
                if (application.ResumeVersionId.HasValue && versionIds.Contains(application.ResumeVersionId.Value)) application.ResumeVersionId = null;
                application.UpdatedAt = now;
            }

            foreach (var version in resume.Versions)
            {
                version.IsDeleted = true;
                version.DeletedAt = now;
                version.UpdatedAt = now;
            }

            resume.IsDeleted = true;
            resume.DeletedAt = now;
            resume.UpdatedAt = now;
            await _db.SaveChangesAsync();

            foreach (var fileUrl in filesToDelete)
            {
                DeleteLocalResumeFile(fileUrl, userId);
            }

            DeleteUserResumeFolderIfEmpty(userId);
            return true;
        }

        public async Task<ResumeVersionResponse?> CreateVersionAsync(int resumeId, int userId, string versionName, string fileUrl, string? fileType, int? targetCompanyId)
        {
            var resume = await _db.Resumes.FirstOrDefaultAsync(r => r.Id == resumeId && r.UserId == userId);
            if (resume == null) return null;

            var version = new ResumeVersion
            {
                ResumeId = resumeId,
                VersionName = versionName,
                FileUrl = fileUrl,
                FileType = fileType,
                TargetCompanyId = targetCompanyId,
                IsAiGenerated = true
            };

            _db.ResumeVersions.Add(version);
            await _db.SaveChangesAsync();

            await _db.Entry(version).Reference(v => v.TargetCompany).LoadAsync();
            return MapVersionToResponse(version);
        }

        public async Task<List<ResumeVersionResponse>> GetVersionsAsync(int resumeId, int userId)
        {
            var resume = await _db.Resumes.FirstOrDefaultAsync(r => r.Id == resumeId && r.UserId == userId);
            if (resume == null) return new List<ResumeVersionResponse>();

            var versions = await _db.ResumeVersions
                .Where(v => v.ResumeId == resumeId)
                .Include(v => v.TargetCompany)
                .OrderByDescending(v => v.CreatedAt)
                .ToListAsync();

            return versions.Select(MapVersionToResponse).ToList();
        }

        private static ResumeResponse MapToResponse(Resume r) => new()
        {
            Id = r.Id,
            Label = r.Label,
            FileUrl = r.FileUrl,
            FileType = r.FileType,
            LastUsedAt = r.LastUsedAt,
            CreatedAt = r.CreatedAt,
            Versions = r.Versions.Select(MapVersionToResponse).ToList()
        };

        private static ResumeVersionResponse MapVersionToResponse(ResumeVersion v) => new()
        {
            Id = v.Id,
            VersionName = v.VersionName,
            FileUrl = v.FileUrl,
            FileType = v.FileType,
            IsAiGenerated = v.IsAiGenerated,
            TargetCompanyId = v.TargetCompanyId,
            TargetCompanyName = v.TargetCompany?.Name,
            CreatedAt = v.CreatedAt
        };

        private void DeleteLocalResumeFile(string? fileUrl, int userId)
        {
            var filePath = ResolveLocalResumePath(fileUrl, userId);
            if (filePath == null || !File.Exists(filePath)) return;

            try
            {
                File.Delete(filePath);
            }
            catch
            {
                // Keep the database deletion successful even if the OS temporarily locks the file.
            }
        }

        private string? ResolveLocalResumePath(string? fileUrl, int userId)
        {
            if (string.IsNullOrWhiteSpace(fileUrl)) return null;

            var webRoot = Path.GetFullPath(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"));
            var allowedRoot = Path.GetFullPath(Path.Combine(webRoot, "uploads", "resumes", userId.ToString()));
            var relativePath = Uri.UnescapeDataString(fileUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            var fullPath = Path.GetFullPath(Path.Combine(webRoot, relativePath));

            var allowedPrefix = allowedRoot.EndsWith(Path.DirectorySeparatorChar)
                ? allowedRoot
                : allowedRoot + Path.DirectorySeparatorChar;

            return fullPath.StartsWith(allowedPrefix, StringComparison.OrdinalIgnoreCase) ? fullPath : null;
        }

        private void DeleteUserResumeFolderIfEmpty(int userId)
        {
            var webRoot = Path.GetFullPath(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"));
            var userFolder = Path.GetFullPath(Path.Combine(webRoot, "uploads", "resumes", userId.ToString()));
            if (!Directory.Exists(userFolder) || Directory.EnumerateFileSystemEntries(userFolder).Any()) return;

            try
            {
                Directory.Delete(userFolder);
            }
            catch
            {
            }
        }
    }
}
