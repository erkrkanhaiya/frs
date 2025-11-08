from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from api.database import get_db
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from models import Camera
from api.auth import get_current_user

router = APIRouter()

class CameraBase(BaseModel):
    name: str
    url: str
    location: str

class CameraCreate(CameraBase):
    pass

class CameraUpdate(CameraBase):
    pass

class CameraResponse(CameraBase):
    id: int
    
    class Config:
        orm_mode = True

@router.get("/cameras", response_model=List[CameraResponse])
async def list_cameras(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    cameras = db.query(Camera).all()
    return cameras

@router.post("/cameras", response_model=CameraResponse)
async def create_camera(
    camera: CameraCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_camera = Camera(**camera.dict())
    db.add(db_camera)
    db.commit()
    db.refresh(db_camera)
    return db_camera

@router.put("/cameras/{camera_id}", response_model=CameraResponse)
async def update_camera(
    camera_id: int,
    camera: CameraUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not db_camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    for key, value in camera.dict().items():
        setattr(db_camera, key, value)
    
    db.commit()
    db.refresh(db_camera)
    return db_camera

@router.delete("/cameras/{camera_id}")
async def delete_camera(
    camera_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not db_camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    db.delete(db_camera)
    db.commit()
    return {"message": "Camera deleted successfully"}