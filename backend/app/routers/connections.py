import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.connection import DBConnection
from app.models.user import User
from app.routers.auth import get_current_user, limiter
from app.services.db_connector import get_connector
from app.services.validators import (
    sanitize_string,
    validate_db_type,
    validate_host,
    validate_identifier,
    validate_port,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/connections", tags=["connections"])


class ConnectionCreate(BaseModel):
    name: str
    db_type: str
    host: str
    port: int
    database: str
    username: str
    password: str = ""
    use_ssl: bool = False
    ssh_enabled: bool = False
    ssh_host: Optional[str] = None
    ssh_port: int = 22
    ssh_username: Optional[str] = None
    ssh_password: Optional[str] = None
    connection_timeout: int = 30
    jdbc_url: Optional[str] = None

    @field_validator("db_type")
    @classmethod
    def check_db_type(cls, v: str) -> str:
        return validate_db_type(v)

    @field_validator("host")
    @classmethod
    def check_host(cls, v: str) -> str:
        return validate_host(v)

    @field_validator("port")
    @classmethod
    def check_port(cls, v: int) -> int:
        return validate_port(v)

    @field_validator("name")
    @classmethod
    def check_name(cls, v: str) -> str:
        v = sanitize_string(v, 100)
        if not v:
            raise ValueError("Connection name is required")
        return v

    @field_validator("database")
    @classmethod
    def check_database(cls, v: str) -> str:
        v = sanitize_string(v, 128)
        if not v:
            raise ValueError("Database name is required")
        return v

    @field_validator("connection_timeout")
    @classmethod
    def check_timeout(cls, v: int) -> int:
        if not (1 <= v <= 300):
            raise ValueError("Timeout must be between 1 and 300 seconds")
        return v

    @field_validator("ssh_port")
    @classmethod
    def check_ssh_port(cls, v: int) -> int:
        return validate_port(v)


class ConnectionOut(BaseModel):
    id: int
    name: str
    db_type: str
    host: str
    port: int
    database: str
    username: str
    use_ssl: bool
    ssh_enabled: bool
    ssh_host: Optional[str] = None
    connection_timeout: int

    class Config:
        from_attributes = True


@router.post("/", response_model=ConnectionOut)
@limiter.limit("30/minute")
def create_connection(
    body: ConnectionCreate, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if not body.host.strip():
        raise HTTPException(status_code=400, detail="Host is required")
    if not body.database.strip():
        raise HTTPException(status_code=400, detail="Database name is required")
    conn = DBConnection(**body.model_dump(), created_by=user.id)
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return conn


@router.get("/")
def list_connections(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conns = db.query(DBConnection).filter(DBConnection.created_by == user.id).all()
    return [ConnectionOut.model_validate(c) for c in conns]


@router.delete("/{conn_id}")
@limiter.limit("20/minute")
def delete_connection(
    conn_id: int, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    conn = db.query(DBConnection).filter(DBConnection.id == conn_id, DBConnection.created_by == user.id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    db.delete(conn)
    db.commit()
    return {"ok": True}


@router.put("/{conn_id}", response_model=ConnectionOut)
@limiter.limit("30/minute")
def update_connection(
    conn_id: int,
    body: ConnectionCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conn = db.query(DBConnection).filter(DBConnection.id == conn_id, DBConnection.created_by == user.id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    updatable_fields = [
        "name",
        "db_type",
        "host",
        "port",
        "database",
        "username",
        "password",
        "use_ssl",
        "ssh_enabled",
        "ssh_host",
        "ssh_port",
        "ssh_username",
        "ssh_password",
        "connection_timeout",
        "jdbc_url",
    ]
    data = body.model_dump()
    for key in updatable_fields:
        if key in data:
            setattr(conn, key, data[key])
    db.commit()
    db.refresh(conn)
    return conn


@router.post("/{conn_id}/test")
@limiter.limit("10/minute")
def test_connection(
    conn_id: int, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    conn = db.query(DBConnection).filter(DBConnection.id == conn_id, DBConnection.created_by == user.id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    try:
        connector = get_connector(conn)
        connector.test()
        return {"ok": True, "message": "Connection successful"}
    except Exception as e:
        logger.error(f"Connection test failed for conn_id={conn_id} user={user.id}: {e}")
        return {"ok": False, "message": "Connection test failed. Check your credentials and network settings."}


@router.get("/{conn_id}/tables")
@limiter.limit("30/minute")
def list_tables(conn_id: int, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conn = db.query(DBConnection).filter(DBConnection.id == conn_id, DBConnection.created_by == user.id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    try:
        connector = get_connector(conn)
        return connector.list_tables()
    except Exception as e:
        logger.error(f"list_tables failed for conn_id={conn_id} user={user.id}: {e}")
        raise HTTPException(
            status_code=502, detail="Failed to retrieve tables. Check that the database is reachable."
        ) from e


@router.get("/{conn_id}/tables/{table_name}/columns")
@limiter.limit("30/minute")
def list_columns(
    conn_id: int,
    table_name: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        table_name = validate_identifier(table_name, "table name")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    conn = db.query(DBConnection).filter(DBConnection.id == conn_id, DBConnection.created_by == user.id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    try:
        connector = get_connector(conn)
        return connector.list_columns(table_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error(f"list_columns failed for conn_id={conn_id} table={table_name} user={user.id}: {e}")
        raise HTTPException(
            status_code=502, detail="Failed to retrieve columns. Check that the database is reachable."
        ) from e
