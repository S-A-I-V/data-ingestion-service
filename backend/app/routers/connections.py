from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.models.connection import DBConnection
from app.routers.auth import get_current_user
from app.services.db_connector import get_connector

router = APIRouter(prefix="/api/connections", tags=["connections"])


class ConnectionCreate(BaseModel):
    name: str
    db_type: str  # postgres, clickhouse, sybase, mysql, mssql
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
def create_connection(body: ConnectionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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
def delete_connection(conn_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conn = db.query(DBConnection).filter(DBConnection.id == conn_id, DBConnection.created_by == user.id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    db.delete(conn)
    db.commit()
    return {"ok": True}


@router.post("/{conn_id}/test")
def test_connection(conn_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conn = db.query(DBConnection).filter(DBConnection.id == conn_id, DBConnection.created_by == user.id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    try:
        connector = get_connector(conn)
        connector.test()
        return {"ok": True, "message": "Connection successful"}
    except Exception as e:
        return {"ok": False, "message": str(e)}


@router.get("/{conn_id}/tables")
def list_tables(conn_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conn = db.query(DBConnection).filter(DBConnection.id == conn_id, DBConnection.created_by == user.id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    connector = get_connector(conn)
    return connector.list_tables()


@router.get("/{conn_id}/tables/{table_name}/columns")
def list_columns(conn_id: int, table_name: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conn = db.query(DBConnection).filter(DBConnection.id == conn_id, DBConnection.created_by == user.id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    connector = get_connector(conn)
    return connector.list_columns(table_name)
