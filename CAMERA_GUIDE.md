# How to Start Camera Monitoring and View Captured Images

## Quick Start Guide

### 1. Access the Dashboard
- Open your browser to: http://localhost:3000
- Login with credentials:
  - Username: `admin`
  - Password: `changeme123`

### 2. Configure Cameras
1. Navigate to **Cameras** page from the sidebar
2. Click **"Add Camera"** button
3. Enter camera details:
   - **Camera Name**: Give it a descriptive name (e.g., "Front Door", "Office Entrance")
   - **Camera URL**: 
     - For webcam: Enter `0` (default webcam) or `1`, `2` etc. for other USB cameras
     - For IP camera: Enter RTSP URL like `rtsp://username:password@192.168.1.10:554/stream`
   - **Location**: Physical location of the camera
4. Click **"Add"** to save

### 3. Add Persons to Watchlist
1. Navigate to **Persons** page from the sidebar
2. Click **"Add Person"** button
3. Enter the person's name
4. Upload one or more clear photos of the person's face
5. The system will use these photos to recognize this person in camera feeds

### 4. Start Camera Monitoring
1. Go back to **Cameras** page
2. Click the **"Start Watch"** button at the top
3. The button will change to **"✓ Watch Running"** when active
4. The system is now monitoring all configured cameras for faces in the watchlist

### 5. View Captured Incidents
On the **Cameras** page, scroll down to the **"Captured Incidents"** section to see:
- Thumbnail images of detected faces
- Timestamp of when each face was detected
- Click any image to view full size

### 6. View Real-Time Alerts
1. Navigate to **Dashboard** (home page)
2. Real-time alerts appear when a known face is detected
3. You'll see:
   - Person's name
   - Camera location
   - Detection timestamp
   - Thumbnail image
   - Sound notification plays automatically

### 7. Stop Monitoring
1. Go to **Cameras** page
2. Click **"Stop Watch"** button
3. Camera monitoring will stop

## API Endpoints

### Camera Control
- **POST** `/api/watch/start` - Start camera monitoring
- **POST** `/api/watch/stop` - Stop camera monitoring  
- **GET** `/api/watch/status` - Check if monitoring is running

### View Incidents
- **GET** `/api/incidents` - List all captured incident images
- **GET** `/incidents/{filename}` - View specific incident image

### Camera Management
- **GET** `/api/cameras` - List all cameras
- **POST** `/api/cameras` - Add new camera
- **PUT** `/api/cameras/{id}` - Update camera
- **DELETE** `/api/cameras/{id}` - Delete camera

### Person Management
- **GET** `/api/persons` - List all persons in watchlist
- **POST** `/api/persons` - Add new person
- **GET** `/api/persons/{name}/images` - List images for a person
- **POST** `/api/persons/{name}/images` - Upload image for a person
- **DELETE** `/api/persons/{name}` - Delete a person from watchlist
   - Query params:
      - `purge_alerts=true|false` (optional) also remove alert history for this person
      - `purge_incidents=true|false` (optional) also remove incident images for this person
   - Example: `/api/persons/demo_person?purge_alerts=true&purge_incidents=true`

## Technical Details

### How It Works
1. **Backend** (`alerts_server.py`):
   - Serves the API at http://127.0.0.1:8000
   - Manages camera configurations in SQLite database
   - Controls the face recognition process
   - Stores captured incident images in `incidents/` folder

2. **Face Recognition** (`realtime_face_watchlist.py`):
   - Runs as a separate process when started from dashboard
   - Loads all faces from `faces_db/` directory
   - Opens all configured cameras simultaneously
   - Detects faces in real-time using OpenCV and face_recognition
   - Saves images when known faces are detected
   - Posts alerts to the backend API

3. **Frontend** (Next.js Dashboard):
   - Provides web interface at http://localhost:3000
   - Proxies API calls to backend
   - Shows real-time alerts via WebSocket
   - Displays captured incident images

### File Locations
- **Known Faces**: `faces_db/{person_name}/` - Store training images here
- **Incident Images**: `incidents/` - Captured detections saved here
- **Database**: `face_watchlist.db` - Camera and user configuration
- **Alerts**: `alerts.json` - Alert history (JSON format)

### Troubleshooting

**Camera won't start:**
- Check if the camera URL/index is correct
- For webcam, try `0`, `1`, or `2`
- For RTSP, verify the URL format and credentials
- Make sure the camera is not in use by another application

**No faces detected:**
- Ensure you have uploaded clear face photos in the Persons section
- Photos should be well-lit and show the face clearly
- At least one photo per person is required

**Watch status shows "stopped" after starting:**
- Check backend terminal for errors
- Verify Python dependencies are installed: `pip install -r requirements.txt`
- Check if the script can access the camera (permissions)

**Images not displaying:**
- Verify backend is running on port 8000
- Check browser console for CORS errors
- Ensure `incidents/` folder has proper permissions

## Advanced Configuration

### Multiple Cameras
You can add multiple cameras and they will all be monitored simultaneously when you start the watch process.

### Camera URL Examples
- USB Webcam: `0` or `/dev/video0`
- IP Camera (RTSP): `rtsp://admin:password@192.168.1.100:554/stream1`
- IP Camera (HTTP): `http://192.168.1.100:8080/video`
- Second USB camera: `1`

### Performance Tips
- For multiple cameras, use lower resolution settings
- Process fewer frames for better performance (configured in realtime_face_watchlist.py)
- Close the OpenCV windows if running headless (they consume resources)

## Support
For issues or questions, check the logs:
- Backend logs: Terminal where `alerts_server.py` is running
- Frontend logs: Terminal where `npm run dev` is running
- Browser console: F12 → Console tab
