namespace CareerTrackAI.Shared
{

    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public T? Data { get; set; }
        public string Message { get; set; } = string.Empty;
        public List<string> Errors { get; set; } = new();

        public static ApiResponse<T> Ok(T data, string message = "Successfully completed") =>
            new() { Success = true, Data = data, Message = message };

        public static ApiResponse<T> Fail(string message, List<string>? errors = null) =>
            new() { Success = false, Message = message, Errors = errors ?? new() };

        public static ApiResponse<T> NotFound(string message = "The element doesn't exist") =>
            new() { Success = false, Message = message };
    }

    public class ApiResponse : ApiResponse<object>
    {
        public static ApiResponse OkNoData(string message = "Successfully completed") =>
            new() { Success = true, Message = message };
    }
}
