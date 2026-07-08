using System.Globalization;
using CareerTrackAI.Data;
using CareerTrackAI.Models;
using Microsoft.EntityFrameworkCore;

namespace CareerTrackAI.Services
{
    public record ApiUsageEntry(
        int UserId,
        string Provider,
        string Operation,
        int Requests,
        int Matched,
        int Imported,
        int Errors,
        string? Message,
        DateTime CreatedAt);

    public record ApiUsageTimelinePoint(
        string Label,
        string Grain,
        DateTime From,
        DateTime To,
        int Requests,
        int Matched,
        int Imported,
        int Errors);

    public record ApiUsageProviderSummary(
        string Provider,
        int Requests,
        int Matched,
        int Imported,
        int Errors,
        List<ApiUsageEntry> Recent,
        List<ApiUsageTimelinePoint> Timeline);

    public record ApiUsageSummary(
        int Requests,
        int Matched,
        int Imported,
        int Errors,
        string Grain,
        DateTime StartedAt,
        List<ApiUsageTimelinePoint> Timeline,
        List<ApiUsageProviderSummary> Providers);

    public interface IApiUsageTracker
    {
        void Record(int userId, string provider, string operation, int requests = 1, int matched = 0, int imported = 0, int errors = 0, string? message = null);
        ApiUsageSummary GetSummary(int userId, DateTime userCreatedAt, string? grain);
    }

    public class DbApiUsageTracker : IApiUsageTracker
    {
        private readonly AppDbContext _db;

        public DbApiUsageTracker(AppDbContext db)
        {
            _db = db;
        }

        public void Record(int userId, string provider, string operation, int requests = 1, int matched = 0, int imported = 0, int errors = 0, string? message = null)
        {
            if (userId <= 0)
                return;

            var log = new ApiUsageLog
            {
                UserId = userId,
                Provider = string.IsNullOrWhiteSpace(provider) ? "External API" : provider.Trim(),
                Operation = string.IsNullOrWhiteSpace(operation) ? "request" : operation.Trim(),
                Requests = Math.Max(0, requests),
                Matched = Math.Max(0, matched),
                Imported = Math.Max(0, imported),
                Errors = Math.Max(0, errors),
                Message = TrimMessage(message),
                CreatedAt = DateTime.UtcNow
            };

            try
            {
                _db.ApiUsageLogs.Add(log);
                _db.SaveChanges();
            }
            catch
            {
                _db.Entry(log).State = EntityState.Detached;
            }
        }

        public ApiUsageSummary GetSummary(int userId, DateTime userCreatedAt, string? grain)
        {
            var normalizedGrain = NormalizeGrain(grain);
            var startedAt = AlignStart(ToUtc(userCreatedAt), normalizedGrain);
            var now = DateTime.UtcNow;

            var userEntries = _db.ApiUsageLogs
                .AsNoTracking()
                .Where(entry => entry.UserId == userId && entry.CreatedAt >= startedAt)
                .OrderByDescending(entry => entry.CreatedAt)
                .Select(entry => new ApiUsageEntry(
                    entry.UserId,
                    entry.Provider,
                    entry.Operation,
                    entry.Requests,
                    entry.Matched,
                    entry.Imported,
                    entry.Errors,
                    entry.Message,
                    entry.CreatedAt))
                .ToList();

            var providers = userEntries
                .GroupBy(entry => entry.Provider)
                .Select(group => new ApiUsageProviderSummary(
                    group.Key,
                    group.Sum(entry => entry.Requests),
                    group.Sum(entry => entry.Matched),
                    group.Sum(entry => entry.Imported),
                    group.Sum(entry => entry.Errors),
                    group.Take(10).ToList(),
                    BuildTimeline(group.ToList(), startedAt, now, normalizedGrain)))
                .OrderBy(summary => summary.Provider)
                .ToList();

            return new ApiUsageSummary(
                userEntries.Sum(entry => entry.Requests),
                userEntries.Sum(entry => entry.Matched),
                userEntries.Sum(entry => entry.Imported),
                userEntries.Sum(entry => entry.Errors),
                normalizedGrain,
                startedAt,
                BuildTimeline(userEntries, startedAt, now, normalizedGrain),
                providers);
        }

        private static List<ApiUsageTimelinePoint> BuildTimeline(
            List<ApiUsageEntry> entries,
            DateTime startedAt,
            DateTime now,
            string grain)
        {
            var grouped = entries
                .GroupBy(entry => BucketKey(ToUtc(entry.CreatedAt), grain))
                .ToDictionary(
                    group => group.Key,
                    group => new
                    {
                        Requests = group.Sum(entry => entry.Requests),
                        Matched = group.Sum(entry => entry.Matched),
                        Imported = group.Sum(entry => entry.Imported),
                        Errors = group.Sum(entry => entry.Errors)
                    });

            var timeline = new List<ApiUsageTimelinePoint>();
            for (var cursor = startedAt; cursor <= now; cursor = NextBucket(cursor, grain))
            {
                var to = NextBucket(cursor, grain);
                grouped.TryGetValue(BucketKey(cursor, grain), out var value);
                timeline.Add(new ApiUsageTimelinePoint(
                    FormatLabel(cursor, grain),
                    grain,
                    cursor,
                    to,
                    value?.Requests ?? 0,
                    value?.Matched ?? 0,
                    value?.Imported ?? 0,
                    value?.Errors ?? 0));
            }

            return timeline;
        }

        private static string NormalizeGrain(string? grain)
        {
            var value = (grain ?? "day").Trim().ToLowerInvariant();
            return value is "month" or "year" ? value : "day";
        }

        private static DateTime AlignStart(DateTime value, string grain) => grain switch
        {
            "year" => new DateTime(value.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            "month" => new DateTime(value.Year, value.Month, 1, 0, 0, 0, DateTimeKind.Utc),
            _ => value.Date
        };

        private static DateTime NextBucket(DateTime value, string grain) => grain switch
        {
            "year" => value.AddYears(1),
            "month" => value.AddMonths(1),
            _ => value.AddDays(1)
        };

        private static string BucketKey(DateTime value, string grain)
        {
            var aligned = AlignStart(value, grain);
            return grain switch
            {
                "year" => aligned.ToString("yyyy", CultureInfo.InvariantCulture),
                "month" => aligned.ToString("yyyy-MM", CultureInfo.InvariantCulture),
                _ => aligned.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
            };
        }

        private static string FormatLabel(DateTime value, string grain) => grain switch
        {
            "year" => value.ToString("yyyy", CultureInfo.InvariantCulture),
            "month" => value.ToString("MMM yyyy", CultureInfo.InvariantCulture),
            _ => value.ToString("MMM d", CultureInfo.InvariantCulture)
        };

        private static string? TrimMessage(string? message)
        {
            if (string.IsNullOrWhiteSpace(message))
                return null;

            var trimmed = message.Trim();
            return trimmed.Length <= 500 ? trimmed : trimmed[..500];
        }

        private static DateTime ToUtc(DateTime value)
        {
            if (value.Kind == DateTimeKind.Utc) return value;
            if (value.Kind == DateTimeKind.Local) return value.ToUniversalTime();
            return DateTime.SpecifyKind(value, DateTimeKind.Utc);
        }
    }
}
