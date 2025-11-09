Face Watchlist Dashboard

This is a Next.js dashboard for the FastAPI face watchlist backend. It fetches alerts/stats through Next.js API routes and connects to the backend WebSocket for real-time notifications.

Quick start

1. From the workspace, open a terminal and change into the dashboard folder:

```bash
cd dashboard
```

2. Install dependencies (requires Node.js and npm/yarn):

```bash
npm install
# or
# yarn
```

3. Configure backend URLs using an env file (recommended):

```bash
cp .env.local.example .env.local
# then edit .env.local to match your backend
# API_BASE is used by Next.js API routes (server-side)
# NEXT_PUBLIC_WS_BASE/NEXT_PUBLIC_API_BASE are used in the browser for WebSockets and derived URLs
```

Default values in the example point to a local backend:

- API_BASE=http://127.0.0.1:8000
- NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
- NEXT_PUBLIC_WS_BASE=ws://127.0.0.1:8000

4. Run the dev server:

```bash
npm run dev
```

5. Open http://localhost:3000 in your browser. Log in via the login page, then navigate to Alerts.

Notes

- If your FastAPI server runs on a different host/port, set API_BASE in `.env.local` rather than editing source files.
- The dashboard’s WebSocket connects to `NEXT_PUBLIC_WS_BASE` or derives from `NEXT_PUBLIC_API_BASE` by replacing http -> ws.
