using CareerTrackAI.Data;
using CareerTrackAI.DTOs.Notification;
using CareerTrackAI.DTOs.User;
using CareerTrackAI.DTOs.Dashboard;
using CareerTrackAI.Enums;
using Microsoft.EntityFrameworkCore;

namespace CareerTrackAI.Services
{
    // ==================== USER SERVICE ====================
    public interface IUserService
    {
        Task<UserResponse?> GetByIdAsync(int userId);
        Task<UserResponse?> UpdateAsync(int userId, UpdateUserRequest request);
    }

    public class UserService : IUserService
    {
        private readonly AppDbContext _db;

        public UserService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<UserResponse?> GetByIdAsync(int userId)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            return user == null ? null : new UserResponse
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                Role = user.Role.ToString(),
                University = user.University,
                Major = user.Major,
                City = user.City,
                GraduationYear = user.GraduationYear,
                CareerObjective = user.CareerObjective,
                NotificationsEnabled = user.NotificationsEnabled,
                LastLoginAt = user.LastLoginAt,
                CreatedAt = user.CreatedAt
            };
        }

        public async Task<UserResponse?> UpdateAsync(int userId, UpdateUserRequest request)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return null;

            user.FullName = request.FullName;
            if (request.University != null) user.University = request.University;
            if (request.Major != null) user.Major = request.Major;
            if (request.City != null) user.City = request.City;
            if (request.GraduationYear.HasValue) user.GraduationYear = request.GraduationYear;
            if (request.CareerObjective != null) user.CareerObjective = request.CareerObjective;
            if (request.NotificationsEnabled.HasValue) user.NotificationsEnabled = request.NotificationsEnabled.Value;

            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return await GetByIdAsync(userId);
        }
    }
}
