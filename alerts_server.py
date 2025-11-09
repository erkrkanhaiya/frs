from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, status, UploadFile, File, Form
import os
import sys
from dotenv import load_dotenv
load_dotenv()
from fastapi.middleware.cors import CORSMiddleware
from typing import Set

# Set to store connected websocket clients
connected_clients: Set[WebSocket] = set()
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
import os
import json
from typing import List, Set, Optional
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from api.auth import (
    User, create_access_token, authenticate_user,
    get_current_active_user, ACCESS_TOKEN_EXPIRE_MINUTES, get_password_hash
)
from analytics import get_alert_stats, get_person_history
from api.database import get_db, engine, Base
import crud, models, schemas
from notifications import process_alert_notification
import subprocess
import pathlib
import shutil

# Create database tables and seed default admin if missing
Base.metadata.create_all(bind=engine)
try:
    from api.database import SessionLocal
    with SessionLocal() as db:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            # Seed default admin (dev only)
            hashed = get_password_hash("changeme123")
            admin = User(username="admin", hashed_password=hashed, is_active=True)
            db.add(admin)
            db.commit()
except Exception as _seed_err:
    # Non-fatal; continue without seed
    pass

ALERTS_FILE = os.getenv("ALERTS_FILE", "alerts.json")
INCIDENTS_FOLDER = os.getenv("INCIDENTS_FOLDER", "incidents")
FACES_DB = os.getenv("FACES_DB", "faces_db")

app = FastAPI(title="Face Watchlist Alerts API")

# Import camera routes
from api.routers import cameras
app.include_router(cameras.router)

# Allow the dashboard (and other local UIs) to fetch alerts from the browser.
# In production you may want to restrict `allow_origins` to your dashboard host.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure incidents folder exists
os.makedirs(INCIDENTS_FOLDER, exist_ok=True)
os.makedirs(FACES_DB, exist_ok=True)

# Create database tables on startup
from api.database import engine
Base.metadata.create_all(bind=engine)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        dead_connections = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                dead_connections.add(connection)
        # Clean up dead connections
        for dead in dead_connections:
            self.active_connections.remove(dead)

manager = ConnectionManager()

def _sanitize_alert(a: dict) -> dict:
    """Ensure minimum keys exist for an alert to prevent response_model validation errors."""
    return {
        "name": a.get("name", "Unknown"),
        "camera_id": a.get("camera_id", 0),
        "timestamp": a.get("timestamp", datetime.utcnow().isoformat()),
        "filename": a.get("filename", "unknown.jpg"),
        "suspicious": bool(a.get("suspicious", a.get("name", "Unknown") == "Unknown")),
        "camera_name": a.get("camera_name")
    }

# Load persisted alerts if present with sanitation
if os.path.exists(ALERTS_FILE):
    try:
        with open(ALERTS_FILE, "r", encoding="utf-8") as f:
            raw_alerts = json.load(f)
            if isinstance(raw_alerts, list):
                alerts_store = [_sanitize_alert(a) for a in raw_alerts]
            else:
                alerts_store = []
    except Exception:
        alerts_store = []
else:
    alerts_store = []

class Token(BaseModel):
    access_token: str
    token_type: str

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    print(f"Login attempt - username: {form_data.username}, password length: {len(form_data.password)}")
    user = authenticate_user(db, form_data.username, form_data.password)
    print(f"Authentication result: {'success' if user else 'failed'}")
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    secret_key = os.getenv("SECRET_KEY", "your-secret-key")
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        secret_key=secret_key
    )
    return {"access_token": access_token, "token_type": "bearer"}

class Alert(BaseModel):
    name: str
    camera_id: int
    timestamp: str
    filename: str
    suspicious: bool = False  # Flag for unknown/suspicious persons
    camera_name: Optional[str] = None  # Optional camera name for better notifications

@app.post("/alerts", status_code=201)
async def receive_alert(alert: Alert):
    """Receive a new alert from the watchlist system and persist it."""
    entry = alert.dict()
    alerts_store.append(entry)
    # persist to disk
    try:
        with open(ALERTS_FILE, "w", encoding="utf-8") as f:
            json.dump(alerts_store, f, indent=2)
        # Broadcast to WebSocket clients with alert data
        await manager.broadcast({
            "type": "new_alert",
            "alert": entry  # Changed from "data" to "alert" for clarity
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save alert: {e}")
    return {"status": "ok", "saved": entry}

# Persons (faces_db) management
@app.get("/persons")
def list_persons(current_user: User = Depends(get_current_active_user)):
    try:
        names = [d.name for d in pathlib.Path(FACES_DB).iterdir() if d.is_dir()]
        names.sort()
        return {"persons": names}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PersonCreate(BaseModel):
    name: str

@app.post("/persons")
def create_person(person: PersonCreate, current_user: User = Depends(get_current_active_user)):
    safe = person.name.strip().replace("..", "").replace("/", "_")
    if not safe:
        raise HTTPException(status_code=400, detail="Invalid name")
    target = pathlib.Path(FACES_DB) / safe
    try:
        target.mkdir(parents=True, exist_ok=True)
        return {"name": safe}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/persons/{name}/images")
def list_person_images(name: str, current_user: User = Depends(get_current_active_user)):
    safe = name.strip().replace("..", "").replace("/", "_")
    folder = pathlib.Path(FACES_DB) / safe
    if not folder.exists() or not folder.is_dir():
        raise HTTPException(status_code=404, detail="Person not found")
    files = [p.name for p in folder.iterdir() if p.is_file() and p.suffix.lower() in [".jpg", ".jpeg", ".png"]]
    files.sort()
    return {"images": files}

@app.post("/persons/{name}/images")
async def upload_person_image(name: str, file: UploadFile = File(...), current_user: User = Depends(get_current_active_user)):
    safe = name.strip().replace("..", "").replace("/", "_")
    folder = pathlib.Path(FACES_DB) / safe
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)
    # Build filename with timestamp to avoid collisions
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
    ext = pathlib.Path(file.filename).suffix or ".jpg"
    dest = folder / f"{ts}{ext}"
    try:
        with dest.open("wb") as out:
            content = await file.read()
            out.write(content)
        return {"saved": dest.name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/persons/{name}")
def delete_person(
    name: str,
    purge_alerts: bool = False,
    purge_incidents: bool = False,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a person from the faces database.

    Query Params:
    - purge_alerts: also remove historical alerts referencing this person
    - purge_incidents: also remove incident images whose filename ends with _{person}.jpg

    Returns counts of removed items for transparency.
    """
    safe = name.strip().replace("..", "").replace("/", "_")
    folder = pathlib.Path(FACES_DB) / safe
    if not folder.exists() or not folder.is_dir():
        raise HTTPException(status_code=404, detail="Person not found")

    # Remove face images folder
    try:
        shutil.rmtree(folder)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove person folder: {e}")

    removed_alerts = 0
    removed_incidents = 0

    global alerts_store
    if purge_alerts:
        before = len(alerts_store)
        alerts_store = [a for a in alerts_store if a.get("name") != safe]
        removed_alerts = before - len(alerts_store)
        # persist updated alerts_store
        try:
            with open(ALERTS_FILE, "w", encoding="utf-8") as f:
                json.dump(alerts_store, f, indent=2)
        except Exception as e:
            # Not fatal; continue
            pass

    if purge_incidents:
        try:
            inc_path = pathlib.Path(INCIDENTS_FOLDER)
            if inc_path.exists():
                for file in inc_path.iterdir():
                    if file.is_file() and file.suffix.lower() in [".jpg", ".jpeg", ".png"]:
                        # Legacy filename pattern ends with _{name}.jpg
                        if file.name.endswith(f"_{safe}.jpg") or file.name.endswith(f"_{safe}.jpeg") or file.name.endswith(f"_{safe}.png"):
                            try:
                                file.unlink()
                                removed_incidents += 1
                            except Exception:
                                pass
        except Exception:
            # Ignore failures removing incidents
            pass

    return {
        "deleted": safe,
        "removed_alerts": removed_alerts,
        "removed_incidents": removed_incidents,
        "purge_alerts": purge_alerts,
        "purge_incidents": purge_incidents
    }

@app.get("/alerts", response_model=List[Alert])
async def list_alerts(
    limit: int = 50,
    current_user: User = Depends(get_current_active_user)
):
    """Return recent alerts (most recent first)."""
    return list(reversed(alerts_store))[:limit]

@app.get("/alerts/{name}", response_model=List[Alert])
async def alerts_for_name(
    name: str,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user)
):
    """Get alerts for a specific person."""
    matches = [a for a in reversed(alerts_store) if a.get("name") == name]
    return matches[:limit]

@app.get("/stats")
async def get_statistics(
    days: Optional[int] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Get alert statistics and trends."""
    return get_alert_stats(alerts_store, days)

@app.get("/stats/{name}")
async def get_person_stats(
    name: str,
    days: Optional[int] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Get detailed statistics for a specific person."""
    return get_person_history(alerts_store, name, days)

# Camera Management Routes
@app.post("/cameras/")
def create_camera(camera: schemas.CameraCreate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_active_user)):
    result = crud.create_camera(db=db, camera=camera)
    # Transform to dict for response
    return {
        'id': result.id,
        'name': result.name,
        'url': result.source,
        'location': result.config.get('location', '') if result.config else '',
        'source': result.source,
        'type': result.type,
        'enabled': result.enabled,
        'config': result.config,
        'created_at': result.created_at,
        'last_seen': result.last_seen
    }

@app.get("/cameras/")
def list_cameras(skip: int = 0, limit: int = 100, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_active_user)):
    return crud.get_cameras(db, skip=skip, limit=limit)

@app.put("/cameras/{camera_id}")
def update_camera(camera_id: int, camera: schemas.CameraUpdate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_active_user)):
    db_camera = crud.get_camera(db, camera_id=camera_id)
    if db_camera is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    result = crud.update_camera(db=db, camera_id=camera_id, camera=camera)
    # Transform to dict for response
    return {
        'id': result.id,
        'name': result.name,
        'url': result.source,
        'location': result.config.get('location', '') if result.config else '',
        'source': result.source,
        'type': result.type,
        'enabled': result.enabled,
        'config': result.config,
        'created_at': result.created_at,
        'last_seen': result.last_seen
    }

@app.delete("/cameras/{camera_id}")
def delete_camera(camera_id: int, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_active_user)):
    db_camera = crud.get_camera(db, camera_id=camera_id)
    if db_camera is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    crud.delete_camera(db=db, camera_id=camera_id)
    return {"message": "Camera deleted successfully"}

# Alert Rules Routes
@app.post("/alert-rules/", response_model=schemas.AlertRule)
def create_alert_rule(alert_rule: schemas.AlertRuleCreate, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_active_user)):
    return crud.create_alert_rule(db=db, alert_rule=alert_rule)

@app.get("/alert-rules/", response_model=List[schemas.AlertRule])
def list_alert_rules(skip: int = 0, limit: int = 100, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    return crud.get_alert_rules(db, skip=skip, limit=limit)

@app.put("/alert-rules/{rule_id}", response_model=schemas.AlertRule)
def update_alert_rule(rule_id: int, alert_rule: schemas.AlertRuleUpdate, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_active_user)):
    db_rule = crud.get_alert_rule(db, rule_id=rule_id)
    if db_rule is None:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    return crud.update_alert_rule(db=db, rule_id=rule_id, alert_rule=alert_rule)

@app.delete("/alert-rules/{rule_id}")
def delete_alert_rule(rule_id: int, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_active_user)):
    db_rule = crud.get_alert_rule(db, rule_id=rule_id)
    if db_rule is None:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    crud.delete_alert_rule(db=db, rule_id=rule_id)
    return {"message": "Alert rule deleted successfully"}

# User Management Routes
@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_active_user)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.get("/users/", response_model=List[schemas.User])
def list_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_active_user)):
    return crud.get_users(db, skip=skip, limit=limit)

@app.get("/users/{user_id}", response_model=schemas.User)
def get_user(user_id: int, db: Session = Depends(get_db),
             current_user: User = Depends(get_current_active_user)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.put("/users/{user_id}", response_model=schemas.User)
def update_user(user_id: int, user: schemas.UserUpdate, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_active_user)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.update_user(db=db, user_id=user_id, user=user)

@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_active_user)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    crud.delete_user(db=db, user_id=user_id)
    return {"message": "User deleted successfully"}

# WebSocket endpoint for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Process received data if needed
    except WebSocketDisconnect:
        connected_clients.remove(websocket)

# Alias path for WebSocket to match dashboard expectation
@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    await websocket_endpoint(websocket)

# Watch process management (start/stop)
WATCH_PROC: Optional[subprocess.Popen] = None

@app.post("/watch/start")
def start_watch(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    global WATCH_PROC
    if WATCH_PROC and WATCH_PROC.poll() is None:
        return {"status": "already_running", "pid": WATCH_PROC.pid}
    try:
        # Get active cameras from database
        cameras = crud.get_cameras(db, skip=0, limit=100)
        # cameras is now a list of dicts, access 'url' key
        camera_urls = [cam['url'] for cam in cameras if cam.get('url')]
        
        # Default to webcam if no cameras configured
        if not camera_urls:
            camera_urls = ["0"]
        
        # Launch face recognition script with camera sources
        python_path = sys.executable
        script_path = pathlib.Path(__file__).resolve().parent / "realtime_face_watchlist.py"
        
        # Pass camera URLs as arguments
        cmd = [python_path, str(script_path)] + camera_urls
        WATCH_PROC = subprocess.Popen(cmd, cwd=str(pathlib.Path(__file__).resolve().parent))
        return {"status": "started", "pid": WATCH_PROC.pid, "cameras": camera_urls}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/watch/stop")
def stop_watch(current_user: User = Depends(get_current_active_user)):
    global WATCH_PROC
    if not WATCH_PROC or WATCH_PROC.poll() is not None:
        return {"status": "not_running"}
    try:
        WATCH_PROC.terminate()
        try:
            WATCH_PROC.wait(timeout=5)
        except Exception:
            WATCH_PROC.kill()
        return {"status": "stopped"}
    finally:
        WATCH_PROC = None

@app.get("/watch/status")
def watch_status(current_user: User = Depends(get_current_active_user)):
    """Get current watch process status"""
    global WATCH_PROC
    if WATCH_PROC and WATCH_PROC.poll() is None:
        return {"status": "running", "pid": WATCH_PROC.pid}
    return {"status": "stopped"}

@app.get("/incidents")
def list_incidents(current_user: User = Depends(get_current_active_user)):
    """List all captured incident images"""
    try:
        incidents_path = pathlib.Path(INCIDENTS_FOLDER)
        if not incidents_path.exists():
            return {"incidents": []}
        
        files = []
        for file in incidents_path.iterdir():
            if file.is_file() and file.suffix.lower() in [".jpg", ".jpeg", ".png"]:
                stat = file.stat()
                files.append({
                    "filename": file.name,
                    "size": stat.st_size,
                    "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    "url": f"/incidents/{file.name}"
                })
        
        # Sort by creation time, newest first
        files.sort(key=lambda x: x["created"], reverse=True)
        return {"incidents": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("alerts_server:app", host="0.0.0.0", port=8000, reload=True)

# Serve incident images statically under /incidents
app.mount("/incidents", StaticFiles(directory=INCIDENTS_FOLDER), name="incidents")

# Serve face database images statically under /faces_db
app.mount("/faces_db", StaticFiles(directory=FACES_DB), name="faces_db")

@app.get("/incident/{filename}")
async def get_incident(filename: str):
    path = os.path.join(INCIDENTS_FOLDER, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
