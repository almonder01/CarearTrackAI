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
}
