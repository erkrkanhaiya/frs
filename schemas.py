from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(UserBase):
    password: Optional[str] = None

class User(UserBase):
    id: int
    is_admin: bool
    disabled: bool
    created_at: datetime

    class Config:
        from_attributes = True

class CameraBase(BaseModel):
    name: str
    url: Optional[str] = None  # Accept 'url' from frontend
    location: Optional[str] = None  # Accept 'location' from frontend
    source: Optional[str] = None  # Legacy field
    type: Optional[str] = "local"  # Default type
    enabled: bool = True
    config: Optional[Dict[str, Any]] = None

class CameraCreate(CameraBase):
    pass

class CameraUpdate(CameraBase):
    pass

class Camera(BaseModel):
    id: int
    name: str
    url: Optional[str] = None
    location: Optional[str] = None
    source: Optional[str] = None
    type: Optional[str] = "local"
    enabled: bool = True
    config: Optional[Dict[str, Any]] = None
    created_at: datetime
    last_seen: Optional[datetime] = None

    class Config:
        from_attributes = True

class AlertRuleBase(BaseModel):
    name: str
    camera_id: int
    person_name: str
    cooldown: int
    notification_type: str
    notification_config: Dict[str, Any]
    enabled: bool = True

class AlertRuleCreate(AlertRuleBase):
    pass

class AlertRuleUpdate(AlertRuleBase):
    pass

class AlertRule(AlertRuleBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        orm_mode = True