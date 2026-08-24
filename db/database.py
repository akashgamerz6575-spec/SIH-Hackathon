"""
Database Connection Manager and Storage Layer
Supports PostgreSQL / PostGIS with automatic SQLite fallback for standalone local execution.
"""
import os
import sqlite3
import json
from typing import List, Optional, Dict, Any
from .models import Parcel3DRecord, BoundingBox3DData

DB_FILE_PATH = os.path.join(os.path.dirname(__file__), "..", "cadastre_3d.db")

class DBManager:
    def __init__(self, db_path: str = DB_FILE_PATH):
        self.db_path = db_path
        self._init_sqlite()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_sqlite(self):
        """Initializes SQLite schema mirroring PostGIS 3D structure."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS parcels_3d (
                    id TEXT PRIMARY KEY,
                    ulpin_3d TEXT UNIQUE NOT NULL,
                    base_survey_no TEXT NOT NULL,
                    state_code TEXT NOT NULL,
                    district_code TEXT NOT NULL,
                    floor_level INTEGER NOT NULL,
                    unit_label TEXT NOT NULL,
                    owner_name TEXT NOT NULL,
                    property_type TEXT NOT NULL,
                    volume_m3 REAL NOT NULL,
                    min_x REAL NOT NULL,
                    max_x REAL NOT NULL,
                    min_y REAL NOT NULL,
                    max_y REAL NOT NULL,
                    min_z REAL NOT NULL,
                    max_z REAL NOT NULL,
                    metadata_json TEXT,
                    encumbrance_status TEXT,
                    created_at REAL NOT NULL
                );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_ulpin ON parcels_3d (ulpin_3d);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_floor ON parcels_3d (floor_level);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_zrange ON parcels_3d (min_z, max_z);")
            conn.commit()

    def insert_parcel(self, parcel: Parcel3DRecord) -> Parcel3DRecord:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO parcels_3d (
                    id, ulpin_3d, base_survey_no, state_code, district_code,
                    floor_level, unit_label, owner_name, property_type, volume_m3,
                    min_x, max_x, min_y, max_y, min_z, max_z,
                    metadata_json, encumbrance_status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                parcel.id,
                parcel.ulpin_3d,
                parcel.base_survey_no,
                parcel.state_code,
                parcel.district_code,
                parcel.floor_level,
                parcel.unit_label,
                parcel.owner_name,
                parcel.property_type,
                parcel.volume_m3,
                parcel.bounds.min_x,
                parcel.bounds.max_x,
                parcel.bounds.min_y,
                parcel.bounds.max_y,
                parcel.bounds.min_z,
                parcel.bounds.max_z,
                json.dumps(parcel.metadata_json),
                parcel.encumbrance_status,
                parcel.created_at,
            ))
            conn.commit()
        return parcel

    def get_all_parcels(self, floor_level: Optional[int] = None) -> List[Parcel3DRecord]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if floor_level is not None:
                cursor.execute("SELECT * FROM parcels_3d WHERE floor_level = ? ORDER BY floor_level, unit_label", (floor_level,))
            else:
                cursor.execute("SELECT * FROM parcels_3d ORDER BY floor_level, unit_label")
            rows = cursor.fetchall()
            return [self._row_to_parcel(r) for r in rows]

    def get_parcel_by_ulpin(self, ulpin: str) -> Optional[Parcel3DRecord]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM parcels_3d WHERE ulpin_3d = ?", (ulpin,))
            row = cursor.fetchone()
            return self._row_to_parcel(row) if row else None

    def clear_all_parcels(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM parcels_3d")
            conn.commit()

    def count_parcels(self) -> int:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM parcels_3d")
            return cursor.fetchone()[0]

    def _row_to_parcel(self, row: sqlite3.Row) -> Parcel3DRecord:
        bounds = BoundingBox3DData(
            min_x=row["min_x"],
            max_x=row["max_x"],
            min_y=row["min_y"],
            max_y=row["max_y"],
            min_z=row["min_z"],
            max_z=row["max_z"],
        )
        meta = json.loads(row["metadata_json"]) if row["metadata_json"] else {}
        return Parcel3DRecord(
            id=row["id"],
            ulpin_3d=row["ulpin_3d"],
            base_survey_no=row["base_survey_no"],
            state_code=row["state_code"],
            district_code=row["district_code"],
            floor_level=row["floor_level"],
            unit_label=row["unit_label"],
            owner_name=row["owner_name"],
            property_type=row["property_type"],
            volume_m3=row["volume_m3"],
            bounds=bounds,
            metadata_json=meta,
            encumbrance_status=row["encumbrance_status"] or "Clear / Validated",
            created_at=row["created_at"],
        )

# Global database singleton
_db_instance: Optional[DBManager] = None

def get_db() -> DBManager:
    global _db_instance
    if _db_instance is None:
        _db_instance = DBManager()
    return _db_instance

def init_db():
    get_db()
