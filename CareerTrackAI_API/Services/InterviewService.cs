using CareerTrackAI.Data;
using CareerTrackAI.DTOs.Interview;
using CareerTrackAI.Models;
using Microsoft.EntityFrameworkCore;

namespace CareerTrackAI.Services
{
    public interface IInterviewService
    {
        Task<List<InterviewResponse>> GetAllByUserAsync(int userId);
        Task<List<InterviewResponse>> GetByApplicationAsync(int applicationId, int userId);
        Task<InterviewResponse?> CreateAsync(int applicationId, int userId, CreateInterviewRequest request);
        Task<InterviewResponse?> UpdateAsync(int id, int userId, UpdateInterviewRequest request);
        Task<bool> DeleteAsync(int id, int userId);
    }

    public class InterviewService : IInterviewService
    {
        private readonly AppDbContext _db;

        public InterviewService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<List<InterviewResponse>> GetAllByUserAsync(int userId)
        {
            var interviews = await _db.Interviews
                .Include(i => i.Application).ThenInclude(a => a.JobOpportunity).ThenInclude(j => j.Company)
                .Where(i => i.Application.UserId == userId)
                .OrderBy(i => i.ScheduledAt)
                .ToListAsync();

            return interviews.Select(MapToResponse).ToList();
        }

        public async Task<List<InterviewResponse>> GetByApplicationAsync(int applicationId, int userId)
        {
            var interviews = await _db.Interviews
                .Include(i => i.Application).ThenInclude(a => a.JobOpportunity).ThenInclude(j => j.Company)
                .Where(i => i.ApplicationId == applicationId && i.Application.UserId == userId)
                .OrderBy(i => i.ScheduledAt)
                .ToListAsync();

            return interviews.Select(MapToResponse).ToList();
        }

        public async Task<InterviewResponse?> CreateAsync(int applicationId, int userId, CreateInterviewRequest request)
        {
            var application = await _db.Applications
                .FirstOrDefaultAsync(a => a.Id == applicationId && a.UserId == userId);

            if (application == null) return null;

            var interview = new Interview
            {
                ApplicationId = applicationId,
                Title = request.Title,
                ScheduledAt = request.ScheduledAt,
                DurationMinutes = request.DurationMinutes,
                Type = request.Type,
                Location = request.Location,
                Notes = request.Notes
            };

            _db.Interviews.Add(interview);
            await _db.SaveChangesAsync();

            await _db.Entry(interview).Reference(i => i.Application)
                .Query()
                .Include(a => a.JobOpportunity).ThenInclude(j => j.Company)
                .LoadAsync();

            return MapToResponse(interview);
        }

        public async Task<InterviewResponse?> UpdateAsync(int id, int userId, UpdateInterviewRequest request)
        {
            var interview = await _db.Interviews
                .Include(i => i.Application).ThenInclude(a => a.JobOpportunity).ThenInclude(j => j.Company)
                .FirstOrDefaultAsync(i => i.Id == id && i.Application.UserId == userId);

            if (interview == null) return null;

            if (request.Title != null) interview.Title = request.Title;
            if (request.ScheduledAt.HasValue) interview.ScheduledAt = request.ScheduledAt.Value;
            if (request.DurationMinutes.HasValue) interview.DurationMinutes = request.DurationMinutes.Value;
            if (request.Type.HasValue) interview.Type = request.Type.Value;
            if (request.Location != null) interview.Location = request.Location;
            if (request.Notes != null) interview.Notes = request.Notes;

            interview.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return MapToResponse(interview);
        }

        public async Task<bool> DeleteAsync(int id, int userId)
        {
            var interview = await _db.Interviews
                .Include(i => i.Application)
                .FirstOrDefaultAsync(i => i.Id == id && i.Application.UserId == userId);

            if (interview == null) return false;

            interview.IsDeleted = true;
            interview.DeletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return true;
        }

        private static InterviewResponse MapToResponse(Interview i) => new()
        {
            Id = i.Id,
            Title = i.Title,
            ScheduledAt = i.ScheduledAt,
            DurationMinutes = i.DurationMinutes,
            Type = i.Type.ToString(),
            Location = i.Location,
            Notes = i.Notes,
            ReminderSent = i.ReminderSent,
            CreatedAt = i.CreatedAt,
            ApplicationId = i.ApplicationId,
            CompanyName = i.Application.JobOpportunity.Company.Name,
            JobTitle = i.Application.JobOpportunity.Title
        };
    }
}
