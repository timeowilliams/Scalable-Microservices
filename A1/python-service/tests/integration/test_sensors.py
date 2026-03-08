import pytest
import os
import sys
from pathlib import Path

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from fastapi.testclient import TestClient
from app import app


@pytest.fixture
def client():
    # Set test API key
    os.environ['API_KEY'] = 'test-api-key-123'
    return TestClient(app)


@pytest.fixture(autouse=True)
def cleanup_env():
    """Clean up environment after each test"""
    yield
    # Cleanup happens automatically when fixture goes out of scope


class TestCreateSensor:
    def test_create_sensor_with_valid_api_key(self, client):
        """Test creating a new sensor with valid API key"""
        new_sensor = {
            "sensor_id": "test_temp_sensor",
            "type": "temperature",
            "value": 75.5,
            "unit": "F"
        }

        response = client.post(
            "/sensors",
            json=new_sensor,
            headers={"Authorization": "Bearer test-api-key-123"}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["sensor_id"] == "test_temp_sensor"
        assert data["type"] == "temperature"
        assert data["value"] == 75.5
        assert data["unit"] == "F"
        assert "timestamp" in data
        assert "X-Correlation-ID" in response.headers

    def test_create_sensor_without_api_key(self, client):
        """Test creating sensor without API key returns 401"""
        new_sensor = {
            "sensor_id": "test_sensor_no_auth",
            "type": "humidity",
            "value": 50,
            "unit": "%"
        }

        response = client.post("/sensors", json=new_sensor)

        assert response.status_code == 401
        assert "error" in response.json() or "detail" in response.json()

    def test_create_sensor_with_invalid_api_key(self, client):
        """Test creating sensor with invalid API key returns 401"""
        new_sensor = {
            "sensor_id": "test_sensor_invalid_key",
            "type": "motion",
            "value": 1,
            "unit": "boolean"
        }

        response = client.post(
            "/sensors",
            json=new_sensor,
            headers={"Authorization": "Bearer invalid-key"}
        )

        assert response.status_code == 401

    def test_create_sensor_missing_required_fields(self, client):
        """Test creating sensor with missing required fields returns 400"""
        incomplete_sensor = {
            "type": "temperature",
            "value": 70
            # missing sensor_id and unit
        }

        response = client.post(
            "/sensors",
            json=incomplete_sensor,
            headers={"Authorization": "Bearer test-api-key-123"}
        )

        assert response.status_code == 422  # FastAPI validation error

    def test_create_duplicate_sensor(self, client):
        """Test creating duplicate sensor returns 409"""
        sensor = {
            "sensor_id": "duplicate_sensor",
            "type": "temperature",
            "value": 70,
            "unit": "F"
        }

        # Create first time
        response1 = client.post(
            "/sensors",
            json=sensor,
            headers={"Authorization": "Bearer test-api-key-123"}
        )
        assert response1.status_code == 201

        # Try to create again
        response2 = client.post(
            "/sensors",
            json=sensor,
            headers={"Authorization": "Bearer test-api-key-123"}
        )
        assert response2.status_code == 409
        assert "already exists" in response2.json()["detail"]


class TestGetSensorById:
    def test_get_sensor_by_id(self, client):
        """Test fetching created sensor by ID"""
        # First create a sensor
        new_sensor = {
            "sensor_id": "fetch_test_sensor",
            "type": "pressure",
            "value": 14.7,
            "unit": "psi"
        }

        create_response = client.post(
            "/sensors",
            json=new_sensor,
            headers={"Authorization": "Bearer test-api-key-123"}
        )
        assert create_response.status_code == 201
        created_sensor = create_response.json()

        # Then fetch it by ID
        fetch_response = client.get(f"/sensors/{created_sensor['sensor_id']}")
        assert fetch_response.status_code == 200

        fetched = fetch_response.json()

        # Verify data integrity
        assert fetched["sensor_id"] == created_sensor["sensor_id"]
        assert fetched["type"] == created_sensor["type"]
        assert fetched["value"] == created_sensor["value"]
        assert fetched["unit"] == created_sensor["unit"]
        assert fetched["timestamp"] == created_sensor["timestamp"]
        assert "X-Correlation-ID" in fetch_response.headers

    def test_get_nonexistent_sensor(self, client):
        """Test fetching non-existent sensor returns 404"""
        response = client.get("/sensors/non_existent_sensor_12345")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"]


class TestGetAllSensors:
    def test_get_all_sensors(self, client):
        """Test getting all sensors"""
        response = client.get("/sensors")

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "count" in data
        assert isinstance(data["data"], list)
        assert data["count"] > 0

    def test_filter_sensors_by_type(self, client):
        """Test filtering sensors by type"""
        response = client.get("/sensors?type=temperature")

        assert response.status_code == 200
        data = response.json()
        assert all(s["type"] == "temperature" for s in data["data"])

    def test_pagination(self, client):
        """Test pagination with limit and offset"""
        response = client.get("/sensors?limit=2&offset=0")

        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) <= 2
        assert data["count"] <= 2


class TestDataIntegrity:
    def test_data_integrity_through_create_and_fetch(self, client):
        """Test data integrity through create and fetch cycle"""
        original_sensor = {
            "sensor_id": "integrity_test_sensor",
            "type": "light",
            "value": 500,
            "unit": "lux",
            "timestamp": "2026-01-18T16:00:00Z"
        }

        # Create
        create_response = client.post(
            "/sensors",
            json=original_sensor,
            headers={"Authorization": "Bearer test-api-key-123"}
        )
        assert create_response.status_code == 201
        created = create_response.json()

        # Fetch
        fetch_response = client.get(f"/sensors/{original_sensor['sensor_id']}")
        assert fetch_response.status_code == 200
        fetched = fetch_response.json()

        # Verify all fields match
        assert fetched["sensor_id"] == original_sensor["sensor_id"]
        assert fetched["type"] == original_sensor["type"]
        assert fetched["value"] == original_sensor["value"]
        assert fetched["unit"] == original_sensor["unit"]
        assert fetched["timestamp"] == original_sensor["timestamp"]
