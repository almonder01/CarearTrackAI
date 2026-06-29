using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml.Linq;

namespace CareerTrackAI.Services
{
    public interface IResumeTextExtractionService
    {
        Task<string?> ExtractAsync(string filePath, string fileType);
    }

    public class ResumeTextExtractionService : IResumeTextExtractionService
    {
        public async Task<string?> ExtractAsync(string filePath, string fileType)
        {
            try
            {
                if (!File.Exists(filePath)) return null;

                var normalized = fileType.Trim().ToLowerInvariant();
                var text = normalized == "docx"
                    ? ExtractDocx(filePath)
                    : await ExtractPdfAsync(filePath);

                text = NormalizeText(text);
                return string.IsNullOrWhiteSpace(text) ? null : text;
            }
            catch
            {
                return null;
            }
        }

        private static string? ExtractDocx(string filePath)
        {
            using var archive = ZipFile.OpenRead(filePath);
            var entry = archive.GetEntry("word/document.xml");
            if (entry == null) return null;

            using var stream = entry.Open();
            var doc = XDocument.Load(stream);
            XNamespace w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
            return string.Join(" ", doc.Descendants(w + "t").Select(node => node.Value));
        }

        private static async Task<string?> ExtractPdfAsync(string filePath)
        {
            var bytes = await File.ReadAllBytesAsync(filePath);
            var latin = Encoding.Latin1.GetString(bytes);
            var chunks = new List<string>();

            chunks.AddRange(ExtractPdfStringLiterals(latin));

            foreach (Match streamMatch in Regex.Matches(latin, @"stream\r?\n(?<data>.*?)\r?\nendstream", RegexOptions.Singleline))
            {
                var streamText = TryInflatePdfStream(streamMatch.Groups["data"].Value);
                if (!string.IsNullOrWhiteSpace(streamText))
                    chunks.AddRange(ExtractPdfStringLiterals(streamText));
            }

            return string.Join(" ", chunks);
        }

        private static IEnumerable<string> ExtractPdfStringLiterals(string text)
        {
            foreach (Match match in Regex.Matches(text, @"\((?<text>(?:\\.|[^\\)])*)\)\s*(?:Tj|'|""|TJ)?", RegexOptions.Singleline))
            {
                var value = DecodePdfString(match.Groups["text"].Value);
                if (LooksLikeHumanText(value)) yield return value;
            }
        }

        private static string? TryInflatePdfStream(string stream)
        {
            try
            {
                var bytes = Encoding.Latin1.GetBytes(stream.Trim('\r', '\n'));
                using var input = new MemoryStream(bytes);
                using var zlib = new ZLibStream(input, CompressionMode.Decompress);
                using var output = new MemoryStream();
                zlib.CopyTo(output);
                return Encoding.Latin1.GetString(output.ToArray());
            }
            catch
            {
                return null;
            }
        }

        private static string DecodePdfString(string value)
        {
            try
            {
                return Regex.Unescape(value)
                    .Replace("\\(", "(", StringComparison.Ordinal)
                    .Replace("\\)", ")", StringComparison.Ordinal)
                    .Replace("\\n", " ", StringComparison.Ordinal)
                    .Replace("\\r", " ", StringComparison.Ordinal)
                    .Replace("\\t", " ", StringComparison.Ordinal);
            }
            catch
            {
                return value
                    .Replace("\\(", "(", StringComparison.Ordinal)
                    .Replace("\\)", ")", StringComparison.Ordinal)
                    .Replace("\\n", " ", StringComparison.Ordinal)
                    .Replace("\\r", " ", StringComparison.Ordinal)
                    .Replace("\\t", " ", StringComparison.Ordinal);
            }
        }

        private static string NormalizeText(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;
            return Regex.Replace(value, @"\s+", " ").Trim();
        }

        private static bool LooksLikeHumanText(string value)
        {
            var letters = value.Count(char.IsLetter);
            return value.Length >= 2 && letters >= Math.Min(2, value.Length);
        }
    }
}
