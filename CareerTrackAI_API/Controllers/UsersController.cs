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
    // ==================== USERS CONTROLLER ====================
    [ApiController]
    [Route("api/users")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;
        public UsersController(IUserService userService) => _userService = userService;

        // GET /api/users/me
        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var userId = GetUserId();
            var result = await _userService.GetByIdAsync(userId);
            return Ok(ApiResponse<object>.Ok(result!));
        }

        // PUT /api/users/me
        [HttpPut("me")]
        public async Task<IActionResult> UpdateMe([FromBody] UpdateUserRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail("Invalid data"));

            var userId = GetUserId();
            var result = await _userService.UpdateAsync(userId, request);
            return Ok(ApiResponse<object>.Ok(result!, "Profile updated"));
        }

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
