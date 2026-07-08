using System.Security.Claims;
using CareerTrackAI.Data;
using CareerTrackAI.Services;
using CareerTrackAI.Shared;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CareerTrackAI.Controllers
{
    [ApiController]
    [Route("api/usage")]
    [Authorize]
    public class UsageController : ControllerBase
    {
        private readonly IApiUsageTracker _apiUsageTracker;
        private readonly AppDbContext _db;

        public UsageController(IApiUsageTracker apiUsageTracker, AppDbContext db)
        {
            _apiUsageTracker = apiUsageTracker;
            _db = db;
        }

        // GET /api/usage/apis
        [HttpGet("apis")]
        public async Task<IActionResult> GetApiUsage([FromQuery] string grain = "day")
        {
            var userId = GetUserId();
            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
            return Ok(ApiResponse<ApiUsageSummary>.Ok(_apiUsageTracker.GetSummary(userId, user?.CreatedAt ?? DateTime.UtcNow, grain)));
        }

        private int GetUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
