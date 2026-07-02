using System.Security.Claims;
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

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _resumeService.GetAllAsync(GetUserId());
            return Ok(ApiResponse<object>.Ok(result));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _resumeService.GetByIdAsync(id, GetUserId());
            return result == null
                ? NotFound(ApiResponse<object>.NotFound("Resume not found"))
                : Ok(ApiResponse<object>.Ok(result));
        }

        [HttpPost]
        public async Task<IActionResult> Upload([FromForm] string label, IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(ApiResponse<object>.Fail("No file uploaded"));

            var allowedTypes = new[]
            {
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            };
            if (!allowedTypes.Contains(file.ContentType))
                return BadRequest(ApiResponse<object>.Fail("Only PDF and DOCX files are allowed"));

            var userId = GetUserId();
            var saved = await SaveFileAsync(file, userId);
            var fileType = file.ContentType.Contains("pdf", StringComparison.OrdinalIgnoreCase) ? "pdf" : "docx";
            string? parsedContent;
            try
            {
                parsedContent = await _textExtractionService.ExtractAsync(saved.FilePath, fileType);
            }
            catch
            {
                parsedContent = null;
            }

            var result = await _resumeService.CreateAsync(userId, label, saved.FileUrl, fileType, parsedContent);
            var message = string.IsNullOrWhiteSpace(parsedContent)
                ? "Resume uploaded, but text could not be extracted."
                : "Resume uploaded and text extracted";

            return CreatedAtAction(nameof(GetById), new { id = result.Id }, ApiResponse<object>.Ok(result, message));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _resumeService.DeleteAsync(id, GetUserId());
            return deleted
                ? Ok(ApiResponse.OkNoData("Resume deleted"))
                : NotFound(ApiResponse<object>.NotFound("Resume not found"));
        }

        [HttpGet("{id}/versions")]
        public async Task<IActionResult> GetVersions(int id)
        {
            var result = await _resumeService.GetVersionsAsync(id, GetUserId());
            return Ok(ApiResponse<object>.Ok(result));
        }

        private async Task<(string FileUrl, string FilePath)> SaveFileAsync(IFormFile file, int userId)
        {
            var uploadsFolder = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads", "resumes", userId.ToString());
            Directory.CreateDirectory(uploadsFolder);

            var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            await using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            return ($"/uploads/resumes/{userId}/{fileName}", filePath);
        }

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
