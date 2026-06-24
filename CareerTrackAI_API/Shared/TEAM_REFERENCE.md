# CareerTrackAI - Shared Team Reference

# لغة البرنامج بالانجليزية بالكامل

**Version 3.0** | أي تغيير في التسميات أو القيم يُحدَّث هنا أولاً.

---

## الفريق

| الدور              | المسؤولية                                   |
| ------------------ | ------------------------------------------- |
| Backend Developer  | ASP.NET Core API + EF Core + AI Integration |
| Frontend Developer | React + Axios + UI Components               |

---

## قاعدة التسمية

### Backend (C#)

- الكلاسات: `PascalCase` → `JobOpportunity`, `ResumeVersion`
- المتغيرات: `camelCase` → `applicationId`, `statusUpdatedAt`
- Endpoints: `kebab-case` → `/api/job-opportunities`

### Frontend (React/JS)

- الكومبوننتات: `PascalCase` → `KanbanBoard`, `CompanyCard`
- المتغيرات والـ props: `camelCase` → `applicationStatus`, `isImported`
- الملفات: `PascalCase.jsx` للكومبوننتات، `camelCase.js` للـ utilities

---

## Enums - القيم الثابتة

> تُخزن كـ String في قاعدة البيانات. الفرونت اند يستخدم القيمة النصية مباشرة.

### UserRole

| القيمة النصية | المعنى      |
| ------------- | ----------- |
| `Student`     | طالب / خريج |
| `Admin`       | مدير النظام |

### OpportunityType

الفصل الأساسي بين تدريب ووظيفة - هذا هو مفتاح الفلتر الرئيسي.

| القيمة النصية | المعنى | ملاحظة للفرونت اند       |
| ------------- | ------ | ------------------------ |
| `Internship`  | تدريب  | فلتر: `?type=Internship` |
| `Job`         | وظيفة  | فلتر: `?type=Job`        |

### EmploymentType

مستقل عن OpportunityType - ينطبق على `Job`، اختياري على `Internship`، قد يكون `null`.

| القيمة النصية | المعنى    |
| ------------- | --------- |
| `FullTime`    | دوام كامل |
| `PartTime`    | دوام جزئي |
| `Contract`    | عقد مؤقت  |

### ApplicationStatus - مراحل الكانبان

| القيمة النصية | اسم العمود      | ترتيب العمود          |
| ------------- | --------------- | --------------------- |
| `Planning`    | التخطيط للتقديم | 1                     |
| `Applied`     | تم التقديم      | 2                     |
| `Interview`   | مقابلة          | 3                     |
| `Accepted`    | قُبلت           | 4                     |
| `Rejected`    | مرفوض           | 4 (موازٍ لـ Accepted) |

**ملاحظة:** Accepted وRejected يظهران في نفس الصف لكنهما عمودان منفصلان.

### InterviewType

| القيمة النصية | المعنى       |
| ------------- | ------------ |
| `Online`      | عبر الإنترنت |
| `OnSite`      | حضوري        |
| `Phone`       | هاتفي        |

### NotificationType

| القيمة النصية       | المعنى                    |
| ------------------- | ------------------------- |
| `DeadlineReminder`  | تذكير بآخر موعد تقديم     |
| `InterviewReminder` | تذكير بمقابلة             |
| `StatusUpdate`      | تغيير حالة الطلب          |
| `AIRecommendation`  | توصية من الذكاء الاصطناعي |

---

## هيكل الكيانات والعلاقات

```
Company (كيان عام - لا يخص مستخدماً واحداً)
└── JobOpportunities (1:many)
    └── Applications (1:many)
        ├── User (many:1)
        ├── Resume (many:1, optional)
        ├── ResumeVersion (many:1, optional) ← نسخة AI مخصصة
        └── Interviews (1:many)

User
├── Applications (1:many)
├── Resumes (1:many)
│   └── ResumeVersions (1:many) ← نسخ AI للسيرة
└── Notifications (1:many)
```

### قرار مهم: لماذا Company كيان عام؟

Microsoft وSTC وغيرها شركات يتقدم عليها مئات المستخدمين.
ربطها بـ UserId يعني تكرار بيانات الشركة لكل مستخدم.
المستخدم يصل للشركة عبر: JobOpportunity ← Application.

---

## Soft Delete

**جميع الجداول** تستخدم Soft Delete. لا يُحذف أي سجل فعلياً من DB.

```csharp
// حذف - يضع IsDeleted = true فقط
public bool IsDeleted { get; set; } = false;
public DateTime? DeletedAt { get; set; }
```

**Global Query Filter في AppDbContext** يُخفي السجلات المحذوفة تلقائياً من كل query.

للوصول للمحذوفات (Admin فقط):

```csharp
_context.Applications.IgnoreQueryFilters().Where(a => a.IsDeleted)
```

---

## Audit Fields - موجودة في كل الجداول

كل model يرث من `BaseEntity`:

```csharp
public int Id { get; set; }
public DateTime CreatedAt { get; set; }
public DateTime? UpdatedAt { get; set; }
public bool IsDeleted { get; set; }
public DateTime? DeletedAt { get; set; }
```

---

## API Endpoints

### Base URL

```
Development:  https://localhost:5001/api
Production:   https://careertrack-api.com/api
```

### Authentication

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh-token
```

JWT في كل request:

```
Authorization: Bearer {token}
```

### Users

```
GET    /api/users/me
PUT    /api/users/me
```

### Companies

```
GET    /api/companies                      ← كل الشركات (مشتركة)
GET    /api/companies/{id}
GET    /api/companies?industry=Tech        ← فلتر
POST   /api/companies                      ← Admin فقط
PUT    /api/companies/{id}                 ← Admin فقط
DELETE /api/companies/{id}                 ← Soft Delete
POST   /api/companies/import              ← Admin - استيراد AI batch
```

### Job Opportunities

```
GET    /api/job-opportunities
GET    /api/job-opportunities?type=Internship
GET    /api/job-opportunities?type=Job
GET    /api/job-opportunities?type=Job&employmentType=FullTime
GET    /api/job-opportunities?companyId=5
GET    /api/job-opportunities/{id}
POST   /api/job-opportunities             ← Admin فقط
PUT    /api/job-opportunities/{id}        ← Admin فقط
DELETE /api/job-opportunities/{id}        ← Soft Delete
```

### Applications

```
GET    /api/applications
GET    /api/applications?status=Interview
GET    /api/applications/{id}
POST   /api/applications
PATCH  /api/applications/{id}/status      ← تغيير حالة الكانبان فقط
DELETE /api/applications/{id}             ← Soft Delete
GET    /api/applications/export-excel
```

### Resumes

```
GET    /api/resumes
GET    /api/resumes/{id}
POST   /api/resumes
DELETE /api/resumes/{id}                  ← Soft Delete
GET    /api/resumes/{id}/versions         ← نسخ AI للسيرة
POST   /api/resumes/{id}/customize        ← توليد نسخة AI لشركة معينة
```

### Interviews

```
GET    /api/interviews                    ← كل مقابلات المستخدم
GET    /api/applications/{id}/interviews
POST   /api/applications/{id}/interviews
PUT    /api/interviews/{id}
DELETE /api/interviews/{id}              ← Soft Delete
```

### Notifications

```
GET    /api/notifications
PATCH  /api/notifications/{id}/read
PATCH  /api/notifications/read-all
DELETE /api/notifications/{id}
```

### Dashboard

```
GET    /api/dashboard/stats
```

**ملاحظة:** لا يوجد جدول Dashboard. الأرقام تُحسب لحظياً من جدول Applications.

### AI Features

```
POST   /api/ai/chat
POST   /api/ai/analyze-resume/{id}
POST   /api/ai/generate-cover-letter
GET    /api/ai/recommendations
```

---

## Response Format الموحد

```json
{
  "success": true,
  "data": { ... },
  "message": "تم بنجاح",
  "errors": []
}
```

عند الخطأ:

```json
{
  "success": false,
  "data": null,
  "message": "حدث خطأ",
  "errors": ["تفاصيل"]
}
```

---

## نماذج بيانات مهمة

### User Response (GET /api/users/me)

```json
{
  "id": 1,
  "fullName": "Ahmed Ali",
  "email": "ahmed@test.com",
  "role": "Student",
  "university": "King Saud University",
  "major": "Software Engineering",
  "city": "Riyadh",
  "graduationYear": 2026,
  "createdAt": "2025-01-15T08:00:00Z"
}
```

**ملاحظة:** `passwordHash` لا يُرسل أبداً في أي response.

### Auth Response (POST /api/auth/login)

```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "d4f8a2...",
  "expiresAt": "2025-06-10T10:00:00Z",
  "user": {
    "id": 1,
    "fullName": "Ahmed Ali",
    "email": "ahmed@test.com",
    "role": "Student"
  }
}
```

### Application Response

```json
{
  "id": 1,
  "status": "Interview",
  "appliedAt": "2025-06-01T10:00:00Z",
  "statusUpdatedAt": "2025-06-05T14:30:00Z",
  "notes": "ملاحظة",
  "followUpSent": false,
  "jobOpportunity": {
    "id": 5,
    "title": "Frontend Developer Intern",
    "type": "Internship",
    "employmentType": null,
    "applicationDeadline": "2025-07-01T00:00:00Z",
    "isActive": true,
    "company": {
      "id": 3,
      "name": "STC",
      "city": "الرياض",
      "industry": "تقنية المعلومات"
    }
  },
  "resume": { "id": 2, "label": "Software Dev CV" },
  "resumeVersion": { "id": 7, "versionName": "CV for STC - Jun 2025" },
  "interviews": [
    {
      "id": 1,
      "title": "Technical Interview",
      "scheduledAt": "2025-06-10T09:00:00Z",
      "type": "Online",
      "location": "https://meet.google.com/xyz"
    }
  ]
}
```

### Dashboard Stats Response

```json
{
  "totalApplications": 24,
  "accepted": 3,
  "rejected": 5,
  "pending": 16,
  "successRate": 12.5,
  "byStatus": {
    "Planning": 4,
    "Applied": 8,
    "Interview": 4,
    "Accepted": 3,
    "Rejected": 5
  }
}
```

### Notification Response

```json
{
  "id": 12,
  "title": "تذكير: مقابلة غداً",
  "message": "لديك مقابلة مع STC الساعة 10 صباحاً",
  "type": "InterviewReminder",
  "isRead": false,
  "link": "/interviews/4",
  "createdAt": "2025-06-09T08:00:00Z"
}
```

---

## HTTP Status Codes

| الكود | متى يُستخدم                            |
| ----- | -------------------------------------- |
| 200   | طلب ناجح                               |
| 201   | إنشاء مورد جديد                        |
| 400   | بيانات خاطئة من المستخدم               |
| 401   | غير مسجل دخول                          |
| 403   | مسجل لكن بدون صلاحية                   |
| 404   | المورد غير موجود                       |
| 409   | تعارض - مثل تقديم مكرر على نفس الوظيفة |
| 500   | خطأ في السيرفر                         |

---

## قواعد مهمة

1. **لا حذف فعلي من DB** - كل الجداول تستخدم IsDeleted.
2. **Company كيان عام** - لا UserId فيها. المستخدم يصل للشركة عبر Application.
3. **Dashboard** - لا جدول خاص به، كل شيء يُحسب من Applications.
4. **StatusUpdatedAt** - يتحدث تلقائياً في Backend عند كل تغيير في Status.
5. **ResumeVersion** - النسخ الأصلية لا تُعدَّل. كل تخصيص بالذكاء الاصطناعي يصنع ResumeVersion جديدة.
6. **جميع التواريخ** UTC في DB، الفرونت اند يتولى التحويل للـ timezone المحلي.
7. **الـ Enums** تُخزن كـ String للوضوح في DB.

---

## جداول مستقبلية (لا تُنفَّذ الآن)

سيتم إضافتها في مرحلة لاحقة بعد اكتمال النواة:

```
AiConversation
  Id, UserId, Message, Role (user/assistant), CreatedAt

ResumeAnalysis
  Id, ResumeId, Strengths, Weaknesses, MissingSkills, Suggestions, CreatedAt

AiRecommendation
  Id, UserId, RecommendationType, Content, IsActedUpon, CreatedAt
```

موثقة هنا حتى لا تحتاج لإعادة تصميم البنية لاحقاً.

---

## ملاحظات للفرونت اند

- **الكانبان:** ابنه بناءً على `ApplicationStatus`. القيم النصية هي مفاتيح الأعمدة.
- **فلتر الفرص:** `?type=Internship` أو `?type=Job` في query string. لفلتر نوع التوظيف: `?type=Job&employmentType=FullTime`.
- **التواريخ:** ISO 8601 (`2025-06-01T10:00:00Z`) - استخدم `dayjs` أو `date-fns`.
- **الإشعارات:** استخدم `link` مباشرة للتنقل بدل بناء الرابط في الفرونت اند.
- **Soft Delete:** السجلات المحذوفة لا ترجع في أي response تلقائياً.
- **شركة جديدة:** إضافة شركة تحتاج Admin. المستخدم العادي يختار من القائمة الموجودة.

---

_Version 3.0 - تصحيح OpportunityType وإضافة EmploymentType وUser DTO_
