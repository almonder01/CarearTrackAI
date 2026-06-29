using System.Collections.Concurrent;

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

    public record GeminiUsageSummary(
        int Calls,
        int PromptTokens,
        int OutputTokens,
        int TotalTokens,
        List<GeminiUsageFeatureSummary> ByFeature,
        List<GeminiUsageEntry> Recent);

    public interface IGeminiUsageTracker
    {
        void Record(int userId, string feature, int promptTokens, int outputTokens, int totalTokens, string model);
        GeminiUsageSummary GetSummary(int userId);
    }

    public class InMemoryGeminiUsageTracker : IGeminiUsageTracker
    {
        private const int MaxEntries = 2000;
        private readonly ConcurrentQueue<GeminiUsageEntry> _entries = new();

        public void Record(int userId, string feature, int promptTokens, int outputTokens, int totalTokens, string model)
        {
            _entries.Enqueue(new GeminiUsageEntry(
                userId,
                feature,
                promptTokens,
                outputTokens,
                totalTokens,
                model,
                DateTime.UtcNow));

            while (_entries.Count > MaxEntries && _entries.TryDequeue(out _))
            {
            }
        }

        public GeminiUsageSummary GetSummary(int userId)
        {
            var userEntries = _entries
                .Where(entry => entry.UserId == userId)
                .OrderByDescending(entry => entry.CreatedAt)
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
                byFeature,
                userEntries.Take(10).ToList());
        }
    }
}
