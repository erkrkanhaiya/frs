from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

SQLALCHEMY_DATABASE_URL = "sqlite:///./face_watchlist.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency to get DB sessions
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create all tables
from models import Base
Base.metadata.create_all(bind=engine)