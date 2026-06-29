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

    // ==================== COMPANIES CONTROLLER ====================
    [ApiController]
    [Route("api/companies")]
    [Authorize]
    public class CompaniesController : ControllerBase
    {
        private readonly ICompanyService _companyService;
        private readonly IDataImportExportService _dataService;
        public CompaniesController(ICompanyService companyService, IDataImportExportService dataService)
        {
            _companyService = companyService;
            _dataService = dataService;
        }

        // GET /api/companies
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? industry,
            [FromQuery] string? city,
            [FromQuery] string? country,
            [FromQuery] bool includeShared = false)
        {
            var result = await _companyService.GetAllAsync(GetUserId(), industry, city, country, includeShared);
            return Ok(ApiResponse<object>.Ok(result));
        }

        // GET /api/companies/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _companyService.GetByIdAsync(id, GetUserId(), includeShared: true);
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

            var result = await _companyService.CreateAsync(GetUserId(), request);
            return CreatedAtAction(nameof(GetById), new { id = result.Id },
                ApiResponse<object>.Ok(result, "Company created"));
        }

        // POST /api/companies/{id}/save-to-workspace
        [HttpPost("{id}/save-to-workspace")]
        public async Task<IActionResult> SaveSharedToWorkspace(int id)
        {
            var result = await _companyService.SaveSharedAsync(id, GetUserId());
            if (result == null) return NotFound(ApiResponse<object>.NotFound("Shared company not found"));
            return Ok(ApiResponse<object>.Ok(result, "Company saved to your workspace"));
        }

        // PUT /api/companies/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateCompanyRequest request)
        {
            var result = await _companyService.UpdateAsync(id, GetUserId(), request);
            if (result == null) return NotFound(ApiResponse<object>.NotFound("Company not found"));
            return Ok(ApiResponse<object>.Ok(result, "Company updated"));
        }

        // DELETE /api/companies/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _companyService.DeleteAsync(id, GetUserId());
            if (!deleted) return NotFound(ApiResponse<object>.NotFound("Company not found"));
            return Ok(ApiResponse.OkNoData("Company deleted"));
        }

        // GET /api/companies/export-csv
        [HttpGet("export-csv")]
        public async Task<IActionResult> ExportCsv()
        {
            var csv = await _dataService.ExportCompaniesCsvAsync(GetUserId());
            return File(Encoding.UTF8.GetBytes(csv), "text/csv", "careertrack-companies.csv");
        }

        // POST /api/companies/import-csv - multipart/form-data with "file"
        [HttpPost("import-csv")]
        public async Task<IActionResult> ImportCsv(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(ApiResponse<object>.Fail("No file uploaded"));

            var result = await _dataService.ImportCompaniesCsvAsync(file, GetUserId());
            return Ok(ApiResponse<object>.Ok(result, "Companies imported"));
        }

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }

    // ==================== JOB OPPORTUNITIES CONTROLLER ====================
    [ApiController]
    [Route("api/job-opportunities")]
    [Authorize]
    public class JobOpportunitiesController : ControllerBase
    {
        private readonly IJobOpportunityService _jobService;
        private readonly IDataImportExportService _dataService;
        private readonly IAdzunaJobImportService _adzunaService;
        private readonly IJobDataLakeImportService _jobDataLakeService;
        private readonly IAiSourcingService _aiSourcingService;
        public JobOpportunitiesController(
            IJobOpportunityService jobService,
            IDataImportExportService dataService,
            IAdzunaJobImportService adzunaService,
            IJobDataLakeImportService jobDataLakeService,
            IAiSourcingService aiSourcingService)
        {
            _jobService = jobService;
            _dataService = dataService;
            _adzunaService = adzunaService;
            _jobDataLakeService = jobDataLakeService;
            _aiSourcingService = aiSourcingService;
        }

        // GET /api/job-opportunities
        // GET /api/job-opportunities?type=Internship
        // GET /api/job-opportunities?type=Job&employmentType=FullTime
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] OpportunityType? type,
            [FromQuery] EmploymentType? employmentType,
            [FromQuery] int? companyId,
            [FromQuery] bool includeShared = false)
        {
            var result = await _jobService.GetAllAsync(GetUserId(), type, employmentType, companyId, includeShared);
            return Ok(ApiResponse<object>.Ok(result));
        }

        // GET /api/job-opportunities/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _jobService.GetByIdAsync(id, GetUserId(), includeShared: true);
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

            var result = await _jobService.CreateAsync(GetUserId(), request);
            return CreatedAtAction(nameof(GetById), new { id = result.Id },
                ApiResponse<object>.Ok(result, "Opportunity created"));
        }

        // PUT /api/job-opportunities/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateJobOpportunityRequest request)
        {
            var result = await _jobService.UpdateAsync(id, GetUserId(), request);
            if (result == null) return NotFound(ApiResponse<object>.NotFound("Opportunity not found"));
            return Ok(ApiResponse<object>.Ok(result, "Opportunity updated"));
        }

        // DELETE /api/job-opportunities/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _jobService.DeleteAsync(id, GetUserId());
            if (!deleted) return NotFound(ApiResponse<object>.NotFound("Opportunity not found"));
            return Ok(ApiResponse.OkNoData("Opportunity deleted"));
        }

        // DELETE /api/job-opportunities/clear
        [HttpDelete("clear")]
        public async Task<IActionResult> DeleteAll()
        {
            var result = await _jobService.DeleteAllAsync(GetUserId());
            return Ok(ApiResponse<object>.Ok(result, "All personal opportunities deleted"));
        }

        // GET /api/job-opportunities/export-csv
        [HttpGet("export-csv")]
        public async Task<IActionResult> ExportCsv()
        {
            var csv = await _dataService.ExportJobOpportunitiesCsvAsync(GetUserId());
            return File(Encoding.UTF8.GetBytes(csv), "text/csv", "careertrack-opportunities.csv");
        }

        // POST /api/job-opportunities/import-csv - multipart/form-data with "file"
        [HttpPost("import-csv")]
        public async Task<IActionResult> ImportCsv(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(ApiResponse<object>.Fail("No file uploaded"));

            var result = await _dataService.ImportJobOpportunitiesCsvAsync(file, GetUserId());
            return Ok(ApiResponse<object>.Ok(result, "Opportunities imported"));
        }

        // GET /api/job-opportunities/adzuna/countries
        [HttpGet("adzuna/countries")]
        public IActionResult GetAdzunaCountries()
        {
            return Ok(ApiResponse<object>.Ok(_adzunaService.GetSupportedCountries()));
        }

        // GET /api/job-opportunities/adzuna/search?what=software&where=Singapore&country=sg&resultsPerPage=20
        [HttpGet("adzuna/search")]
        public async Task<IActionResult> SearchAdzuna(
            [FromQuery] string? what,
            [FromQuery] string? where,
            [FromQuery] string? country,
            [FromQuery] int resultsPerPage = 20,
            [FromQuery] int page = 1)
        {
            var result = await _adzunaService.SearchAsync(new AdzunaSearchRequest(what, where, resultsPerPage, page, Country: country), GetUserId());
            return Ok(ApiResponse<object>.Ok(result, "Adzuna search completed"));
        }

        // POST /api/job-opportunities/adzuna/import
        [HttpPost("adzuna/import")]
        public async Task<IActionResult> ImportAdzuna([FromBody] AdzunaSearchRequest request)
        {
            var result = await _adzunaService.ImportAsync(request, GetUserId());
            return Ok(ApiResponse<object>.Ok(result, "Adzuna opportunities imported"));
        }

        // GET /api/job-opportunities/jobdatalake/search
        [HttpGet("jobdatalake/search")]
        public async Task<IActionResult> SearchJobDataLake(
            [FromQuery] string? query,
            [FromQuery] string? semanticQuery,
            [FromQuery] string? country,
            [FromQuery] string? remoteType,
            [FromQuery] string? employmentType,
            [FromQuery] int perPage = 20,
            [FromQuery] int page = 1)
        {
            var request = new JobDataLakeSearchRequest(query, semanticQuery, country, remoteType, employmentType, perPage, page);
            var result = await _jobDataLakeService.SearchAsync(request, GetUserId());
            return Ok(ApiResponse<object>.Ok(result, "JobDataLake search completed"));
        }

        // POST /api/job-opportunities/jobdatalake/import
        [HttpPost("jobdatalake/import")]
        public async Task<IActionResult> ImportJobDataLake([FromBody] JobDataLakeSearchRequest request)
        {
            var result = await _jobDataLakeService.ImportAsync(request, GetUserId());
            return Ok(ApiResponse<object>.Ok(result, "JobDataLake opportunities imported"));
        }

        // POST /api/job-opportunities/ai-source/search
        [HttpPost("ai-source/search")]
        public async Task<IActionResult> SearchWithAi([FromBody] AiSourcingRequest request)
        {
            var userId = GetUserId();
            var result = await _aiSourcingService.SearchAsync(userId, request);
            return Ok(ApiResponse<object>.Ok(result, "AI sourcing search completed"));
        }

        // POST /api/job-opportunities/ai-source/import
        [HttpPost("ai-source/import")]
        public async Task<IActionResult> ImportWithAi([FromBody] AiSourcingRequest request)
        {
            var userId = GetUserId();
            var result = await _aiSourcingService.ImportAsync(userId, request);
            return Ok(ApiResponse<object>.Ok(result, "AI sourcing import completed"));
        }

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
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
