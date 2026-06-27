using System.Security.Claims;
using CareerTrackAI.DTOs.AI;
using CareerTrackAI.Services;
using CareerTrackAI.Shared;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CareerTrackAI.Controllers
{
    [ApiController]
    [Route("api/ai")]
    [Authorize]
    public class AiController : ControllerBase
    {
        private readonly IAiService _aiService;

        public AiController(IAiService aiService)
        {
            _aiService = aiService;
        }

        // POST /api/ai/chat
        [HttpPost("chat")]
        public async Task<IActionResult> Chat([FromBody] ChatRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail("Invalid request"));

            var userId = GetUserId();
            var result = await _aiService.ChatAsync(userId, request);
            return Ok(ApiResponse<ChatResponse>.Ok(result));
        }

        // POST /api/ai/analyze-resume/{id}
        [HttpPost("analyze-resume/{id}")]
        public async Task<IActionResult> AnalyzeResume(int id)
        {
            var userId = GetUserId();
            var result = await _aiService.AnalyzeResumeAsync(id, userId);
            return Ok(ApiResponse<AnalyzeResumeResponse>.Ok(result));
        }

        // POST /api/ai/generate-cover-letter
        [HttpPost("generate-cover-letter")]
        public async Task<IActionResult> GenerateCoverLetter([FromBody] GenerateCoverLetterRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail("Invalid request"));

            var userId = GetUserId();
            var result = await _aiService.GenerateCoverLetterAsync(userId, request);
            return Ok(ApiResponse<GenerateCoverLetterResponse>.Ok(result));
        }

        // GET /api/ai/recommendations
        [HttpGet("recommendations")]
        public async Task<IActionResult> GetRecommendations()
        {
            var userId = GetUserId();
            var result = await _aiService.GetRecommendationsAsync(userId);
            return Ok(ApiResponse<RecommendationsResponse>.Ok(result));
        }

        private int GetUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
