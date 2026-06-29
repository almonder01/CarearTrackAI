# CareerTrackAI Database Design

This document describes the main database model used by CareerTrackAI.

## Design Principles

- Soft delete is used for most business records.
- Audit fields are inherited from `BaseEntity`.
- Enum values are stored as strings for readability.
- Dates are stored in UTC.
- Uploaded files are stored in local filesystem paths and referenced by URL in the database.
- User workspace data is scoped by `UserId`.
- Shared companies and opportunities use `UserId = null`.

## BaseEntity

Most models inherit:

```csharp
public int Id { get; set; }
public DateTime CreatedAt { get; set; }
public DateTime? UpdatedAt { get; set; }
public bool IsDeleted { get; set; }
public DateTime? DeletedAt { get; set; }
```

Global query filters hide soft-deleted records by default.

## Main Tables

### Users

Stores account and profile data.

Important fields:

- `FullName`
- `Email`
- `PasswordHash`
- `Role`
- `University`
- `Major`
- `City`
- `GraduationYear`
- `LastLoginAt`

Relationships:

- One user has many applications.
- One user has many resumes.
- One user has many notifications.
- One user may own companies and opportunities.

### Companies

Stores company intelligence.

Important fields:

- `UserId`
- `Name`
- `Industry`
- `Description`
- `City`
- `Country`
- `Website`
- `Email`
- `LinkedInUrl`
- `SourceProvider`

Rules:

- `UserId = null` means the company is shared.
- A user may save a shared company into a personal workspace.

### JobOpportunities

Stores internships and job opportunities.

Important fields:

- `UserId`
- `Title`
- `Description`
- `Type`
- `EmploymentType`
- `Location`
- `IsRemote`
- `ApplicationDeadline`
- `RequiredSkills`
- `JobUrl`
- `SourceUrl`
- `SourceProvider`
- `CompanyId`

Rules:

- `UserId = null` means the opportunity is shared.
- Personal opportunities can be tracked into Applications.
- Bulk deletion removes personal opportunities and linked user applications.

### Applications

Tracks a user's progress for a selected opportunity.

Important fields:

- `UserId`
- `JobOpportunityId`
- `Status`
- `StatusUpdatedAt`
- `AppliedAt`
- `Notes`
- `FollowUpSent`
- `ResumeId`
- `ResumeVersionId`

Rules:

- A user cannot track the same opportunity twice.
- The status pipeline is `Planning`, `Applied`, `Interview`, `Accepted`, `Rejected`.
- Moving to `Interview` makes the item visible in the Interviews page.

### Resumes

Stores original uploaded CV records.

Important fields:

- `UserId`
- `Label`
- `FileUrl`
- `FileType`
- `ParsedContent`
- `LastUsedAt`

Rules:

- Uploaded files are stored under `wwwroot/uploads/resumes/{userId}`.
- Deleting a resume soft-deletes the database record and physically removes the local file.
- Linked applications are detached from the deleted resume.

### ResumeVersions

Stores future AI-generated or tailored resume versions.

Important fields:

- `ResumeId`
- `VersionName`
- `FileUrl`
- `FileType`
- `IsAiGenerated`
- `TargetCompanyId`

Rules:

- Versions are soft-deleted when their parent resume is deleted.
- Version files are removed from local storage when deleted through the parent resume.

### Interviews

Stores scheduled interview details.

Important fields:

- `ApplicationId`
- `Title`
- `ScheduledAt`
- `DurationMinutes`
- `Type`
- `Location`
- `Notes`
- `ReminderSent`

Rules:

- Interviews belong to applications.
- If an application is deleted through opportunity cleanup, linked interviews are also soft-deleted.

### Notifications

Stores user notifications.

Important fields:

- `UserId`
- `Title`
- `Message`
- `Type`
- `IsRead`
- `Link`
- `ExpiresAt`

## Relationship Summary

```text
User 1 -> many Applications
User 1 -> many Resumes
User 1 -> many Notifications
User 1 -> many Companies
User 1 -> many JobOpportunities

Company 1 -> many JobOpportunities
JobOpportunity 1 -> many Applications
Application 1 -> many Interviews
Resume 1 -> many ResumeVersions
Resume 1 -> many Applications
ResumeVersion 1 -> many Applications
```

## Important Indexes

- `Users.Email` is unique.
- `Applications(UserId, JobOpportunityId)` is unique.
- `Applications.Status` supports Kanban filtering.
- `JobOpportunities.UserId` supports workspace filtering.
- `JobOpportunities.Type` supports opportunity filtering.
- `JobOpportunities.SourceProvider` supports source filtering.
- `Companies.UserId`, `Companies.Country`, `Companies.City`, and `Companies.Industry` support company search.

## Migrations

The `Migrations` folder should be committed, including `AppDbContextModelSnapshot.cs`.

Typical commands:

```powershell
dotnet ef migrations add MigrationName
dotnet ef database update
```

## Runtime Files

The following files should not be committed:

- `wwwroot/uploads/`
- `bin/`
- `obj/`
- local `.env` files
- local appsettings files containing secrets
