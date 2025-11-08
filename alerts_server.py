from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, status
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
    get_current_active_user, ACCESS_TOKEN_EXPIRE_MINUTES
)
from analytics import get_alert_stats, get_person_history
from api.database import get_db, engine, Base
import crud, models, schemas
from notifications import process_alert_notification

# Create database tables
Base.metadata.create_all(bind=engine)

ALERTS_FILE = "alerts.json"
INCIDENTS_FOLDER = "incidents"

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

# Load persisted alerts if present
if os.path.exists(ALERTS_FILE):
    try:
        with open(ALERTS_FILE, "r", encoding="utf-8") as f:
            alerts_store = json.load(f)
    except Exception:
        alerts_store = []
else:
    alerts_store = []

# Auth endpoints
class Token(BaseModel):
    access_token: str
    token_type: str

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    print(f"Login attempt - username: {form_data.username}, password length: {len(form_data.password)}")
    user = authenticate_user(form_data.username, form_data.password)
    print(f"Authentication result: {'success' if user else 'failed'}")
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

class Alert(BaseModel):
    name: str
    camera_id: int
    timestamp: str
    filename: str

@app.post("/alerts", status_code=201)
async def receive_alert(alert: Alert):
    """Receive a new alert from the watchlist system and persist it."""
    entry = alert.dict()
    alerts_store.append(entry)
    # persist to disk
    try:
        with open(ALERTS_FILE, "w", encoding="utf-8") as f:
            json.dump(alerts_store, f, indent=2)
        # Broadcast to WebSocket clients
        await manager.broadcast({
            "type": "new_alert",
            "data": entry
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save alert: {e}")
    return {"status": "ok", "saved": entry}

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
@app.post("/cameras/", response_model=schemas.Camera)
def create_camera(camera: schemas.CameraCreate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_active_user)):
    return crud.create_camera(db=db, camera=camera)

@app.get("/cameras/", response_model=List[schemas.Camera])
def list_cameras(skip: int = 0, limit: int = 100, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_active_user)):
    return crud.get_cameras(db, skip=skip, limit=limit)

@app.put("/cameras/{camera_id}", response_model=schemas.Camera)
def update_camera(camera_id: int, camera: schemas.CameraUpdate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_active_user)):
    db_camera = crud.get_camera(db, camera_id=camera_id)
    if db_camera is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    return crud.update_camera(db=db, camera_id=camera_id, camera=camera)

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

if __name__ == "__main__":
    uvicorn.run("alerts_server:app", host="0.0.0.0", port=8000, reload=True)

# Serve incident images statically under /incidents
app.mount("/incidents", StaticFiles(directory=INCIDENTS_FOLDER), name="incidents")

@app.get("/incident/{filename}")
async def get_incident(filename: str):
    path = os.path.join(INCIDENTS_FOLDER, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
