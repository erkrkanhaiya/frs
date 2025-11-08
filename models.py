from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    full_name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_admin = Column(Boolean, default=False)
    disabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    alert_subscriptions = relationship("AlertRule", back_populates="user")

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    source = Column(String)  # Camera index (0, 1) or RTSP URL
    type = Column(String)    # 'local' or 'rtsp'
    enabled = Column(Boolean, default=True)
    config = Column(JSON)    # Additional camera config (resolution, FPS, etc.)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime)
    alert_rules = relationship("AlertRule", back_populates="camera")

class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    camera_id = Column(Integer, ForeignKey("cameras.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    person_name = Column(String)  # The person to watch for, or "*" for any
    cooldown = Column(Integer)    # Seconds between alerts
    notification_type = Column(String)  # 'email', 'webhook', 'browser'
    notification_config = Column(JSON)  # Email/webhook details
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    camera = relationship("Camera", back_populates="alert_rules")
    user = relationship("User", back_populates="alert_subscriptions")