using System.Security.Claims;
using CareerTrackAI.DTOs.Resume;
using CareerTrackAI.Services;
using CareerTrackAI.Shared;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CareerTrackAI.Controllers
{
    [ApiController]
    [Route("api/resumes")]
    [Authorize]
    public class ResumesController : ControllerBase
    {
        private readonly IResumeService _resumeService;
        private readonly IResumeTextExtractionService _textExtractionService;
        private readonly IWebHostEnvironment _env;

        public ResumesController(IResumeService resumeService, IResumeTextExtractionService textExtractionService, IWebHostEnvironment env)
        {
            _resumeService = resumeService;
            _textExtractionService = textExtractionService;
            _env = env;
        }

        // GET /api/resumes
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var userId = GetUserId();
            var result = await _resumeService.GetAllAsync(userId);
            return Ok(ApiResponse<object>.Ok(result));
        }

        // GET /api/resumes/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var userId = GetUserId();
            var result = await _resumeService.GetByIdAsync(id, userId);

            if (result == null)
                return NotFound(ApiResponse<object>.NotFound("Resume not found"));

            return Ok(ApiResponse<object>.Ok(result));
        }

        // POST /api/resumes - multipart/form-data
        [HttpPost]
        public async Task<IActionResult> Upload([FromForm] string label, IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(ApiResponse<object>.Fail("No file uploaded"));

            var allowedTypes = new[] { "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
            if (!allowedTypes.Contains(file.ContentType))
                return BadRequest(ApiResponse<object>.Fail("Only PDF and DOCX files are allowed"));

            var userId = GetUserId();
            var saved = await SaveFileAsync(file, userId);
            var fileType = file.ContentType.Contains("pdf") ? "pdf" : "docx";
            string? parsedContent = null;
            try
            {
                parsedContent = await _textExtractionService.ExtractAsync(saved.FilePath, fileType);
            }
            catch
            {
                parsedContent = null;
            }

            var result = await _resumeService.CreateAsync(userId, label, saved.FileUrl, fileType, parsedContent);
            return CreatedAtAction(nameof(GetById), new { id = result.Id },
                ApiResponse<object>.Ok(result, string.IsNullOrWhiteSpace(parsedContent) ? "Resume uploaded, but text could not be extracted." : "Resume uploaded and text extracted"));
        }

        // DELETE /api/resumes/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = GetUserId();
            var deleted = await _resumeService.DeleteAsync(id, userId);

            if (!deleted)
                return NotFound(ApiResponse<object>.NotFound("Resume not found"));

            return Ok(ApiResponse.OkNoData("Resume deleted"));
        }

        // GET /api/resumes/{id}/versions
        [HttpGet("{id}/versions")]
        public async Task<IActionResult> GetVersions(int id)
        {
            var userId = GetUserId();
            var result = await _resumeService.GetVersionsAsync(id, userId);
            return Ok(ApiResponse<object>.Ok(result));
        }

        // POST /api/resumes/{id}/customize
        // يستدعي هذا الـ AiController لاحقاً - الآن يرجع placeholder
        [HttpPost("{id}/customize")]
        public async Task<IActionResult> Customize(int id, [FromBody] CustomizeResumeRequest request)
        {
            var userId = GetUserId();
            var resume = await _resumeService.GetByIdAsync(id, userId);

            if (resume == null)
                return NotFound(ApiResponse<object>.NotFound("Resume not found"));

            // TODO: استدعاء AI service وتوليد النسخة المخصصة
            return Ok(ApiResponse<object>.Ok(null, "AI customization will be implemented in AiController"));
        }

        // ==================== HELPERS ====================
        private async Task<(string FileUrl, string FilePath)> SaveFileAsync(IFormFile file, int userId)
        {
            var uploadsFolder = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads", "resumes", userId.ToString());
            Directory.CreateDirectory(uploadsFolder);

            var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            return ($"/uploads/resumes/{userId}/{fileName}", filePath);
        }

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
