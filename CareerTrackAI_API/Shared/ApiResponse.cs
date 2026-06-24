namespace CareerTrackAI.Shared
{
    /// <summary>
    /// الـ Response الموحد لجميع الـ Endpoints
    /// الفرونت اند يتوقع دائماً هذا الشكل
    /// </summary>
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public T? Data { get; set; }
        public string Message { get; set; } = string.Empty;
        public List<string> Errors { get; set; } = new();

        public static ApiResponse<T> Ok(T data, string message = "تم بنجاح") =>
            new() { Success = true, Data = data, Message = message };

        public static ApiResponse<T> Fail(string message, List<string>? errors = null) =>
            new() { Success = false, Message = message, Errors = errors ?? new() };

        public static ApiResponse<T> NotFound(string message = "العنصر غير موجود") =>
            new() { Success = false, Message = message };
    }

    // نسخة بدون data للعمليات التي ترجع فقط نجاح أو فشل (مثل الحذف)
    public class ApiResponse : ApiResponse<object>
    {
        public static ApiResponse OkNoData(string message = "تم بنجاح") =>
            new() { Success = true, Message = message };
    }
}
