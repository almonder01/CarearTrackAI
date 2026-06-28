using System.Security.Claims;
using CareerTrackAI.Services;
using CareerTrackAI.Shared;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CareerTrackAI.Controllers
{
    [ApiController]
    [Route("api/usage")]
    [Authorize]
    public class UsageController : ControllerBase
    {
        private readonly IApiUsageTracker _apiUsageTracker;

        public UsageController(IApiUsageTracker apiUsageTracker)
        {
            _apiUsageTracker = apiUsageTracker;
        }

        // GET /api/usage/apis
        [HttpGet("apis")]
        public IActionResult GetApiUsage()
        {
            return Ok(ApiResponse<ApiUsageSummary>.Ok(_apiUsageTracker.GetSummary(GetUserId())));
        }

        private int GetUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
