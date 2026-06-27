using System.Security.Claims;
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

    // ==================== COMPANIES CONTROLLER ====================
    [ApiController]
    [Route("api/companies")]
    [Authorize]
    public class CompaniesController : ControllerBase
    {
        private readonly ICompanyService _companyService;
        public CompaniesController(ICompanyService companyService) => _companyService = companyService;

        // GET /api/companies
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? industry,
            [FromQuery] string? city,
            [FromQuery] string? country)
        {
            var result = await _companyService.GetAllAsync(industry, city, country);
            return Ok(ApiResponse<object>.Ok(result));
        }

        // GET /api/companies/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _companyService.GetByIdAsync(id);
            if (result == null) return NotFound(ApiResponse<object>.NotFound("Company not found"));
            return Ok(ApiResponse<object>.Ok(result));
        }

        // POST /api/companies - Admin only
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CreateCompanyRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail("Invalid data"));

            var result = await _companyService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = result.Id },
                ApiResponse<object>.Ok(result, "Company created"));
        }

        // PUT /api/companies/{id} - Admin only
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateCompanyRequest request)
        {
            var result = await _companyService.UpdateAsync(id, request);
            if (result == null) return NotFound(ApiResponse<object>.NotFound("Company not found"));
            return Ok(ApiResponse<object>.Ok(result, "Company updated"));
        }

        // DELETE /api/companies/{id} - Admin only
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _companyService.DeleteAsync(id);
            if (!deleted) return NotFound(ApiResponse<object>.NotFound("Company not found"));
            return Ok(ApiResponse.OkNoData("Company deleted"));
        }
    }

    // ==================== JOB OPPORTUNITIES CONTROLLER ====================
    [ApiController]
    [Route("api/job-opportunities")]
    [Authorize]
    public class JobOpportunitiesController : ControllerBase
    {
        private readonly IJobOpportunityService _jobService;
        public JobOpportunitiesController(IJobOpportunityService jobService) => _jobService = jobService;

        // GET /api/job-opportunities
        // GET /api/job-opportunities?type=Internship
        // GET /api/job-opportunities?type=Job&employmentType=FullTime
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] OpportunityType? type,
            [FromQuery] EmploymentType? employmentType,
            [FromQuery] int? companyId)
        {
            var result = await _jobService.GetAllAsync(type, employmentType, companyId);
            return Ok(ApiResponse<object>.Ok(result));
        }

        // GET /api/job-opportunities/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _jobService.GetByIdAsync(id);
            if (result == null) return NotFound(ApiResponse<object>.NotFound("Opportunity not found"));
            return Ok(ApiResponse<object>.Ok(result));
        }

        // POST /api/job-opportunities - Admin only
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CreateJobOpportunityRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail("Invalid data"));

            var result = await _jobService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = result.Id },
                ApiResponse<object>.Ok(result, "Opportunity created"));
        }

        // PUT /api/job-opportunities/{id} - Admin only
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateJobOpportunityRequest request)
        {
            var result = await _jobService.UpdateAsync(id, request);
            if (result == null) return NotFound(ApiResponse<object>.NotFound("Opportunity not found"));
            return Ok(ApiResponse<object>.Ok(result, "Opportunity updated"));
        }

        // DELETE /api/job-opportunities/{id} - Admin only
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _jobService.DeleteAsync(id);
            if (!deleted) return NotFound(ApiResponse<object>.NotFound("Opportunity not found"));
            return Ok(ApiResponse.OkNoData("Opportunity deleted"));
        }
    }

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

    // ==================== NOTIFICATIONS CONTROLLER ====================
    [ApiController]
    [Route("api/notifications")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;
        public NotificationsController(INotificationService notificationService) => _notificationService = notificationService;

        // GET /api/notifications
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var userId = GetUserId();
            var result = await _notificationService.GetAllAsync(userId);
            return Ok(ApiResponse<object>.Ok(result));
        }

        // PATCH /api/notifications/{id}/read
        [HttpPatch("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var userId = GetUserId();
            var success = await _notificationService.MarkAsReadAsync(id, userId);

            if (!success)
                return NotFound(ApiResponse<object>.NotFound("Notification not found"));

            return Ok(ApiResponse.OkNoData("Marked as read"));
        }

        // PATCH /api/notifications/read-all
        [HttpPatch("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = GetUserId();
            await _notificationService.MarkAllAsReadAsync(userId);
            return Ok(ApiResponse.OkNoData("All marked as read"));
        }

        // DELETE /api/notifications/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = GetUserId();
            var deleted = await _notificationService.DeleteAsync(id, userId);

            if (!deleted)
                return NotFound(ApiResponse<object>.NotFound("Notification not found"));

            return Ok(ApiResponse.OkNoData("Notification deleted"));
        }

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }

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
        public async Task<IActionResult> GetStats()
        {
            var userId = GetUserId();
            var result = await _dashboardService.GetStatsAsync(userId);
            return Ok(ApiResponse<object>.Ok(result));
        }

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
