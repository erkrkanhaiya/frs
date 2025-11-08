Face Watchlist Dashboard

This is a minimal Next.js dashboard that polls the FastAPI alerts server at http://127.0.0.1:8000/alerts and displays recent alerts with thumbnail images.

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

3. Run the dev server:

```bash
npm run dev
```

4. Open http://localhost:3000 in your browser. The dashboard will poll the FastAPI server and show recent alerts.

Notes

- The dashboard expects the FastAPI server to run at http://127.0.0.1:8000 and to expose `/alerts` (JSON) and `/incidents/<filename>` for images.
- If your FastAPI server runs on a different host/port, edit `pages/index.jsx` and update the API base URL.
