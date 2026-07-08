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
        private readonly ILinkVerificationService _linkVerificationService;
        public JobOpportunitiesController(
            IJobOpportunityService jobService,
            IDataImportExportService dataService,
            IAdzunaJobImportService adzunaService,
            IJobDataLakeImportService jobDataLakeService,
            IAiSourcingService aiSourcingService,
            ILinkVerificationService linkVerificationService)
        {
            _jobService = jobService;
            _dataService = dataService;
            _adzunaService = adzunaService;
            _jobDataLakeService = jobDataLakeService;
            _aiSourcingService = aiSourcingService;
            _linkVerificationService = linkVerificationService;
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

            var result = await _jobService.CreateAsync(null, request);
            return CreatedAtAction(nameof(GetById), new { id = result.Id },
                ApiResponse<object>.Ok(result, "Opportunity created"));
        }

        // POST /api/job-opportunities/{id}/save-to-workspace
        [HttpPost("{id}/save-to-workspace")]
        public async Task<IActionResult> SaveSharedToWorkspace(int id)
        {
            var result = await _jobService.SaveSharedAsync(id, GetUserId());
            if (result == null) return NotFound(ApiResponse<object>.NotFound("Shared opportunity not found"));
            return Ok(ApiResponse<object>.Ok(result, "Opportunity saved to your workspace"));
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

        // POST /api/job-opportunities/verify-link
        [HttpPost("verify-link")]
        public async Task<IActionResult> VerifyLink([FromBody] VerifyOpportunityLinkRequest request)
        {
            var result = await _linkVerificationService.VerifyAsync(request);
            return Ok(ApiResponse<object>.Ok(result, "Link verification completed"));
        }

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
