using System.Security.Claims;
using CareerTrackAI.DTOs.Admin;
using CareerTrackAI.DTOs.Company;
using CareerTrackAI.DTOs.JobOpportunity;
using CareerTrackAI.Services;
using CareerTrackAI.Shared;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CareerTrackAI.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;

        public AdminController(IAdminService adminService)
        {
            _adminService = adminService;
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers([FromQuery] string? search)
        {
            var result = await _adminService.GetUsersAsync(search);
            return Ok(ApiResponse<object>.Ok(result));
        }

        [HttpPost("admins")]
        public async Task<IActionResult> CreateAdmin([FromBody] CreateAdminRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail("Invalid admin data"));

            var result = await _adminService.CreateAdminAsync(request);
            if (result == null) return Conflict(ApiResponse<object>.Fail("A user with this email already exists."));

            return Ok(ApiResponse<object>.Ok(result, "Admin created"));
        }

        [HttpPost("users/{id}/make-admin")]
        public async Task<IActionResult> MakeAdmin(int id)
        {
            var result = await _adminService.MakeAdminAsync(id);
            if (result == null) return NotFound(ApiResponse<object>.NotFound("User not found"));
            return Ok(ApiResponse<object>.Ok(result, "Admin role granted"));
        }

        [HttpPost("users/{id}/remove-admin")]
        public async Task<IActionResult> RemoveAdmin(int id)
        {
            var result = await _adminService.RemoveAdminAsync(id);
            if (!result.Success) return BadRequest(ApiResponse<object>.Fail(result.Message));
            return Ok(ApiResponse.OkNoData(result.Message));
        }

        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var result = await _adminService.DeleteUserAsync(id, GetUserId());
            if (!result.Success) return BadRequest(ApiResponse<object>.Fail(result.Message));
            return Ok(ApiResponse.OkNoData(result.Message));
        }

        [HttpGet("shared-database")]
        public async Task<IActionResult> GetSharedDatabase()
        {
            var result = await _adminService.GetSharedDatabaseAsync(GetUserId());
            return Ok(ApiResponse<object>.Ok(result));
        }

        [HttpPost("shared-companies")]
        public async Task<IActionResult> CreateSharedCompany([FromBody] CreateCompanyRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail("Invalid company data"));

            var result = await _adminService.CreateSharedCompanyAsync(request);
            return Ok(ApiResponse<object>.Ok(result, "Shared company created"));
        }

        [HttpPut("shared-companies/{id}")]
        public async Task<IActionResult> UpdateSharedCompany(int id, [FromBody] UpdateCompanyRequest request)
        {
            var result = await _adminService.UpdateSharedCompanyAsync(id, request);
            if (result == null) return NotFound(ApiResponse<object>.NotFound("Shared company not found"));
            return Ok(ApiResponse<object>.Ok(result, "Shared company updated"));
        }

        [HttpDelete("shared-companies/{id}")]
        public async Task<IActionResult> DeleteSharedCompany(int id)
        {
            var deleted = await _adminService.DeleteSharedCompanyAsync(id);
            if (!deleted) return NotFound(ApiResponse<object>.NotFound("Shared company not found"));
            return Ok(ApiResponse.OkNoData("Shared company deleted"));
        }

        [HttpPost("shared-opportunities")]
        public async Task<IActionResult> CreateSharedOpportunity([FromBody] CreateJobOpportunityRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail("Invalid opportunity data"));

            var result = await _adminService.CreateSharedOpportunityAsync(request);
            if (result == null) return BadRequest(ApiResponse<object>.Fail("Select a shared company before creating a shared opportunity."));
            return Ok(ApiResponse<object>.Ok(result, "Shared opportunity created"));
        }

        [HttpPut("shared-opportunities/{id}")]
        public async Task<IActionResult> UpdateSharedOpportunity(int id, [FromBody] UpdateJobOpportunityRequest request)
        {
            var result = await _adminService.UpdateSharedOpportunityAsync(id, request);
            if (result == null) return NotFound(ApiResponse<object>.NotFound("Shared opportunity not found"));
            return Ok(ApiResponse<object>.Ok(result, "Shared opportunity updated"));
        }

        [HttpDelete("shared-opportunities/{id}")]
        public async Task<IActionResult> DeleteSharedOpportunity(int id)
        {
            var deleted = await _adminService.DeleteSharedOpportunityAsync(id);
            if (!deleted) return NotFound(ApiResponse<object>.NotFound("Shared opportunity not found"));
            return Ok(ApiResponse.OkNoData("Shared opportunity deleted"));
        }

        [HttpPost("shared-opportunities/{id}/notify")]
        public async Task<IActionResult> NotifyInterestedUsers(int id, [FromBody] AdminNotifyRequest? request)
        {
            var result = await _adminService.NotifyInterestedUsersAsync(GetUserId(), id, request);
            if (result == null) return NotFound(ApiResponse<object>.NotFound("Shared opportunity not found"));
            return Ok(ApiResponse<object>.Ok(result, result.Message));
        }

        [HttpPost("shared-opportunities/{id}/notification-preview")]
        public async Task<IActionResult> PreviewNotificationTargets(int id)
        {
            var result = await _adminService.PreviewNotificationTargetsAsync(GetUserId(), id);
            if (result == null) return NotFound(ApiResponse<object>.NotFound("Shared opportunity not found"));
            return Ok(ApiResponse<object>.Ok(result, result.Message));
        }

        [HttpPost("shared-opportunities/notification-preview-all")]
        public async Task<IActionResult> PreviewAllNotificationTargets()
        {
            var result = await _adminService.PreviewAllNotificationTargetsAsync(GetUserId());
            return Ok(ApiResponse<object>.Ok(result, "Notification matching check completed."));
        }

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
