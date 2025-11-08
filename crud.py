from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
import models, schemas
from typing import List, Optional
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# User operations
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate, is_admin: bool = False):
    hashed_password = pwd_context.hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        is_admin=is_admin
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Camera operations
def get_camera(db: Session, camera_id: int):
    return db.query(models.Camera).filter(models.Camera.id == camera_id).first()

def get_cameras(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Camera).offset(skip).limit(limit).all()

def create_camera(db: Session, camera: schemas.CameraCreate):
    db_camera = models.Camera(**camera.dict())
    db.add(db_camera)
    db.commit()
    db.refresh(db_camera)
    return db_camera

def update_camera(db: Session, camera_id: int, camera: schemas.CameraCreate):
    db_camera = get_camera(db, camera_id)
    if db_camera:
        for key, value in camera.dict().items():
            setattr(db_camera, key, value)
        db.commit()
        db.refresh(db_camera)
    return db_camera

def delete_camera(db: Session, camera_id: int):
    db_camera = get_camera(db, camera_id)
    if db_camera:
        db.delete(db_camera)
        db.commit()
        return True
    return False

# Alert rule operations
def get_alert_rule(db: Session, rule_id: int):
    return db.query(models.AlertRule).filter(models.AlertRule.id == rule_id).first()

def get_alert_rules(
    db: Session,
    user_id: Optional[int] = None,
    camera_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100
):
    query = db.query(models.AlertRule)
    if user_id:
        query = query.filter(models.AlertRule.user_id == user_id)
    if camera_id:
        query = query.filter(models.AlertRule.camera_id == camera_id)
    return query.offset(skip).limit(limit).all()

def create_alert_rule(db: Session, rule: schemas.AlertRuleCreate, user_id: int):
    db_rule = models.AlertRule(**rule.dict(), user_id=user_id)
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

def update_alert_rule(db: Session, rule_id: int, rule: schemas.AlertRuleCreate):
    db_rule = get_alert_rule(db, rule_id)
    if db_rule:
        for key, value in rule.dict().items():
            setattr(db_rule, key, value)
        db.commit()
        db.refresh(db_rule)
    return db_rule

def delete_alert_rule(db: Session, rule_id: int):
    db_rule = get_alert_rule(db, rule_id)
    if db_rule:
        db.delete(db_rule)
        db.commit()
        return True
    return False

# Helper functions
def get_matching_rules(db: Session, camera_id: int, person_name: str) -> List[models.AlertRule]:
    """Get alert rules that match a detection."""
    return db.query(models.AlertRule).filter(
        and_(
            models.AlertRule.camera_id == camera_id,
            models.AlertRule.enabled == True,
            (models.AlertRule.person_name == person_name) | (models.AlertRule.person_name == "*")
        )
    ).all()