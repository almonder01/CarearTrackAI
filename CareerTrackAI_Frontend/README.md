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

Mock fallback data is enabled by default so the UI can be explored before the backend is running. Set `VITE_USE_MOCKS=false` to require real API responses only.

## AI mode

The backend exposes `GET /api/ai/status`. If `GoogleAI:ApiKey` is empty, AI endpoints return local development fallback responses instead of failing. Add a Gemini key in the API configuration to switch to live AI.
