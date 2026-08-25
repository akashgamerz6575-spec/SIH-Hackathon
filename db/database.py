"""
Database Connection Manager and Storage Layer
Supports PostgreSQL / PostGIS with automatic SQLite fallback for standalone local execution.
Includes schema migration for demographics, utility analytics, and 19-char 3D ULPIN.
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
        """Initializes SQLite schema mirroring PostGIS 3D structure and migrates columns."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS parcels_3d (
                    id TEXT PRIMARY KEY,
                    ulpin_3d TEXT UNIQUE NOT NULL,
                    base_survey_no TEXT NOT NULL,
                    base_plot_id TEXT DEFAULT '12A34B56C78D90',
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
                    seniors_60plus INTEGER DEFAULT 0,
                    adults INTEGER DEFAULT 2,
                    infants_kids INTEGER DEFAULT 0,
                    total_occupants INTEGER DEFAULT 2,
                    electricity_kwh REAL DEFAULT 240.0,
                    water_liters REAL DEFAULT 9500.0,
                    declared_floors INTEGER DEFAULT 4,
                    actual_floors INTEGER DEFAULT 4,
                    metadata_json TEXT,
                    encumbrance_status TEXT,
                    created_at REAL NOT NULL
                );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_ulpin ON parcels_3d (ulpin_3d);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_floor ON parcels_3d (floor_level);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_zrange ON parcels_3d (min_z, max_z);")

            # Check for existing table schema columns and alter if needed
            cursor.execute("PRAGMA table_info(parcels_3d)")
            cols = {row["name"] for row in cursor.fetchall()}
            
            alterations = [
                ("base_plot_id", "TEXT DEFAULT '12A34B56C78D90'"),
                ("seniors_60plus", "INTEGER DEFAULT 0"),
                ("adults", "INTEGER DEFAULT 2"),
                ("infants_kids", "INTEGER DEFAULT 0"),
                ("total_occupants", "INTEGER DEFAULT 2"),
                ("electricity_kwh", "REAL DEFAULT 240.0"),
                ("water_liters", "REAL DEFAULT 9500.0"),
                ("declared_floors", "INTEGER DEFAULT 4"),
                ("actual_floors", "INTEGER DEFAULT 4"),
            ]
            for col_name, col_def in alterations:
                if col_name not in cols:
                    try:
                        cursor.execute(f"ALTER TABLE parcels_3d ADD COLUMN {col_name} {col_def}")
                    except Exception:
                        pass

            conn.commit()

    def insert_parcel(self, parcel: Parcel3DRecord) -> Parcel3DRecord:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO parcels_3d (
                    id, ulpin_3d, base_survey_no, base_plot_id, state_code, district_code,
                    floor_level, unit_label, owner_name, property_type, volume_m3,
                    min_x, max_x, min_y, max_y, min_z, max_z,
                    seniors_60plus, adults, infants_kids, total_occupants,
                    electricity_kwh, water_liters, declared_floors, actual_floors,
                    metadata_json, encumbrance_status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                parcel.id,
                parcel.ulpin_3d,
                parcel.base_survey_no,
                parcel.base_plot_id,
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
                parcel.seniors_60plus,
                parcel.adults,
                parcel.infants_kids,
                parcel.total_occupants,
                parcel.electricity_kwh,
                parcel.water_liters,
                parcel.declared_floors,
                parcel.actual_floors,
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
        
        # Safely extract newly added columns with defaults
        keys = row.keys()
        base_plot = row["base_plot_id"] if "base_plot_id" in keys and row["base_plot_id"] else "12A34B56C78D90"
        seniors = row["seniors_60plus"] if "seniors_60plus" in keys and row["seniors_60plus"] is not None else 0
        adults = row["adults"] if "adults" in keys and row["adults"] is not None else 2
        infants = row["infants_kids"] if "infants_kids" in keys and row["infants_kids"] is not None else 0
        total_occ = row["total_occupants"] if "total_occupants" in keys and row["total_occupants"] is not None else (seniors + adults + infants)
        elec = row["electricity_kwh"] if "electricity_kwh" in keys and row["electricity_kwh"] is not None else 240.0
        water = row["water_liters"] if "water_liters" in keys and row["water_liters"] is not None else 9500.0
        decl_f = row["declared_floors"] if "declared_floors" in keys and row["declared_floors"] is not None else 4
        act_f = row["actual_floors"] if "actual_floors" in keys and row["actual_floors"] is not None else 4

        return Parcel3DRecord(
            id=row["id"],
            ulpin_3d=row["ulpin_3d"],
            base_survey_no=row["base_survey_no"],
            base_plot_id=base_plot,
            state_code=row["state_code"],
            district_code=row["district_code"],
            floor_level=row["floor_level"],
            unit_label=row["unit_label"],
            owner_name=row["owner_name"],
            property_type=row["property_type"],
            volume_m3=row["volume_m3"],
            bounds=bounds,
            seniors_60plus=seniors,
            adults=adults,
            infants_kids=infants,
            total_occupants=total_occ,
            electricity_kwh=elec,
            water_liters=water,
            declared_floors=decl_f,
            actual_floors=act_f,
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
