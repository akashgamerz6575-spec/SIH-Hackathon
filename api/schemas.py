"""
Pydantic Schemas for 3D ULPIN Cadastral REST API
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class BoundingBox3DSchema(BaseModel):
    min_x: float = Field(..., description="Easting / Local X min in meters")
    max_x: float = Field(..., description="Easting / Local X max in meters")
    min_y: float = Field(..., description="Northing / Local Y min in meters")
    max_y: float = Field(..., description="Northing / Local Y max in meters")
    min_z: float = Field(..., description="Elevation MSL Z min in meters")
    max_z: float = Field(..., description="Elevation MSL Z max in meters")

class ParcelCreateSchema(BaseModel):
    state_code: str = Field("KA", description="2-letter State code (e.g. KA, MH, DL)")
    district_code: str = Field("560", description="3-digit District code")
    floor_level: int = Field(..., description="Floor number (>0 for floors, <0 for basements, 0 for ground)")
    unit_label: str = Field(..., description="Unit identifier (e.g. Flat-302, Penthouse-A)")
    owner_name: str = Field(..., description="Full legal name of title holder")
    base_survey_no: str = Field("SY-142/2A", description="Underlying 2D cadastral land parcel survey number")
    property_type: Optional[str] = Field("Residential Apartment", description="Cadastral classification")
    bounds: BoundingBox3DSchema
    metadata_json: Optional[Dict[str, Any]] = Field(default_factory=dict)

class ParcelResponseSchema(BaseModel):
    id: str
    ulpin_3d: str
    base_survey_no: str
    state_code: str
    district_code: str
    floor_level: int
    unit_label: str
    owner_name: str
    property_type: str
    volume_m3: float
    bounds: BoundingBox3DSchema
    metadata_json: Dict[str, Any]
    encumbrance_status: str
    created_at: float

class EncroachmentIssueSchema(BaseModel):
    issue_type: str
    severity: str
    conflicting_ulpin: str
    conflicting_owner: str
    conflicting_unit: str
    intersection_volume_m3: float
    description: str

class TopologyValidationReportSchema(BaseModel):
    is_valid: bool
    total_conflicts: int
    checked_parcel_count: int
    air_rights_compliant: bool
    ground_boundary_contained: bool
    summary: str
    issues: List[EncroachmentIssueSchema]

class FloorStratumSchema(BaseModel):
    floor_level: int
    min_z: float
    max_z: float
    height_m: float
    point_count: int
    estimated_units: int
    bounds: BoundingBox3DSchema

class LidarIngestResponseSchema(BaseModel):
    total_points: int
    ground_points: int
    building_points: int
    detected_floors: int
    ground_elevation_msl: float
    building_height_m: float
    quality_metrics: Dict[str, float]
    strata: List[FloorStratumSchema]
    draft_parcels_registered: int
