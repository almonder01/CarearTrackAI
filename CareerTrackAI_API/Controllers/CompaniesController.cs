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
    // ==================== COMPANIES CONTROLLER ====================
    [ApiController]
    [Route("api/companies")]
    [Authorize]
    public class CompaniesController : ControllerBase
    {
        private readonly ICompanyService _companyService;
        private readonly IDataImportExportService _dataService;
        private readonly IAiSourcingService _aiSourcingService;
        public CompaniesController(ICompanyService companyService, IDataImportExportService dataService, IAiSourcingService aiSourcingService)
        {
            _companyService = companyService;
            _dataService = dataService;
            _aiSourcingService = aiSourcingService;
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

            var result = await _companyService.CreateAsync(null, request);
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

        // POST /api/companies/ai-source/search
        [HttpPost("ai-source/search")]
        public async Task<IActionResult> SearchCompaniesWithAi([FromBody] AiSourcingRequest request)
        {
            var result = await _aiSourcingService.SearchCompaniesAsync(GetUserId(), request);
            return Ok(ApiResponse<object>.Ok(result, "AI company sourcing search completed"));
        }

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
