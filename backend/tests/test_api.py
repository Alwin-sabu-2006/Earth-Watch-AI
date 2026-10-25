import pytest

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "EarthWatch AI Platform API"
    assert data["status"] == "online"


def test_get_satellites(client):
    response = client.get("/api/satellites")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    # Verify core fields
    first = data[0]
    assert "id" in first
    assert "name" in first
    assert "latitude" in first
    assert "longitude" in first
    assert "mission" in first


def test_get_satellites_filtered(client):
    response = client.get("/api/satellites?mission=Weather")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    for sat in data:
        assert sat["mission"].lower() == "weather"


def test_get_events(client):
    response = client.get("/api/events")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    for ev in data:
        assert "id" in ev
        assert "title" in ev
        assert "severity" in ev
        assert "latitude" in ev
        assert "longitude" in ev


def test_get_events_by_severity(client):
    response = client.get("/api/events?severity=critical")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    for ev in data:
        assert ev["severity"].lower() == "critical"


def test_simulation_oceanic_vs_terrestrial(client):
    # Oceanic cyclone simulation (e.g., Bay of Bengal)
    payload_ocean = {
        "event_type": "cyclone",
        "starting_location_name": "Bay of Bengal (Central Basin)",
        "latitude": 15.0,
        "longitude": 88.0,
        "intensity": 4,
        "radius_km": 120.0,
        "direction_deg": 315.0,
        "speed_kmh": 22.0,
        "duration_hours": 48
    }
    resp_ocean = client.post("/api/simulation", json=payload_ocean)
    assert resp_ocean.status_code == 200
    data_ocean = resp_ocean.json()
    assert data_ocean["event_type"] == "cyclone"
    assert len(data_ocean["steps"]) >= 3
    # Check that maritime population density is reasonably small, not millions
    first_step_pop = data_ocean["steps"][0]["affected_population"]
    assert first_step_pop < 1500000

    # Terrestrial simulation
    payload_land = {
        "event_type": "flood",
        "starting_location_name": "Tokyo Metropolis",
        "latitude": 35.6762,
        "longitude": 139.6503,
        "intensity": 3,
        "radius_km": 50.0,
        "direction_deg": 90.0,
        "speed_kmh": 10.0,
        "duration_hours": 24
    }
    resp_land = client.post("/api/simulation", json=payload_land)
    assert resp_land.status_code == 200
    data_land = resp_land.json()
    assert data_land["event_type"] == "flood"


def test_ai_analyst_fallback(client):
    payload = {
        "query": "What disasters are currently being monitored?"
    }
    response = client.post("/api/ai/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert len(data["answer"]) > 10
    assert data["confidence"] > 0.0


def test_world_monitor_overview(client):
    response = client.get("/api/world-monitor/overview")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data


def test_celestrak_status(client):
    response = client.get("/api/celestrak/status")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert "provider" in data
