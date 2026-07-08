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
    // ==================== INTERVIEWS CONTROLLER ====================
    [ApiController]
    [Route("api")]
    [Authorize]
    public class InterviewsController : ControllerBase
    {
        private readonly IInterviewService _interviewService;
        public InterviewsController(IInterviewService interviewService) => _interviewService = interviewService;

        // GET /api/interviews
        [HttpGet("interviews")]
        public async Task<IActionResult> GetAll()
        {
            var userId = GetUserId();
            var result = await _interviewService.GetAllByUserAsync(userId);
            return Ok(ApiResponse<object>.Ok(result));
        }

        // GET /api/applications/{applicationId}/interviews
        [HttpGet("applications/{applicationId}/interviews")]
        public async Task<IActionResult> GetByApplication(int applicationId)
        {
            var userId = GetUserId();
            var result = await _interviewService.GetByApplicationAsync(applicationId, userId);
            return Ok(ApiResponse<object>.Ok(result));
        }

        // POST /api/applications/{applicationId}/interviews
        [HttpPost("applications/{applicationId}/interviews")]
        public async Task<IActionResult> Create(int applicationId, [FromBody] CreateInterviewRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail("Invalid data"));

            var userId = GetUserId();
            var result = await _interviewService.CreateAsync(applicationId, userId, request);

            if (result == null)
                return NotFound(ApiResponse<object>.NotFound("Application not found"));

            return Created(string.Empty, ApiResponse<object>.Ok(result, "Interview created"));
        }

        // PUT /api/interviews/{id}
        [HttpPut("interviews/{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateInterviewRequest request)
        {
            var userId = GetUserId();
            var result = await _interviewService.UpdateAsync(id, userId, request);

            if (result == null)
                return NotFound(ApiResponse<object>.NotFound("Interview not found"));

            return Ok(ApiResponse<object>.Ok(result, "Interview updated"));
        }

        // DELETE /api/interviews/{id}
        [HttpDelete("interviews/{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = GetUserId();
            var deleted = await _interviewService.DeleteAsync(id, userId);

            if (!deleted)
                return NotFound(ApiResponse<object>.NotFound("Interview not found"));

            return Ok(ApiResponse.OkNoData("Interview deleted"));
        }

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
