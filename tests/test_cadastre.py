"""
Comprehensive Test Suite for SIH26011 3D ULPIN Cadastral System
Validates 3D ULPIN generation, spatial collision rejection, LiDAR floor slicing, and REST API endpoints.
"""
import pytest
from fastapi.testclient import TestClient

from main import app
from db.database import get_db
from db.models import BoundingBox3DData, Parcel3DRecord
from core.ulpin_engine import generate_3d_ulpin, parse_3d_ulpin
from core.topology_validator import (
    TopologyValidator,
    check_3d_collision,
    compute_3d_intersection_volume,
)
from pipeline.lidar_processor import (
    LidarProcessor,
    generate_synthetic_building_points,
)

client = TestClient(app)

# -----------------------------------------------------------------------------
# 1. 3D ULPIN Formulation & Determinism Tests
# -----------------------------------------------------------------------------

def test_ulpin_format_positive_floor():
    bounds = BoundingBox3DData(min_x=0.0, max_x=10.0, min_y=0.0, max_y=10.0, min_z=6.4, max_z=9.6)
    ulpin = generate_3d_ulpin("KA", "560", 3, bounds)
    assert ulpin.startswith("IN-KA-560-F03-Z08-")
    parsed = parse_3d_ulpin(ulpin)
    assert parsed["valid"] is True
    assert parsed["state_code"] == "KA"
    assert parsed["district_code"] == "560"
    assert parsed["floor_level"] == 3

def test_ulpin_format_basement_and_negative_z():
    bounds = BoundingBox3DData(min_x=-5.0, max_x=5.0, min_y=-5.0, max_y=5.0, min_z=-6.0, max_z=-3.0)
    ulpin = generate_3d_ulpin("MH", "400", -2, bounds)
    assert ulpin.startswith("IN-MH-400-B02-ZNEG04-") or ulpin.startswith("IN-MH-400-B02-ZNEG05-")
    parsed = parse_3d_ulpin(ulpin)
    assert parsed["valid"] is True
    assert parsed["state_code"] == "MH"
    assert parsed["floor_level"] == -2

def test_ulpin_determinism():
    bounds1 = BoundingBox3DData(min_x=1.0, max_x=5.0, min_y=2.0, max_y=6.0, min_z=0.0, max_z=3.0)
    bounds2 = BoundingBox3DData(min_x=1.0, max_x=5.0, min_y=2.0, max_y=6.0, min_z=0.0, max_z=3.0)
    ulpin1 = generate_3d_ulpin("DL", "110", 1, bounds1)
    ulpin2 = generate_3d_ulpin("DL", "110", 1, bounds2)
    assert ulpin1 == ulpin2

# -----------------------------------------------------------------------------
# 2. 3D Spatial Collision & Topology Validation Tests
# -----------------------------------------------------------------------------

def test_3d_collision_detection():
    b1 = BoundingBox3DData(min_x=0.0, max_x=5.0, min_y=0.0, max_y=5.0, min_z=0.0, max_z=3.0)
    b2 = BoundingBox3DData(min_x=2.0, max_x=7.0, min_y=2.0, max_y=7.0, min_z=1.0, max_z=4.0)
    assert check_3d_collision(b1, b2) is True
    vol = compute_3d_intersection_volume(b1, b2)
    assert vol == pytest.approx((5.0 - 2.0) * (5.0 - 2.0) * (3.0 - 1.0))

def test_3d_adjacent_no_collision():
    # Two units on same floor side-by-side
    b1 = BoundingBox3DData(min_x=0.0, max_x=5.0, min_y=0.0, max_y=5.0, min_z=0.0, max_z=3.0)
    b2 = BoundingBox3DData(min_x=5.0, max_x=10.0, min_y=0.0, max_y=5.0, min_z=0.0, max_z=3.0)
    assert check_3d_collision(b1, b2) is False

def test_topology_validator_rejection():
    validator = TopologyValidator(ground_boundary={"min_x": -10, "max_x": 10, "min_y": -10, "max_y": 10})
    
    existing_parcel = Parcel3DRecord(
        ulpin_3d="IN-KA-560-F01-Z02-A1B2C3",
        floor_level=1,
        unit_label="Unit-101",
        owner_name="Test Citizen",
        bounds=BoundingBox3DData(min_x=0, max_x=4, min_y=0, max_y=4, min_z=0, max_z=3.2)
    )

    # Candidate overlapping existing unit
    candidate_overlap = BoundingBox3DData(min_x=2, max_x=6, min_y=2, max_y=6, min_z=1, max_z=4)
    report = validator.validate_candidate(candidate_overlap, candidate_floor=1, existing_parcels=[existing_parcel])
    assert report.is_valid is False
    assert report.total_conflicts > 0
    assert report.issues[0].intersection_volume_m3 > 0

    # Candidate outside boundary lot
    candidate_out_of_bounds = BoundingBox3DData(min_x=8, max_x=14, min_y=0, max_y=4, min_z=0, max_z=3.2)
    report_bounds = validator.validate_candidate(candidate_out_of_bounds, candidate_floor=1, existing_parcels=[])
    assert report_bounds.is_valid is False
    assert report_bounds.ground_boundary_contained is False

# -----------------------------------------------------------------------------
# 3. LiDAR Ingestion & Floor Slicing Pipeline Tests
# -----------------------------------------------------------------------------

def test_lidar_floor_slicing_pipeline():
    processor = LidarProcessor(target_floor_height=3.2)
    points = generate_synthetic_building_points(num_floors=4, floor_height=3.2, footprint_size=10.0)
    assert len(points) > 1000

    result = processor.process_point_array(points)
    assert result.detected_floors == 4
    assert len(result.strata) == 4
    assert result.building_height_m > 10.0
    assert result.quality_metrics["footprint_iou_estimate"] > 0.90

# -----------------------------------------------------------------------------
# 4. REST API Endpoint Integration Tests
# -----------------------------------------------------------------------------

def test_api_seed_complex_and_list():
    res = client.post("/api/seed-complex")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["total_registered"] >= 16

    # Query all parcels
    list_res = client.get("/api/parcels")
    assert list_res.status_code == 200
    parcels = list_res.json()
    assert len(parcels) >= 16

    # Query with floor filter
    f2_res = client.get("/api/parcels?floor_level=2")
    assert f2_res.status_code == 200
    f2_parcels = f2_res.json()
    for p in f2_parcels:
        assert p["floor_level"] == 2

def test_api_parcel_get_and_3d_exports():
    list_res = client.get("/api/parcels")
    parcels = list_res.json()
    first_ulpin = parcels[0]["ulpin_3d"]

    # RoR lookup
    get_res = client.get(f"/api/parcel/{first_ulpin}")
    assert get_res.status_code == 200
    p_data = get_res.json()
    assert p_data["ulpin_3d"] == first_ulpin

    # 3D GeoJSON export
    geo_res = client.get(f"/api/parcel/{first_ulpin}/3d?format=geojson")
    assert geo_res.status_code == 200
    assert "FeatureCollection" in geo_res.text

    # 3D CityGML export
    city_res = client.get(f"/api/parcel/{first_ulpin}/3d?format=citygml")
    assert city_res.status_code == 200
    assert "CityModel" in city_res.text
    assert first_ulpin in city_res.text

    # 3D glTF export
    gltf_res = client.get(f"/api/parcel/{first_ulpin}/3d?format=gltf")
    assert gltf_res.status_code == 200
    assert "asset" in gltf_res.json()

def test_api_register_parcel_collision_rejection():
    # Retrieve existing parcel bounds
    list_res = client.get("/api/parcels")
    existing_p = list_res.json()[0]
    eb = existing_p["bounds"]

    # Attempt to register an exact colliding unit
    colliding_payload = {
        "state_code": "KA",
        "district_code": "560",
        "floor_level": existing_p["floor_level"],
        "unit_label": "Colliding Unit",
        "owner_name": "Fraudulent Applicant",
        "base_survey_no": "SY-142/2A",
        "bounds": {
            "min_x": eb["min_x"],
            "max_x": eb["max_x"],
            "min_y": eb["min_y"],
            "max_y": eb["max_y"],
            "min_z": eb["min_z"],
            "max_z": eb["max_z"]
        }
    }
    reg_res = client.post("/api/parcels/register", json=colliding_payload)
    assert reg_res.status_code == 400
    assert "3D Topology Validation Rejected" in reg_res.json()["detail"]

def test_api_metrics_endpoint():
    res = client.get("/api/metrics")
    assert res.status_code == 200
    metrics = res.json()
    assert metrics["registered_parcels_count"] > 0
    assert metrics["topological_conflict_rate"] == 0.0
