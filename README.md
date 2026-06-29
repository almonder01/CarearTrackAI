# CareerTrackAI

CareerTrackAI is an AI-assisted career tracking platform for students and fresh graduates. It helps users discover real job and internship opportunities, build a personal company database, track applications, manage CVs, prepare for interviews, and use Gemini-powered assistance throughout the job search workflow.

## Project Overview

The project is built as a full-stack web application:

- **Backend:** ASP.NET Core Web API, Entity Framework Core, SQL Server, JWT authentication
- **Frontend:** React, Vite, Tailwind CSS, React Router, Axios
- **AI:** Google Gemini integration for chat, resume analysis, recommendations, cover letters, and sourcing support
- **External job sources:** Adzuna and JobDataLake

The application is designed around a practical user journey:

1. Create an account and complete the profile.
2. Upload and analyze a CV.
3. Import or discover companies and opportunities from Data Hub.
4. Review opportunities and track selected roles.
5. Move applications through Planning, Applied, Interview, Accepted, and Rejected.
6. Schedule interviews and generate AI preparation notes.
7. Use AI Studio for guidance, cover letters, and Gemini token checks.

## Main Features

- Secure authentication with access and refresh tokens
- Dashboard with real application statistics and activity charts
- Data Hub for CSV import, shared companies, Adzuna, JobDataLake, and AI sourcing
- Opportunities page with link verification, source filtering, CSV export, and bulk deletion
- Applications Kanban board with drag-and-drop and status updates
- Resume upload, text extraction, AI analysis, and physical file cleanup on delete
- Interview scheduling with meeting links, notes, AI prep, Markdown rendering, and expandable notes
- AI Studio with persistent chat, recommendations, Gemini token test, and cover letter generation
- Usage page for Gemini, Adzuna, and JobDataLake activity
- Settings for theme, density, AI panels, plans, and future API-key/payment flows
- Help page with guided usage steps

## Repository Structure

```text
CareerTrackAI/
|-- CareerTrackAI_API/          # ASP.NET Core backend
|-- CareerTrackAI_Frontend/     # React + Vite frontend
|-- README.md                   # Main GitHub project page
|-- .gitignore
`-- LICENSE
```

## Prerequisites

- .NET SDK compatible with the backend target framework
- SQL Server or SQL Server Express
- Node.js and npm
- A Gemini API key for live AI mode
- Optional: Adzuna and JobDataLake API credentials

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

Configure secrets using .NET user secrets when needed:

```powershell
dotnet user-secrets set "GoogleAI:ApiKey" "YOUR_GEMINI_KEY"
dotnet user-secrets set "Adzuna:AppId" "YOUR_ADZUNA_APP_ID"
dotnet user-secrets set "Adzuna:AppKey" "YOUR_ADZUNA_APP_KEY"
dotnet user-secrets set "JobDataLake:ApiKey" "YOUR_JOBDATALAKE_KEY"
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

Final mode uses real backend responses only:

```env
VITE_API_BASE_URL=http://localhost:5185/api
VITE_USE_MOCKS=false
```

## Important Notes

- Uploaded CV files are stored locally under `CareerTrackAI_API/wwwroot/uploads/` and are ignored by Git.
- The frontend `.env` file is ignored by Git. Use `.env.example` as the template.
- AI usage and external API usage are currently tracked in memory for the current backend runtime.
- Payment and plan enforcement are UI-ready but intentionally left for future integration.

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

## Future Improvements

- Persist Gemini, Adzuna, and JobDataLake usage in the database
- Add Stripe, Tap Payments, or Moyasar for paid plans
- Store user-provided API keys in an encrypted backend vault
- Add advanced cover-letter templates and downloadable outputs
- Add production deployment configuration
- Add automated backend and frontend tests

## License

This project is provided for academic and demonstration purposes. See `LICENSE` for details.
