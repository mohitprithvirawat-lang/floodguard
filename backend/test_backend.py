import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_endpoints():
    print("Testing /api/health...")
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("Health check OK:", res.json())

    print("Testing /api/locations...")
    res = client.get("/api/locations")
    assert res.status_code == 200
    locations = res.json()
    assert len(locations) >= 10, f"Expected >= 10 locations, got {len(locations)}"
    print(f"Loaded {len(locations)} locations successfully.")

    print("Testing /api/risk-map...")
    res = client.get("/api/risk-map")
    assert res.status_code == 200
    risk_map = res.json()
    assert risk_map["count"] >= 10
    print(f"Risk map contains {risk_map['count']} stations.")

    first_loc_id = locations[0]["id"]
    print(f"Testing /api/locations/{first_loc_id}...")
    res = client.get(f"/api/locations/{first_loc_id}")
    assert res.status_code == 200
    detail = res.json()
    assert "infrastructure" in detail
    assert "readings_history" in detail
    print(f"Location detail OK. Found {len(detail['infrastructure'])} infrastructure elements.")

    print(f"Testing /api/impact/{first_loc_id}...")
    res = client.get(f"/api/impact/{first_loc_id}")
    assert res.status_code == 200
    impact = res.json()
    assert len(impact) > 0
    print(f"Impact assessment OK. Top priority: {impact[0]['name']} (Score: {impact[0]['vulnerability_score']})")

    print("Testing /api/alerts...")
    res = client.get("/api/alerts")
    assert res.status_code == 200
    alerts = res.json()
    print(f"Alerts feed OK. Found {len(alerts)} alerts.")

    print("Testing /api/simulate/tick...")
    res = client.post("/api/simulate/tick")
    assert res.status_code == 200
    tick_res = res.json()
    print("Simulation tick OK. Total locations updated:", len(tick_res["locations"]))

    print("Testing /api/simulate/scenario (Switching Kedarnath to FLASH_FLOOD_IMMINENT)...")
    res = client.post("/api/simulate/scenario", json={"scenario": "FLASH_FLOOD_IMMINENT", "location_id": 2})
    assert res.status_code == 200
    sc_res = res.json()
    print("Scenario switch OK. Affected count:", sc_res["affected_locations_count"])

    print("\nALL BACKEND TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_endpoints()
