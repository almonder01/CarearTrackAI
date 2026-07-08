using System.Security.Claims;
using System.Text;
using CareerTrackAI.DTOs.Company;
using CareerTrackAI.DTOs.Interview;
using CareerTrackAI.DTOs.JobOpportunity;
using CareerTrackAI.DTOs.User;
using CareerTrackAI.Enums;
using CareerTrackAI.Services;
using CareerTrackAI.Shared;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CareerTrackAI.Controllers
{
    // ==================== DASHBOARD CONTROLLER ====================
    [ApiController]
    [Route("api/dashboard")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;
        public DashboardController(IDashboardService dashboardService) => _dashboardService = dashboardService;

        // GET /api/dashboard/stats
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats([FromQuery] string activityGrain = "month")
        {
            var userId = GetUserId();
            var result = await _dashboardService.GetStatsAsync(userId, activityGrain);
            return Ok(ApiResponse<object>.Ok(result));
        }

        // GET /api/dashboard/first-run-checklist
        [HttpGet("first-run-checklist")]
        public async Task<IActionResult> GetFirstRunChecklist()
        {
            var userId = GetUserId();
            var result = await _dashboardService.GetFirstRunChecklistAsync(userId);
            return Ok(ApiResponse<object>.Ok(result));
        }

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
