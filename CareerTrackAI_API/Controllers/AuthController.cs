using CareerTrackAI.DTOs.Auth;
using CareerTrackAI.Services;
using CareerTrackAI.Shared;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CareerTrackAI.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        // POST /api/auth/register
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail("Invalid data", ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList()));

            var result = await _authService.RegisterAsync(request);

            if (result == null)
                return Conflict(ApiResponse<object>.Fail("Email already exists"));

            return CreatedAtAction(nameof(Register),
                ApiResponse<AuthResponse>.Ok(result, "Account created successfully"));
        }

        // POST /api/auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail("Invalid data"));

            var result = await _authService.LoginAsync(request);

            if (result == null)
                return Unauthorized(ApiResponse<object>.Fail("Invalid email or password"));

            return Ok(ApiResponse<AuthResponse>.Ok(result, "Login successful"));
        }

        // POST /api/auth/refresh-token
        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
        {
            var result = await _authService.RefreshTokenAsync(request.RefreshToken);

            if (result == null)
                return Unauthorized(ApiResponse<object>.Fail("Invalid or expired refresh token"));

            return Ok(ApiResponse<AuthResponse>.Ok(result, "Token refreshed"));
        }

        // POST /api/auth/logout
        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout([FromBody] RefreshTokenRequest request)
        {
            await _authService.RevokeTokenAsync(request.RefreshToken);
            return Ok(ApiResponse.OkNoData("Logged out successfully"));
        }
    }
}
