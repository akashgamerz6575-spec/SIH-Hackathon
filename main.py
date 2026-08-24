from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List
import hashlib
import time

app = FastAPI(title="3D ULPIN Cadastral Engine", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BoundingBox3D(BaseModel):
    min_x: float = Field(..., description="Grid X min")
    max_x: float = Field(..., description="Grid X max")
    min_y: float = Field(..., description="Grid Y min")
    max_y: float = Field(..., description="Grid Y max")
    min_z: float = Field(..., description="Elevation (MSL) Z min in meters")
    max_z: float = Field(..., description="Elevation (MSL) Z max in meters")

class ParcelCreate(BaseModel):
    state_code: str = "KA"
    district_code: str = "560"
    floor_level: int
    unit_label: str
    owner_name: str
    base_survey_no: str
    bounds: BoundingBox3D

class ParcelRecord(BaseModel):
    ulpin_3d: str
    state_code: str
    district_code: str
    floor_level: int
    unit_label: str
    owner_name: str
    base_survey_no: str
    volume_m3: float
    bounds: BoundingBox3D
    registration_timestamp: float

PARCEL_DB: List[ParcelRecord] = []

def generate_3d_ulpin(state: str, district: str, floor: int, b: BoundingBox3D) -> str:
    cx = (b.min_x + b.max_x) / 2.0
    cy = (b.min_y + b.max_y) / 2.0
    cz = (b.min_z + b.max_z) / 2.0
    floor_prefix = f"F{floor:02d}" if floor >= 0 else f"B{abs(floor):02d}"
    z_prefix = f"Z{int(cz):02d}" if cz >= 0 else f"ZNEG{abs(int(cz)):02d}"
    spatial_signature = f"{cx:.5f}:{cy:.5f}:{b.min_z:.2f}:{b.max_z:.2f}"
    hash_token = hashlib.sha256(spatial_signature.encode()).hexdigest()[:6].upper()
    return f"IN-{state.upper()}-{district}-{floor_prefix}-{z_prefix}-{hash_token}"

def check_3d_collision(b1: BoundingBox3D, b2: BoundingBox3D) -> bool:
    eps = 1e-4
    x_overlap = (b1.min_x < b2.max_x - eps) and (b1.max_x > b2.min_x + eps)
    y_overlap = (b1.min_y < b2.max_y - eps) and (b1.max_y > b2.min_y + eps)
    z_overlap = (b1.min_z < b2.max_z - eps) and (b1.max_z > b2.min_z + eps)
    return x_overlap and y_overlap and z_overlap

@app.get("/api/parcels", response_model=List[ParcelRecord])
def get_all_parcels():
    return PARCEL_DB

@app.post("/api/parcels/register", response_model=ParcelRecord)
def register_vertical_parcel(payload: ParcelCreate):
    for existing in PARCEL_DB:
        if check_3d_collision(payload.bounds, existing.bounds):
            raise HTTPException(
                status_code=400,
                detail=f"3D Encroachment Detected: Overlaps with parcel {existing.ulpin_3d} (Owner: {existing.owner_name})"
            )

    dx = abs(payload.bounds.max_x - payload.bounds.min_x)
    dy = abs(payload.bounds.max_y - payload.bounds.min_y)
    dz = abs(payload.bounds.max_z - payload.bounds.min_z)
    volume = round(dx * dy * dz, 2)

    ulpin = generate_3d_ulpin(
        payload.state_code,
        payload.district_code,
        payload.floor_level,
        payload.bounds
    )

    record = ParcelRecord(
        ulpin_3d=ulpin,
        state_code=payload.state_code,
        district_code=payload.district_code,
        floor_level=payload.floor_level,
        unit_label=payload.unit_label,
        owner_name=payload.owner_name,
        base_survey_no=payload.base_survey_no,
        volume_m3=volume,
        bounds=payload.bounds,
        registration_timestamp=time.time()
    )

    PARCEL_DB.append(record)
    return record

@app.post("/api/seed-cadastre")
def seed_cadastre_complex():
    """Seeds a full 4-story high-rise + 1 basement utility level."""
    PARCEL_DB.clear()
    
    sample_owners = [
        "Aarav Sharma", "Priya Nair", "Vikramaditya Hegde", "Ananya Iyer",
        "Rohan Kulkarni", "Deepa Deshmukh", "Karthik Sundaram", "Sneha Patil",
        "Manoj Verma", "Tanvi Sengupta", "Siddharth Menon", "Bhavana Rao",
        "Arjun Reddy", "Meera Joshi", "Gaurav Malhotra", "Neha Kapoor"
    ]
    
    # 1. Subsurface Basement (Utilities & Parking)
    b_bounds = BoundingBox3D(min_x=-5.5, max_x=5.5, min_y=-5.5, max_y=5.5, min_z=-3.0, max_z=0.0)
    b_ulpin = generate_3d_ulpin("KA", "560", -1, b_bounds)
    PARCEL_DB.append(ParcelRecord(
        ulpin_3d=b_ulpin,
        state_code="KA",
        district_code="560",
        floor_level=-1,
        unit_label="Basement-01 (Utility & Parking)",
        owner_name="Municipal Infrastructure Corp",
        base_survey_no="SY-142/2A",
        volume_m3=363.0,
        bounds=b_bounds,
        registration_timestamp=time.time()
    ))

    # 2. 4 Floors, 4 Units per floor (2x2 grid)
    owner_idx = 0
    unit_w = 4.8
    gap = 0.4
    
    for f in range(1, 5):
        z_min = (f - 1) * 3.2
        z_max = f * 3.2
        
        for ux in range(2):
            for uy in range(2):
                min_x = -5.0 + ux * (unit_w + gap)
                max_x = min_x + unit_w
                min_y = -5.0 + uy * (unit_w + gap)
                max_y = min_y + unit_w
                
                u_bounds = BoundingBox3D(min_x=min_x, max_x=max_x, min_y=min_y, max_y=max_y, min_z=z_min, max_z=z_max)
                unit_no = f * 100 + (ux * 2 + uy + 1)
                ulpin = generate_3d_ulpin("KA", "560", f, u_bounds)
                
                PARCEL_DB.append(ParcelRecord(
                    ulpin_3d=ulpin,
                    state_code="KA",
                    district_code="560",
                    floor_level=f,
                    unit_label=f"Flat-{unit_no}",
                    owner_name=sample_owners[owner_idx % len(sample_owners)],
                    base_survey_no="SY-142/2A",
                    volume_m3=round(unit_w * unit_w * 3.2, 2),
                    bounds=u_bounds,
                    registration_timestamp=time.time()
                ))
                owner_idx += 1
                
    return {"status": "success", "total_registered": len(PARCEL_DB)}