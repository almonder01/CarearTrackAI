using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;
using CareerTrackAI.Data;
using CareerTrackAI.Services;

var builder = WebApplication.CreateBuilder(args);

// ==================== DATABASE ====================
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ==================== JWT AUTHENTICATION ====================
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"]!;

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// ==================== RATE LIMITING ====================
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var userKey = context.User?.Identity?.IsAuthenticated == true
            ? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            : null;
        var partitionKey = userKey ?? context.Connection.RemoteIpAddress?.ToString() ?? "anonymous";

        return RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 240,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 80,
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst
        });
    });
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync(
            "{\"success\":false,\"message\":\"Too many requests. Please wait a moment and try again.\"}",
            cancellationToken);
    };
});

// ==================== CORS ====================
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5174",
                "http://localhost:3000"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ==================== CONTROLLERS ====================
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter()
        );
        options.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

// ==================== AI (GEMINI via HttpClient) ====================
var googleApiKey = builder.Configuration["GoogleAI:ApiKey"]!;
var geminiModel = builder.Configuration["GoogleAI:ModelId"] ?? "gemini-2.5-flash";

builder.Services.AddHttpClient("Gemini", client =>
{
    client.BaseAddress = new Uri("https://generativelanguage.googleapis.com/");
    if (!string.IsNullOrWhiteSpace(googleApiKey))
    {
        client.DefaultRequestHeaders.Add("x-goog-api-key", googleApiKey);
    }
});

var adzunaOptions = new AdzunaOptions
{
    AppId = builder.Configuration["Adzuna:AppId"] ?? string.Empty,
    AppKey = builder.Configuration["Adzuna:AppKey"] ?? string.Empty,
    Country = builder.Configuration["Adzuna:Country"] ?? "sg"
};

builder.Services.AddHttpClient("Adzuna", client =>
{
    client.BaseAddress = new Uri("https://api.adzuna.com/");
});

builder.Services.AddSingleton(adzunaOptions);

var jobDataLakeOptions = new JobDataLakeOptions
{
    ApiKey = builder.Configuration["JobDataLake:ApiKey"] ?? string.Empty,
    BaseUrl = builder.Configuration["JobDataLake:BaseUrl"] ?? "https://api.jobdatalake.com/"
};

builder.Services.AddHttpClient("JobDataLake", client =>
{
    client.BaseAddress = new Uri(jobDataLakeOptions.BaseUrl);
});

builder.Services.AddSingleton(jobDataLakeOptions);

builder.Services.AddHttpClient("LinkVerifier", client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("CareerTrackAI-LinkVerifier/1.0");
});

builder.Services.AddSingleton(new GeminiOptions
{
    ModelId = geminiModel,
    IsConfigured = !string.IsNullOrWhiteSpace(googleApiKey)
});

// ==================== SERVICES ====================
builder.Services.AddScoped<IGeminiUsageTracker, DbGeminiUsageTracker>();
builder.Services.AddScoped<IApiUsageTracker, DbApiUsageTracker>();
builder.Services.AddScoped<IAiService, AiService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ICompanyService, CompanyService>();
builder.Services.AddScoped<IJobOpportunityService, JobOpportunityService>();
builder.Services.AddScoped<IApplicationService, ApplicationService>();
builder.Services.AddScoped<IResumeService, ResumeService>();
builder.Services.AddScoped<IResumeTextExtractionService, ResumeTextExtractionService>();
builder.Services.AddScoped<IInterviewService, InterviewService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IDataImportExportService, DataImportExportService>();
builder.Services.AddScoped<IAdzunaJobImportService, AdzunaJobImportService>();
builder.Services.AddScoped<IJobDataLakeImportService, JobDataLakeImportService>();
builder.Services.AddScoped<IAiSourcingService, AiSourcingService>();
builder.Services.AddScoped<ILinkVerificationService, LinkVerificationService>();
builder.Services.AddScoped<IAdminService, AdminService>();

// ==================== BUILD ====================
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("FrontendPolicy");
app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();
app.UseStaticFiles();
app.MapControllers();

await BootstrapAdminAsync(app);

app.Run();

static async Task BootstrapAdminAsync(WebApplication app)
{
    var email = app.Configuration["AdminBootstrap:Email"]?.Trim().ToLower();
    var password = app.Configuration["AdminBootstrap:Password"];
    var fullName = app.Configuration["AdminBootstrap:FullName"] ?? "CareerTrackAI Admin";
    if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password)) return;

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var user = await db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(item => item.Email == email);
    if (user == null)
    {
        db.Users.Add(new CareerTrackAI.Models.User
        {
            FullName = fullName,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = CareerTrackAI.Enums.UserRole.Admin
        });
    }
    else
    {
        user.IsDeleted = false;
        user.DeletedAt = null;
        user.Role = CareerTrackAI.Enums.UserRole.Admin;
        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
        user.UpdatedAt = DateTime.UtcNow;
    }

    await db.SaveChangesAsync();
}

public class GeminiOptions
{
    public string ModelId { get; set; } = "gemini-2.5-flash";
    public bool IsConfigured { get; set; }
}
