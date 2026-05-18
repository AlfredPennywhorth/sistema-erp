from __future__ import annotations

from collections.abc import Generator
import os
from pathlib import Path

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_bootstrap.db")

from app.api.v1.endpoints import team, tenants
from app.core import auth


@pytest.fixture
def db_engine(tmp_path: Path):
    db_path = tmp_path / "test.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    try:
        yield engine
    finally:
        SQLModel.metadata.drop_all(engine)


@pytest.fixture
def client(db_engine, monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    app = FastAPI()

    @app.middleware("http")
    async def inject_test_user(request: Request, call_next):
        request.state.user_id = request.headers.get("X-Test-User-ID")
        return await call_next(request)

    def override_get_session():
        with Session(db_engine) as session:
            yield session

    monkeypatch.setattr(auth, "engine", db_engine)
    app.dependency_overrides[auth.get_session] = override_get_session

    app.include_router(team.router, prefix="/api/v1/team")
    app.include_router(tenants.router, prefix="/api/v1/tenants")

    with TestClient(app) as test_client:
        yield test_client
