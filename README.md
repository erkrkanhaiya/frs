# Real-time Face Recognition Surveillance System

A real-time face recognition system that monitors webcam feeds for known faces and triggers alerts when matches are found.

npm run dev:all

## Features

- Real-time face detection and recognition
- Local watchlist management
- Multi-camera support (USB/RTSP)
- Incident logging with timestamps
- Duplicate alert prevention
- Completely offline operation
- Live FPS counter

## Prerequisites

- Python 3.10 or higher
- Webcam or USB camera
- macOS/Linux: `cmake` installed
- Windows: Visual C++ build tools

## Installation

1. Create and activate a virtual environment:

```bash
# macOS/Linux
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
.\venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

## Setting Up Face Database

1. Create individual folders for each person under `faces_db/`:
```
faces_db/
  ├── person1/
  │   ├── photo1.jpg
  │   └── photo2.jpg
  ├── person2/
  │   └── photo1.jpg
  └── ...
```

2. Add clear, well-lit face photos (JPG/PNG) to each person's folder.

## Usage

1. Run the main script:
```bash
python realtime_face_watchlist.py
```

2. The system will:
- Load known faces from `faces_db/`
- Open webcam feed(s)
- Display real-time detection results
- Save incident snapshots to `incidents/`

## Running the FastAPI alert server

Start the local alert server so the watchlist script can POST alerts to it:

```bash
source venv/bin/activate
python alerts_server.py
# or with uvicorn explicitly:
# uvicorn alerts_server:app --reload --host 127.0.0.1 --port 8000
```

The server will expose:
- POST /alerts  -> accept alerts from `realtime_face_watchlist.py`
- GET /alerts   -> list recent alerts
- GET /incidents/{filename} -> serve incident images
 - GET /stats   -> aggregated analytics (requires auth)

## Running both server and watcher

Recommended: start the FastAPI server first, then the watchlist script so alerts are delivered in real time.

In separate terminals:

```bash
# Terminal 1: start server
source venv/bin/activate
python alerts_server.py

# Terminal 2: start watchlist
source venv/bin/activate
python realtime_face_watchlist.py
## Running the Dashboard (Next.js)

1) Install dependencies (first time only):

```bash
cd dashboard
npm install
```

2) Start the dev server:

```bash
npm run dev
```

3) Open http://localhost:3000 in your browser and log in:

- Username: `admin`
- Password: `changeme123`

The dashboard will use the Next.js API routes to proxy requests to the FastAPI backend at `http://127.0.0.1:8000` (default). If your backend runs elsewhere, set `API_BASE` when starting Next:

```bash
API_BASE=http://192.168.1.50:8000 npm run dev
```

### Troubleshooting

- Failed to load alerts: Ensure you are logged in so the Authorization header is present. The proxy at `/api/alerts` requires `Authorization: Bearer <token>`.
- Stats 500 errors: Make sure the backend is restarted after code changes; analytics parsing supports both ISO and legacy timestamps.
- Port busy (3000/8000): Stop existing processes (`lsof -nP -iTCP:3000|8000`) and kill them, then restart.

```

## Configuration

Edit these variables in `realtime_face_watchlist.py`:
- `ALERT_COOLDOWN`: Time between duplicate alerts (default: 10s)
- `CONFIDENCE_THRESHOLD`: Match confidence threshold (default: 0.6)
- `MAX_CAMERAS`: Maximum number of camera feeds (default: 1)

## Folder Structure

```
.
├── realtime_face_watchlist.py  # Main script
├── requirements.txt            # Python dependencies
├── faces_db/                  # Known face images
│   └── <PersonName>/         # One folder per person
└── incidents/                # Detection snapshots
```

## Troubleshooting

1. Camera not detected:
   - Check USB connections
   - Try different camera index (0, 1, 2...)
   - Verify camera permissions

2. Slow performance:
   - Reduce frame resolution
   - Decrease MAX_CAMERAS
   - Use a smaller face database

## License

MIT License