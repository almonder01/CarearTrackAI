using System.Collections.Concurrent;

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

    public record ApiUsageProviderSummary(
        string Provider,
        int Requests,
        int Matched,
        int Imported,
        int Errors,
        List<ApiUsageEntry> Recent);

    public record ApiUsageSummary(
        int Requests,
        int Matched,
        int Imported,
        int Errors,
        List<ApiUsageProviderSummary> Providers);

    public interface IApiUsageTracker
    {
        void Record(int userId, string provider, string operation, int requests = 1, int matched = 0, int imported = 0, int errors = 0, string? message = null);
        ApiUsageSummary GetSummary(int userId);
    }

    public class InMemoryApiUsageTracker : IApiUsageTracker
    {
        private const int MaxEntries = 3000;
        private readonly ConcurrentQueue<ApiUsageEntry> _entries = new();

        public void Record(int userId, string provider, string operation, int requests = 1, int matched = 0, int imported = 0, int errors = 0, string? message = null)
        {
            _entries.Enqueue(new ApiUsageEntry(userId, provider, operation, requests, matched, imported, errors, message, DateTime.UtcNow));

            while (_entries.Count > MaxEntries && _entries.TryDequeue(out _))
            {
            }
        }

        public ApiUsageSummary GetSummary(int userId)
        {
            var userEntries = _entries
                .Where(entry => entry.UserId == userId)
                .OrderByDescending(entry => entry.CreatedAt)
                .ToList();

            var providers = userEntries
                .GroupBy(entry => entry.Provider)
                .Select(group => new ApiUsageProviderSummary(
                    group.Key,
                    group.Sum(entry => entry.Requests),
                    group.Sum(entry => entry.Matched),
                    group.Sum(entry => entry.Imported),
                    group.Sum(entry => entry.Errors),
                    group.Take(10).ToList()))
                .OrderBy(summary => summary.Provider)
                .ToList();

            return new ApiUsageSummary(
                userEntries.Sum(entry => entry.Requests),
                userEntries.Sum(entry => entry.Matched),
                userEntries.Sum(entry => entry.Imported),
                userEntries.Sum(entry => entry.Errors),
                providers);
        }
    }
}
