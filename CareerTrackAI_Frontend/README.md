# CareerTrackAI Frontend

Modern React frontend for CareerTrack AI.

## Stack

- React + Vite
- Tailwind CSS
- React Router
- Axios
- Recharts
- dnd-kit
- lucide-react

## Development

```bash
npm install
npm run dev
```

The app expects the API at:

```bash
VITE_API_BASE_URL=http://localhost:5185/api
```

Final mode uses real backend responses only:

```bash
VITE_USE_MOCKS=false
```

Mock fallback data is available only for UI development. Enable it explicitly with `VITE_USE_MOCKS=true` when the backend is not running.

## AI mode

The backend exposes `GET /api/ai/status`. If `GoogleAI:ApiKey` is empty, AI endpoints return local development fallback responses instead of failing. Add a Gemini key in the API configuration to switch to live AI.
