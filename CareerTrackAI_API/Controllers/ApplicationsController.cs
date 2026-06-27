using System.Security.Claims;
using CareerTrackAI.DTOs.Application;
using CareerTrackAI.Enums;
using CareerTrackAI.Services;
using CareerTrackAI.Shared;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CareerTrackAI.Controllers
{
    [ApiController]
    [Route("api/applications")]
    [Authorize]
    public class ApplicationsController : ControllerBase
    {
        private readonly IApplicationService _applicationService;

        public ApplicationsController(IApplicationService applicationService)
        {
            _applicationService = applicationService;
        }

        // GET /api/applications
        // GET /api/applications?status=Interview
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] ApplicationStatus? status)
        {
            var userId = GetUserId();
            var result = await _applicationService.GetAllAsync(userId, status);
            return Ok(ApiResponse<List<ApplicationResponse>>.Ok(result));
        }

        // GET /api/applications/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var userId = GetUserId();
            var result = await _applicationService.GetByIdAsync(id, userId);

            if (result == null)
                return NotFound(ApiResponse<object>.NotFound("Application not found"));

            return Ok(ApiResponse<ApplicationResponse>.Ok(result));
        }

        // POST /api/applications
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateApplicationRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail("Invalid data", ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList()));

            var userId = GetUserId();

            try
            {
                var result = await _applicationService.CreateAsync(userId, request);
                return CreatedAtAction(nameof(GetById), new { id = result.Id },
                    ApiResponse<ApplicationResponse>.Ok(result, "Application created"));
            }
            catch (Exception)
            {
                // Unique constraint: نفس المستخدم على نفس الفرصة مرتين
                return Conflict(ApiResponse<object>.Fail("You already applied to this opportunity"));
            }
        }

        // PATCH /api/applications/{id}/status
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateApplicationStatusRequest request)
        {
            var userId = GetUserId();
            var result = await _applicationService.UpdateStatusAsync(id, userId, request);

            if (result == null)
                return NotFound(ApiResponse<object>.NotFound("Application not found"));

            return Ok(ApiResponse<ApplicationResponse>.Ok(result, "Status updated"));
        }

        // PATCH /api/applications/{id}
        [HttpPatch("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateApplicationRequest request)
        {
            var userId = GetUserId();
            var result = await _applicationService.UpdateAsync(id, userId, request);

            if (result == null)
                return NotFound(ApiResponse<object>.NotFound("Application not found"));

            return Ok(ApiResponse<ApplicationResponse>.Ok(result, "Application updated"));
        }

        // DELETE /api/applications/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = GetUserId();
            var deleted = await _applicationService.DeleteAsync(id, userId);

            if (!deleted)
                return NotFound(ApiResponse<object>.NotFound("Application not found"));

            return Ok(ApiResponse.OkNoData("Application deleted"));
        }

        // ==================== HELPER ====================
        private int GetUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
