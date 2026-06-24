# Database Design Reference

# لغة البرنامج بالانجليزية بالكامل

**CareerTrackAI** | هذا الملف هو المرجع الرسمي لقاعدة البيانات قبل وبعد Migration.

---

## مبادئ التصميم

| المبدأ              | التطبيق                                                                          |
| ------------------- | -------------------------------------------------------------------------------- |
| Soft Delete         | كل الجداول تحتوي `IsDeleted` - لا حذف فعلي إلا في RefreshToken                   |
| Audit Fields        | كل الجداول ترث `BaseEntity` → `CreatedAt`, `UpdatedAt`, `IsDeleted`, `DeletedAt` |
| Enums as String     | كل الـ Enums تُخزن كـ String في DB للوضوح                                        |
| UTC Dates           | جميع التواريخ بتوقيت UTC - الفرونت اند يتولى التحويل                             |
| Company هو كيان عام | لا `UserId` في Company - مشتركة بين كل المستخدمين                                |

---

## BaseEntity - الكلاس الأساسي

يرث منه كل model (ما عدا RefreshToken):

| الحقل     | النوع     | الوصف               |
| --------- | --------- | ------------------- |
| Id        | int       | PK, Auto-increment  |
| CreatedAt | DateTime  | UTC - وقت الإنشاء   |
| UpdatedAt | DateTime? | UTC - وقت آخر تعديل |
| IsDeleted | bool      | default: false      |
| DeletedAt | DateTime? | UTC - وقت الحذف     |

---

## الجداول

---

### Users

| الحقل          | النوع         | القيود                       | الوصف                     |
| -------------- | ------------- | ---------------------------- | ------------------------- |
| Id             | int           | PK                           |                           |
| FullName       | nvarchar(150) | NOT NULL                     |                           |
| Email          | nvarchar(255) | NOT NULL, UNIQUE             |                           |
| PasswordHash   | nvarchar(max) | NOT NULL                     |                           |
| Role           | nvarchar(20)  | NOT NULL, default: 'Student' | Student / Admin           |
| University     | nvarchar(200) | NULL                         | للذكاء الاصطناعي          |
| Major          | nvarchar(200) | NULL                         | التخصص - للذكاء الاصطناعي |
| City           | nvarchar(100) | NULL                         | للتوصيات الجغرافية        |
| GraduationYear | int           | NULL                         |                           |
| LastLoginAt    | DateTime      | NULL                         |                           |
| CreatedAt      | DateTime      | NOT NULL                     | من BaseEntity             |
| UpdatedAt      | DateTime      | NULL                         | من BaseEntity             |
| IsDeleted      | bool          | NOT NULL, default: false     | من BaseEntity             |
| DeletedAt      | DateTime      | NULL                         | من BaseEntity             |

**Indexes:**

- `IX_Users_Email` → UNIQUE

---

### RefreshTokens

> لا يرث BaseEntity - لا Soft Delete، السجلات المنتهية تُحذف فعلياً بـ background job.

| الحقل     | النوع         | القيود           | الوصف       |
| --------- | ------------- | ---------------- | ----------- |
| Id        | int           | PK               |             |
| Token     | nvarchar(max) | NOT NULL, UNIQUE |             |
| ExpiresAt | DateTime      | NOT NULL         |             |
| RevokedAt | DateTime      | NULL             | null = صالح |
| CreatedAt | DateTime      | NOT NULL         |             |
| UserId    | int           | FK → Users       |             |

**Indexes:**

- `IX_RefreshTokens_Token` → UNIQUE

**Computed (لا تُخزن في DB):**

- `IsExpired` = `DateTime.UtcNow >= ExpiresAt`
- `IsRevoked` = `RevokedAt != null`
- `IsActive` = `!IsExpired && !IsRevoked`

---

### Companies

| الحقل       | النوع         | القيود                   | الوصف                |
| ----------- | ------------- | ------------------------ | -------------------- |
| Id          | int           | PK                       |                      |
| Name        | nvarchar(200) | NOT NULL                 |                      |
| Industry    | nvarchar(100) | NULL                     | تقنية، مالية، صحة... |
| Description | nvarchar(max) | NULL                     |                      |
| City        | nvarchar(100) | NULL                     | للبحث الجغرافي       |
| Country     | nvarchar(100) | NULL                     |                      |
| Website     | nvarchar(500) | NULL                     |                      |
| Email       | nvarchar(255) | NULL                     |                      |
| Phone       | nvarchar(50)  | NULL                     |                      |
| LinkedInUrl | nvarchar(500) | NULL                     |                      |
| LogoUrl     | nvarchar(500) | NULL                     |                      |
| IsImported  | bool          | NOT NULL, default: false | مستورد من AI؟        |
| ImportedAt  | DateTime      | NULL                     | وقت استيراد AI       |
| SourceUrl   | nvarchar(500) | NULL                     | مصدر AI              |
| CreatedAt   | DateTime      | NOT NULL                 |                      |
| UpdatedAt   | DateTime      | NULL                     |                      |
| IsDeleted   | bool          | NOT NULL, default: false |                      |
| DeletedAt   | DateTime      | NULL                     |                      |

**Indexes:**

- `IX_Companies_Country`
- `IX_Companies_City`
- `IX_Companies_Industry`

---

### JobOpportunities

| الحقل               | النوع         | القيود                   | الوصف                          |
| ------------------- | ------------- | ------------------------ | ------------------------------ |
| Id                  | int           | PK                       |                                |
| Title               | nvarchar(200) | NOT NULL                 |                                |
| Description         | nvarchar(max) | NULL                     |                                |
| Type                | nvarchar(20)  | NOT NULL                 | Internship / Job               |
| EmploymentType      | nvarchar(20)  | NULL                     | FullTime / PartTime / Contract |
| Location            | nvarchar(200) | NULL                     |                                |
| IsRemote            | bool          | NOT NULL, default: false |                                |
| SalaryMin           | decimal(18,2) | NULL                     |                                |
| SalaryMax           | decimal(18,2) | NULL                     |                                |
| ApplicationDeadline | DateTime      | NULL                     |                                |
| RequiredSkills      | nvarchar(max) | NULL                     | JSON string                    |
| JobUrl              | nvarchar(500) | NULL                     |                                |
| IsImported          | bool          | NOT NULL, default: false |                                |
| ImportedAt          | DateTime      | NULL                     |                                |
| SourceUrl           | nvarchar(500) | NULL                     |                                |
| IsActive            | bool          | NOT NULL, default: true  |                                |
| CompanyId           | int           | FK → Companies           |                                |
| CreatedAt           | DateTime      | NOT NULL                 |                                |
| UpdatedAt           | DateTime      | NULL                     |                                |
| IsDeleted           | bool          | NOT NULL, default: false |                                |
| DeletedAt           | DateTime      | NULL                     |                                |

**Indexes:**

- `IX_JobOpportunities_Type`
- `IX_JobOpportunities_IsActive`
- `IX_JobOpportunities_ApplicationDeadline`
- `IX_JobOpportunities_CompanyId`

**FK Behavior:**

- `CompanyId` → `Restrict` (لا تحذف فرص الشركة تلقائياً)

---

### Applications

| الحقل            | النوع         | القيود                        | الوصف                                        |
| ---------------- | ------------- | ----------------------------- | -------------------------------------------- |
| Id               | int           | PK                            |                                              |
| Status           | nvarchar(20)  | NOT NULL, default: 'Planning' | Planning/Applied/Interview/Accepted/Rejected |
| StatusUpdatedAt  | DateTime      | NULL                          | وقت آخر تغيير في الحالة                      |
| AppliedAt        | DateTime      | NULL                          | وقت التقديم الفعلي - مستقل عن CreatedAt      |
| Notes            | nvarchar(max) | NULL                          |                                              |
| FollowUpSent     | bool          | NOT NULL, default: false      |                                              |
| FollowUpSentAt   | DateTime      | NULL                          |                                              |
| UserId           | int           | FK → Users                    |                                              |
| JobOpportunityId | int           | FK → JobOpportunities         |                                              |
| ResumeId         | int           | FK → Resumes, NULL            | السيرة الأصلية                               |
| ResumeVersionId  | int           | FK → ResumeVersions, NULL     | نسخة AI مخصصة                                |
| CreatedAt        | DateTime      | NOT NULL                      | وقت إنشاء البطاقة (ليس وقت التقديم)          |
| UpdatedAt        | DateTime      | NULL                          |                                              |
| IsDeleted        | bool          | NOT NULL, default: false      |                                              |
| DeletedAt        | DateTime      | NULL                          |                                              |

**Indexes:**

- `IX_Applications_UserId_JobOpportunityId` → **UNIQUE**
- `IX_Applications_Status`

**FK Behaviors:**

- `UserId` → `Cascade`
- `JobOpportunityId` → `Restrict`
- `ResumeId` → `SetNull`
- `ResumeVersionId` → `SetNull`

---

### Resumes

| الحقل         | النوع         | القيود                   | الوصف                           |
| ------------- | ------------- | ------------------------ | ------------------------------- |
| Id            | int           | PK                       |                                 |
| Label         | nvarchar(150) | NOT NULL                 | "General CV", "Software Dev CV" |
| FileUrl       | nvarchar(max) | NOT NULL                 |                                 |
| FileType      | nvarchar(10)  | NULL                     | pdf, docx                       |
| ParsedContent | nvarchar(max) | NULL                     | نص مستخرج - يستخدمه AI          |
| LastUsedAt    | DateTime      | NULL                     |                                 |
| UserId        | int           | FK → Users               |                                 |
| CreatedAt     | DateTime      | NOT NULL                 |                                 |
| UpdatedAt     | DateTime      | NULL                     |                                 |
| IsDeleted     | bool          | NOT NULL, default: false |                                 |
| DeletedAt     | DateTime      | NULL                     |                                 |

**FK Behaviors:**

- `UserId` → `Cascade`

---

### ResumeVersions

| الحقل           | النوع         | القيود                   | الوصف                   |
| --------------- | ------------- | ------------------------ | ----------------------- |
| Id              | int           | PK                       |                         |
| VersionName     | nvarchar(200) | NOT NULL                 | "CV for STC - Jun 2025" |
| FileUrl         | nvarchar(max) | NOT NULL                 |                         |
| FileType        | nvarchar(10)  | NULL                     |                         |
| IsAiGenerated   | bool          | NOT NULL, default: true  |                         |
| TargetCompanyId | int           | FK → Companies, NULL     | الشركة المستهدفة        |
| ResumeId        | int           | FK → Resumes             | السيرة الأصل            |
| CreatedAt       | DateTime      | NOT NULL                 |                         |
| UpdatedAt       | DateTime      | NULL                     |                         |
| IsDeleted       | bool          | NOT NULL, default: false |                         |
| DeletedAt       | DateTime      | NULL                     |                         |

**FK Behaviors:**

- `ResumeId` → `Cascade`
- `TargetCompanyId` → `SetNull`

---

### Interviews

| الحقل           | النوع         | القيود                   | الوصف                         |
| --------------- | ------------- | ------------------------ | ----------------------------- |
| Id              | int           | PK                       |                               |
| Title           | nvarchar(200) | NOT NULL                 | "Technical Interview Round 1" |
| ScheduledAt     | DateTime      | NOT NULL                 |                               |
| DurationMinutes | int           | NOT NULL, default: 60    |                               |
| Type            | nvarchar(20)  | NOT NULL                 | Online / OnSite / Phone       |
| Location        | nvarchar(500) | NULL                     | لينك زووم أو عنوان فعلي       |
| Notes           | nvarchar(max) | NULL                     |                               |
| ReminderSent    | bool          | NOT NULL, default: false |                               |
| ApplicationId   | int           | FK → Applications        |                               |
| CreatedAt       | DateTime      | NOT NULL                 |                               |
| UpdatedAt       | DateTime      | NULL                     |                               |
| IsDeleted       | bool          | NOT NULL, default: false |                               |
| DeletedAt       | DateTime      | NULL                     |                               |

**Indexes:**

- `IX_Interviews_ScheduledAt`

**FK Behaviors:**

- `ApplicationId` → `Cascade`

---

### Notifications

| الحقل        | النوع         | القيود                   | الوصف                                                            |
| ------------ | ------------- | ------------------------ | ---------------------------------------------------------------- |
| Id           | int           | PK                       |                                                                  |
| Title        | nvarchar(200) | NOT NULL                 |                                                                  |
| Message      | nvarchar(max) | NOT NULL                 |                                                                  |
| Type         | nvarchar(30)  | NOT NULL                 | DeadlineReminder/InterviewReminder/StatusUpdate/AIRecommendation |
| IsRead       | bool          | NOT NULL, default: false |                                                                  |
| Link         | nvarchar(200) | NULL                     | /applications/15                                                 |
| ScheduledFor | DateTime      | NULL                     | وقت الإرسال المجدول                                              |
| ExpiresAt    | DateTime      | NULL                     | بعده لا يُعرض الإشعار                                            |
| UserId       | int           | FK → Users               |                                                                  |
| CreatedAt    | DateTime      | NOT NULL                 |                                                                  |
| UpdatedAt    | DateTime      | NULL                     |                                                                  |
| IsDeleted    | bool          | NOT NULL, default: false |                                                                  |
| DeletedAt    | DateTime      | NULL                     |                                                                  |

**Indexes:**

- `IX_Notifications_UserId_IsRead`
- `IX_Notifications_ExpiresAt`

**FK Behaviors:**

- `UserId` → `Cascade`

---

## العلاقات - ملخص

```
User (1) ──────────────────── (many) Application
User (1) ──────────────────── (many) Resume
User (1) ──────────────────── (many) Notification
User (1) ──────────────────── (many) RefreshToken

Company (1) ────────────────── (many) JobOpportunity
Company (1) ────────────────── (many) ResumeVersion [TargetCompany]

JobOpportunity (1) ──────────── (many) Application

Application (1) ─────────────── (many) Interview
Application (many) ──────────── (1) Resume [nullable]
Application (many) ──────────── (1) ResumeVersion [nullable]

Resume (1) ──────────────────── (many) ResumeVersion
Resume (1) ──────────────────── (many) Application
```

---

## Unique Constraints

| الجدول        | الحقول                     | السبب                                    |
| ------------- | -------------------------- | ---------------------------------------- |
| Users         | Email                      | منع تكرار الحسابات                       |
| RefreshTokens | Token                      | منع تكرار التوكن                         |
| Applications  | (UserId, JobOpportunityId) | مستخدم واحد لا يقدم على نفس الفرصة مرتين |

---

## Indexes

| الجدول           | الحقول                     | السبب                      |
| ---------------- | -------------------------- | -------------------------- |
| Companies        | Country                    | بحث جغرافي                 |
| Companies        | City                       | بحث جغرافي                 |
| Companies        | Industry                   | فلتر بالمجال               |
| JobOpportunities | Type                       | فلتر Internship/Job        |
| JobOpportunities | IsActive                   | إخفاء المنتهية             |
| JobOpportunities | ApplicationDeadline        | تنبيهات المواعيد           |
| Applications     | (UserId, JobOpportunityId) | UNIQUE                     |
| Applications     | Status                     | فلتر الكانبان              |
| Interviews       | ScheduledAt                | التقويم والتذكيرات         |
| Notifications    | (UserId, IsRead)           | عرض الإشعارات غير المقروءة |
| Notifications    | ExpiresAt                  | حذف المنتهية               |

---

## جداول مستقبلية (لا تُنفَّذ في InitialCreate)

```
AiConversation
  Id, UserId, Message (nvarchar(max)), Role nvarchar(10) [user/assistant],
  CreatedAt

ResumeAnalysis
  Id, ResumeId, Strengths (nvarchar(max)), Weaknesses (nvarchar(max)),
  MissingSkills (nvarchar(max)), Suggestions (nvarchar(max)), CreatedAt

AiRecommendation
  Id, UserId, RecommendationType (nvarchar(50)), Content (nvarchar(max)),
  IsActedUpon (bool), CreatedAt
```

---

## قبل تشغيل Migration

```powershell
# تأكد أن connection string صحيح في appsettings.json
# ثم:
Add-Migration InitialCreate
Update-Database
```

أي تعديل على هذا الملف يجب أن يرافقه تعديل مقابل في الـ Models وـ AppDbContext.
