# CareerTrackAI Frontend

This folder contains the React frontend for CareerTrackAI.

## Stack

- React
- Vite
- Tailwind CSS
- React Router
- Axios
- Recharts
- dnd-kit
- lucide-react
- react-markdown

## Development

```powershell
npm install
npm run dev
```

The Vite development server runs on:

```text
http://localhost:5174
```

The app expects the backend API at:

```env
VITE_API_BASE_URL=http://localhost:5185/api
```

Final mode uses real backend responses only:

```env
VITE_USE_MOCKS=false
```

Mock fallback data is available only for UI development. Enable it explicitly with:

```env
VITE_USE_MOCKS=true
```

## Main Pages

- `Dashboard` - account progress, application metrics, charts, and AI priority brief
- `Data Hub` - CSV import, shared database, Adzuna, JobDataLake, and AI sourcing
- `Opportunities` - review opportunities, verify links, track applications, export/delete rows
- `Applications` - Kanban pipeline for Planning, Applied, Interview, Accepted, and Rejected
- `Resumes` - upload CVs, analyze with AI, and delete unused files
- `Interviews` - schedule interviews, save meeting links, and generate AI prep notes
- `AI Studio` - persistent career chat, recommendations, Gemini token test, and cover letters
- `Usage` - Gemini and external job API usage summaries
- `Settings` - theme, density, AI panels, plan previews, and future API-key/payment flows
- `Help` - step-by-step usage guide

## Useful Commands

```powershell
npm run lint
npm run build
npm run preview
```

## Environment Files

`.env` is ignored by Git. Use `.env.example` as the safe template for local setup.
