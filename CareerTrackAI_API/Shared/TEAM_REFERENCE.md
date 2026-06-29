# CareerTrackAI Team Reference

This document summarizes the shared conventions used across the backend and frontend.

## Language

All user-facing application text should be written in English.

## Architecture

- Backend: ASP.NET Core Web API
- Database: SQL Server with Entity Framework Core
- Authentication: JWT access tokens and refresh tokens
- Frontend: React, Vite, Tailwind CSS, React Router, Axios
- AI provider: Google Gemini
- External job sources: Adzuna and JobDataLake

## Naming Conventions

Backend:

- Classes, records, and DTOs use `PascalCase`.
- Variables and parameters use `camelCase`.
- API routes use kebab-case where appropriate, such as `/api/job-opportunities`.
- Enums are serialized as strings.

Frontend:

- React components use `PascalCase`.
- Utility files use `camelCase`.
- Route paths use lowercase kebab-case.
- API fields are consumed using the backend response names.

## Main Entities

- `User` owns personal data, resumes, applications, notifications, and personal opportunities.
- `Company` can be personal or shared depending on `UserId`.
- `JobOpportunity` belongs to a company and may be personal or shared.
- `Application` tracks a user against one opportunity.
- `Resume` stores the original uploaded CV and extracted text.
- `ResumeVersion` stores future AI-tailored CV versions.
- `Interview` belongs to an application.
- `Notification` belongs to a user.

## Important Enums

`ApplicationStatus`:

- `Planning`
- `Applied`
- `Interview`
- `Accepted`
- `Rejected`

`OpportunityType`:

- `Internship`
- `Job`

`EmploymentType`:

- `FullTime`
- `PartTime`
- `Contract`

`InterviewType`:

- `Online`
- `OnSite`
- `Phone`

## Core Workflow

1. User registers and completes the profile.
2. User uploads a CV.
3. User imports or discovers companies and opportunities in Data Hub.
4. User reviews opportunities and tracks selected roles.
5. Applications move through the Kanban pipeline.
6. Interview-stage applications can be scheduled in Interviews.
7. AI Studio provides chat, recommendations, cover letters, and provider checks.

## API Response Format

Successful responses:

```json
{
  "success": true,
  "data": {},
  "message": "Completed successfully",
  "errors": []
}
```

Failed responses:

```json
{
  "success": false,
  "data": null,
  "message": "Something went wrong",
  "errors": ["Details"]
}
```

## Data Rules

- Most records use soft delete through `IsDeleted` and `DeletedAt`.
- Uploaded CV files are physically removed from local storage when a resume is deleted.
- Personal user files and `.env` files must not be committed to Git.
- Shared companies and shared opportunities should not automatically appear in a user's workspace unless requested.
- Payment logic is intentionally not finalized in this version.

## AI Rules

- Gemini should be configured through backend settings or user secrets.
- If Gemini is not configured, user-facing messages must be clear and non-technical.
- AI-generated recommendations and notes should be refreshed only when the user asks for them.
- AI content displayed in rich text areas should use Markdown rendering.
