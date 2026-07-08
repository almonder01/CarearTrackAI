using CareerTrackAI.DTOs.JobOpportunity;

namespace CareerTrackAI.Services
{
    public interface ILinkVerificationService
    {
        Task<LinkVerificationResponse> VerifyAsync(VerifyOpportunityLinkRequest request);
    }

    public class LinkVerificationService : ILinkVerificationService
    {
        private static readonly string[] ApplicationSignals =
        [
            "apply", "application", "careers", "career", "jobs", "job", "internship",
            "vacancy", "join us", "greenhouse", "lever.co", "workday", "smartrecruiters",
            "recruitee", "ashby", "bamboohr", "linkedin.com/jobs"
        ];

        private readonly IHttpClientFactory _factory;

        public LinkVerificationService(IHttpClientFactory factory)
        {
            _factory = factory;
        }

        public async Task<LinkVerificationResponse> VerifyAsync(VerifyOpportunityLinkRequest request)
        {
            var normalizedUrl = NormalizeUrl(request.Url);
            if (string.IsNullOrWhiteSpace(normalizedUrl))
            {
                return new LinkVerificationResponse
                {
                    Status = "Missing",
                    Message = "No usable URL was provided for this opportunity."
                };
            }

            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(8));
            var client = _factory.CreateClient("LinkVerifier");

            try
            {
                using var headRequest = new HttpRequestMessage(HttpMethod.Head, normalizedUrl);
                using var headResponse = await client.SendAsync(headRequest, HttpCompletionOption.ResponseHeadersRead, timeout.Token);
                if (IsSuccessful(headResponse))
                    return BuildResponse(normalizedUrl, headResponse, null);

                if ((int)headResponse.StatusCode is >= 400 and < 500)
                    return BuildResponse(normalizedUrl, headResponse, "The server reached the URL, but the page returned a client error.");
            }
            catch
            {
                // Some job boards block HEAD requests. GET below is the real fallback.
            }

            try
            {
                using var getRequest = new HttpRequestMessage(HttpMethod.Get, normalizedUrl);
                using var getResponse = await client.SendAsync(getRequest, HttpCompletionOption.ResponseHeadersRead, timeout.Token);
                var body = string.Empty;
                if (IsTextResponse(getResponse))
                {
                    body = await getResponse.Content.ReadAsStringAsync(timeout.Token);
                    if (body.Length > 12000) body = body[..12000];
                }

                return BuildResponse(normalizedUrl, getResponse, null, body, request);
            }
            catch (TaskCanceledException)
            {
                return new LinkVerificationResponse
                {
                    Status = "Timeout",
                    Message = "The link did not respond within the verification timeout.",
                    CheckedUrl = normalizedUrl,
                    TimedOut = true
                };
            }
            catch
            {
                return new LinkVerificationResponse
                {
                    Status = "Unreachable",
                    Message = "The app could not reach this URL. It may be offline, blocked, or malformed.",
                    CheckedUrl = normalizedUrl
                };
            }
        }

        private static LinkVerificationResponse BuildResponse(
            string checkedUrl,
            HttpResponseMessage response,
            string? overrideMessage,
            string? body = null,
            VerifyOpportunityLinkRequest? request = null)
        {
            var finalUrl = response.RequestMessage?.RequestUri?.ToString() ?? checkedUrl;
            var reachable = IsSuccessful(response);
            var signalSource = $"{checkedUrl} {finalUrl} {body ?? string.Empty}".ToLowerInvariant();
            var likely = reachable && ApplicationSignals.Any(signal => signalSource.Contains(signal));

            if (!likely && request != null)
            {
                var company = request.CompanyName?.Trim().ToLowerInvariant();
                var title = request.Title?.Trim().ToLowerInvariant();
                likely =
                    reachable &&
                    (!string.IsNullOrWhiteSpace(company) && signalSource.Contains(company) ||
                     !string.IsNullOrWhiteSpace(title) && signalSource.Contains(title));
            }

            var status = reachable
                ? likely ? "Verified" : "Reachable"
                : "Problem";

            var message = overrideMessage ?? status switch
            {
                "Verified" => "The URL is reachable and looks like a job, careers, or application page.",
                "Reachable" => "The URL is reachable, but it does not clearly look like an application page.",
                _ => "The URL responded, but not with a successful status."
            };

            return new LinkVerificationResponse
            {
                Status = status,
                Message = message,
                CheckedUrl = checkedUrl,
                FinalUrl = finalUrl,
                StatusCode = (int)response.StatusCode,
                IsReachable = reachable,
                IsLikelyApplicationLink = likely
            };
        }

        private static bool IsSuccessful(HttpResponseMessage response) =>
            (int)response.StatusCode is >= 200 and < 400;

        private static bool IsTextResponse(HttpResponseMessage response)
        {
            var mediaType = response.Content.Headers.ContentType?.MediaType ?? string.Empty;
            return mediaType.Contains("text", StringComparison.OrdinalIgnoreCase) ||
                   mediaType.Contains("html", StringComparison.OrdinalIgnoreCase) ||
                   mediaType.Contains("json", StringComparison.OrdinalIgnoreCase);
        }

        private static string? NormalizeUrl(string? value)
        {
            var text = value?.Trim();
            if (string.IsNullOrWhiteSpace(text)) return null;
            if (text.Equals("false", StringComparison.OrdinalIgnoreCase) ||
                text.Equals("true", StringComparison.OrdinalIgnoreCase) ||
                text.Equals("n/a", StringComparison.OrdinalIgnoreCase))
                return null;

            if (!text.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
                !text.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                text = $"https://{text}";

            return Uri.TryCreate(text, UriKind.Absolute, out var uri) &&
                   (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
                ? uri.ToString()
                : null;
        }
    }
}
