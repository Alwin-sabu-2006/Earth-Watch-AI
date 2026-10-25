import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.database import Base, engine, SessionLocal, init_db
from app.api.routes import ensure_db_seeded

@pytest.fixture(scope="session")
def client():
    # Initialize DB and seed
    init_db()
    db = SessionLocal()
    try:
        ensure_db_seeded(db)
    finally:
        db.close()

    with TestClient(app) as test_client:
        yield test_client
