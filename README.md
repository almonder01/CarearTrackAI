# CareerTrackAI

CareerTrackAI is an AI-assisted career tracking platform for students and fresh graduates. It helps users discover real companies and opportunities, manage CVs, track applications, prepare for interviews, and use a contextual Gemini-powered assistant throughout the job search workflow.

The project is built as a full-stack academic system with a real backend, real database persistence, external job APIs, admin management, usage tracking, and a modern React frontend.

## Project Overview

CareerTrackAI organizes the job search into one practical flow:

1. Register and complete the career profile.
2. Upload and analyze a CV.
3. Discover or import companies and opportunities.
4. Review opportunities and save selected rows into the personal workspace.
5. Track applications through Planning, Applied, Interview, Accepted, and Rejected.
6. Schedule interviews and generate AI preparation notes.
7. Use AI Studio or the floating AI Agent for contextual help.
8. Monitor AI and external API usage.

## Tech Stack

### Backend

- ASP.NET Core Web API
- Entity Framework Core
- SQL Server
- JWT authentication and refresh tokens
- BCrypt password hashing
- ASP.NET Core rate limiting
- Google Gemini through the Generative Language API
- Adzuna API
- JobDataLake API

### Frontend

- React
- Vite
- Tailwind CSS
- React Router
- Axios
- Recharts
- dnd-kit
- lucide-react
- react-markdown with remark-gfm

## Main Features

- Authentication with JWT access tokens and refresh tokens
- User profile with major, city, university, graduation year, career objective, and notification preference
- Dashboard with real application metrics, charts, and first-run checklist
- Data Hub for CSV import/export, shared companies, shared opportunities, unified Sourcing with Adzuna/JobDataLake/AI scouts, and AI field completion
- Opportunities page with source filters, link verification, AI link finding, track-as-application, CSV export, and bulk deletion with warning
- Applications Kanban board for Planning, Applied, Interview, Accepted, and Rejected statuses
- Resume upload, DOCX/PDF text extraction, Gemini file fallback, AI analysis score, AI-generated DOCX resume versions, modal preview, per-version delete, Last used tracking, and physical file cleanup on delete
- Interview scheduling with meeting links, preparation notes, AI prep notes, Markdown rendering, and expandable notes
- AI Studio with persistent chat, recommendations, cover letter generation, and Gemini connection test
- Floating AI Agent with site-wide contextual guidance
- Usage page for Gemini, Adzuna, and JobDataLake activity by day, month, or year
- Admin dashboard for user management, shared database management, and AI-based notification matching
- Help page with step-by-step usage guidance
- Dark mode, responsive layout, collapsible sidebar, and user-scoped persisted AI UI state

## AI Features

CareerTrackAI uses Gemini for several focused workflows:

- Career chat scoped to CareerTrackAI and the current user's workspace
- Floating AI Agent that includes the current page path
- Embedded AI panels with Refresh and Clear behavior
- Resume analysis using a 100-point employer-style rubric
- AI resume version generation that uses the analysis rubric, cleans Markdown artifacts, and writes ATS-friendly DOCX files
- Cover letter generation from profile, resume, and selected opportunity
- Personalized recommendations
- AI sourcing plan generation
- Public Google/LinkedIn-style web scouting through Gemini Google Search grounding
- AI company scouting
- AI completion of missing CSV fields
- AI Find Link for opportunities without URLs
- Interview preparation notes
- Admin opportunity-to-user notification matching

The app also includes real HTTP link verification for existing opportunity URLs. This is not only a prompt: the backend performs HEAD/GET requests, checks status codes, follows final URLs, and looks for application-page signals.

## Repository Structure

```text
CareerTrackAI/
|-- CareerTrackAI_API/          # ASP.NET Core backend
|-- CareerTrackAI_Frontend/     # React + Vite frontend
|-- Reports/                    # Final Word reports
|-- README.md                   # GitHub project page
|-- .gitignore
`-- LICENSE
```

## Generated Reports

The final English Word reports are available in:

- `Reports/CareerTrackAI_Project_Completion_Report.docx`
- `Reports/CareerTrackAI_Feature_Technical_Report.docx`
- `Reports/CareerTrackAI_Presentation_Brief.docx`

## Prerequisites

- .NET SDK compatible with the backend target framework
- SQL Server or SQL Server Express
- Node.js and npm
- Gemini API key for live AI features
- Optional Adzuna credentials
- Optional JobDataLake API key

## Backend Setup

From the project root:

```powershell
cd CareerTrackAI_API
dotnet restore
dotnet ef database update
dotnet run
```

The frontend expects the API at:

```text
http://localhost:5185/api
```

Recommended local secrets:

```powershell
dotnet user-secrets set "GoogleAI:ApiKey" "YOUR_GEMINI_KEY"
dotnet user-secrets set "GoogleAI:ModelId" "gemini-2.5-flash"
dotnet user-secrets set "Adzuna:AppId" "YOUR_ADZUNA_APP_ID"
dotnet user-secrets set "Adzuna:AppKey" "YOUR_ADZUNA_APP_KEY"
dotnet user-secrets set "Adzuna:Country" "sg"
dotnet user-secrets set "JobDataLake:ApiKey" "YOUR_JOBDATALAKE_KEY"
dotnet user-secrets set "AdminBootstrap:Email" "admin@example.com"
dotnet user-secrets set "AdminBootstrap:Password" "StrongAdminPassword"
dotnet user-secrets set "AdminBootstrap:FullName" "CareerTrackAI Admin"
```

## Frontend Setup

```powershell
cd CareerTrackAI_Frontend
npm install
npm run dev
```

The Vite development server is configured to run on:

```text
http://localhost:5174
```

Use `.env` from `.env.example` when needed:

```env
VITE_API_BASE_URL=http://localhost:5185/api
```

## Verification Commands

Frontend:

```powershell
cd CareerTrackAI_Frontend
npm run lint
npm run build
```

Backend:

```powershell
dotnet build .\CareerTrackAI_API\CareerTrackAI_API.csproj --no-restore
```

## Current Limitations

- Payment and plan enforcement are intentionally deferred.
- Personal user-provided Gemini API keys need a secure encrypted backend vault before production use.
- Uploaded CVs and AI-generated resume versions are stored locally under `CareerTrackAI_API/wwwroot/uploads/`.
- Browser inline preview is reliable for PDF files; DOCX versions are provided through the same preview modal with download/open controls because local DOCX rendering depends on the user's system.
- External API quality depends on Adzuna, JobDataLake, and Gemini availability or quota.
- Production deployment, CI/CD, monitoring, and automated test coverage should be added before real public release.

## Future Enhancements

- Add Stripe, Tap Payments, Moyasar, or another payment gateway.
- Store personal API keys securely in the backend with encryption.
- Move uploaded files to cloud object storage.
- Add automated backend, frontend, and end-to-end tests.
- Add background jobs for reminders, notifications, and large AI scoring tasks.
- Add semantic matching with embeddings or vector search for CV-to-opportunity fit.

## License

This project is provided for academic and demonstration purposes. See `LICENSE` for details.
