using System.Globalization;
using CareerTrackAI.Data;
using CareerTrackAI.Models;
using Microsoft.EntityFrameworkCore;

namespace CareerTrackAI.Services
{
    public record GeminiUsageEntry(
        int UserId,
        string Feature,
        int PromptTokens,
        int OutputTokens,
        int TotalTokens,
        string Model,
        DateTime CreatedAt);

    public record GeminiUsageFeatureSummary(
        string Feature,
        int Calls,
        int PromptTokens,
        int OutputTokens,
        int TotalTokens);

    public record GeminiUsageTimelinePoint(
        string Label,
        string Grain,
        DateTime From,
        DateTime To,
        int Calls,
        int PromptTokens,
        int OutputTokens,
        int TotalTokens);

    public record GeminiUsageSummary(
        int Calls,
        int PromptTokens,
        int OutputTokens,
        int TotalTokens,
        string Grain,
        DateTime StartedAt,
        List<GeminiUsageFeatureSummary> ByFeature,
        List<GeminiUsageTimelinePoint> Timeline,
        List<GeminiUsageEntry> Recent);

    public interface IGeminiUsageTracker
    {
        void Record(int userId, string feature, int promptTokens, int outputTokens, int totalTokens, string model);
        GeminiUsageSummary GetSummary(int userId, DateTime userCreatedAt, string? grain);
    }

    public class DbGeminiUsageTracker : IGeminiUsageTracker
    {
        private readonly AppDbContext _db;

        public DbGeminiUsageTracker(AppDbContext db)
        {
            _db = db;
        }

        public void Record(int userId, string feature, int promptTokens, int outputTokens, int totalTokens, string model)
        {
            if (userId <= 0 || totalTokens <= 0)
                return;

            var log = new GeminiUsageLog
            {
                UserId = userId,
                Feature = string.IsNullOrWhiteSpace(feature) ? "Gemini" : feature.Trim(),
                PromptTokens = Math.Max(0, promptTokens),
                OutputTokens = Math.Max(0, outputTokens),
                TotalTokens = Math.Max(0, totalTokens),
                Model = string.IsNullOrWhiteSpace(model) ? "Gemini" : model.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            try
            {
                _db.GeminiUsageLogs.Add(log);
                _db.SaveChanges();
            }
            catch
            {
                _db.Entry(log).State = EntityState.Detached;
            }
        }

        public GeminiUsageSummary GetSummary(int userId, DateTime userCreatedAt, string? grain)
        {
            var normalizedGrain = NormalizeGrain(grain);
            var startedAt = AlignStart(ToUtc(userCreatedAt), normalizedGrain);
            var now = DateTime.UtcNow;

            var userEntries = _db.GeminiUsageLogs
                .AsNoTracking()
                .Where(entry => entry.UserId == userId && entry.CreatedAt >= startedAt)
                .OrderByDescending(entry => entry.CreatedAt)
                .Select(entry => new GeminiUsageEntry(
                    entry.UserId,
                    entry.Feature,
                    entry.PromptTokens,
                    entry.OutputTokens,
                    entry.TotalTokens,
                    entry.Model,
                    entry.CreatedAt))
                .ToList();

            var byFeature = userEntries
                .GroupBy(entry => entry.Feature)
                .Select(group => new GeminiUsageFeatureSummary(
                    group.Key,
                    group.Count(),
                    group.Sum(entry => entry.PromptTokens),
                    group.Sum(entry => entry.OutputTokens),
                    group.Sum(entry => entry.TotalTokens)))
                .OrderByDescending(summary => summary.TotalTokens)
                .ToList();

            return new GeminiUsageSummary(
                userEntries.Count,
                userEntries.Sum(entry => entry.PromptTokens),
                userEntries.Sum(entry => entry.OutputTokens),
                userEntries.Sum(entry => entry.TotalTokens),
                normalizedGrain,
                startedAt,
                byFeature,
                BuildTimeline(userEntries, startedAt, now, normalizedGrain),
                userEntries.Take(10).ToList());
        }

        private static List<GeminiUsageTimelinePoint> BuildTimeline(
            List<GeminiUsageEntry> entries,
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
                        Calls = group.Count(),
                        PromptTokens = group.Sum(entry => entry.PromptTokens),
                        OutputTokens = group.Sum(entry => entry.OutputTokens),
                        TotalTokens = group.Sum(entry => entry.TotalTokens)
                    });

            var timeline = new List<GeminiUsageTimelinePoint>();
            for (var cursor = startedAt; cursor <= now; cursor = NextBucket(cursor, grain))
            {
                var to = NextBucket(cursor, grain);
                grouped.TryGetValue(BucketKey(cursor, grain), out var value);
                timeline.Add(new GeminiUsageTimelinePoint(
                    FormatLabel(cursor, grain),
                    grain,
                    cursor,
                    to,
                    value?.Calls ?? 0,
                    value?.PromptTokens ?? 0,
                    value?.OutputTokens ?? 0,
                    value?.TotalTokens ?? 0));
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

        private static DateTime ToUtc(DateTime value)
        {
            if (value.Kind == DateTimeKind.Utc) return value;
            if (value.Kind == DateTimeKind.Local) return value.ToUniversalTime();
            return DateTime.SpecifyKind(value, DateTimeKind.Utc);
        }
    }
}
