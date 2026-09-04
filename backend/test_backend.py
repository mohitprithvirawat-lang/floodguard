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

    # 1. Test ML Metrics on 70-30% Train/Test Split
    print("Testing /api/ml/metrics (70-30% Split & Confusion Matrix)...")
    res = client.get("/api/ml/metrics")
    assert res.status_code == 200
    metrics = res.json()
    assert metrics["train_split_percentage"] == 70.0
    assert metrics["test_split_percentage"] == 30.0
    assert metrics["accuracy_percentage"] >= 85.0
    assert "confusion_matrix" in metrics
    assert "feature_importances" in metrics
    print(f"ML Metrics OK. Accuracy: {metrics['accuracy_percentage']}%, R2: {metrics['risk_score_r2']}")

    # 2. Test Official Data Sources
    print("Testing /api/ml/data-sources (Data Provenance)...")
    res = client.get("/api/ml/data-sources")
    assert res.status_code == 200
    sources = res.json()
    assert len(sources) >= 4
    source_ids = [s["source_id"] for s in sources]
    assert "IMD_DWR_AWS" in source_ids
    assert "CWC_AWLR" in source_ids
    assert "ISRO_BHUVAN_SMAP" in source_ids
    print(f"Data Sources OK. Verified {len(sources)} operational pipelines.")

    # 3. Test Future Trajectory Forecast (+1h, +2h, +3h, +6h)
    print(f"Testing /api/locations/{first_loc_id}/forecast (+1h, +2h, +3h, +6h trajectory)...")
    res = client.get(f"/api/locations/{first_loc_id}/forecast")
    assert res.status_code == 200
    fcst = res.json()
    assert "forecast_steps" in fcst
    assert len(fcst["forecast_steps"]) == 4
    assert fcst["confidence_score"] > 0
    print(f"Future Forecast OK. Model confidence: {fcst['confidence_score']}%, Steps: {len(fcst['forecast_steps'])}")

    # 4. Test Emergency SMS Generation & Multi-Language Preview
    print(f"Testing /api/sms/preview for location {first_loc_id}...")
    res = client.post("/api/sms/preview", json={
        "location_id": first_loc_id,
        "language": "BILINGUAL",
        "recipient_group": "ALL"
    })
    assert res.status_code == 200
    sms_prev = res.json()
    assert sms_prev["character_count"] > 0
    assert "final_sms_text" in sms_prev
    assert sms_prev["estimated_recipients"] > 0
    print(f"SMS Preview OK. Estimated recipients: {sms_prev['estimated_recipients']}, Parts: {sms_prev['sms_parts']}")

    # 5. Test Emergency SMS Dispatch
    print(f"Testing /api/sms/dispatch...")
    res = client.post("/api/sms/dispatch", json={
        "location_id": first_loc_id,
        "recipient_group": "RESCUE_TEAMS",
        "language": "BILINGUAL",
        "message_text": sms_prev["final_sms_text"]
    })
    assert res.status_code == 200
    dispatch_out = res.json()
    assert dispatch_out["status"] == "DELIVERED"
    assert dispatch_out["carrier_reference"] is not None
    print(f"SMS Dispatch OK. Ref: {dispatch_out['carrier_reference']}, Sent: {dispatch_out['phone_numbers_count']}")

    # 6. Test SMS History
    print("Testing /api/sms/history...")
    res = client.get("/api/sms/history")
    assert res.status_code == 200
    hist = res.json()
    assert len(hist) > 0
    print(f"SMS History OK. Found {len(hist)} dispatch records.")

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

    print("\n=======================================================")
    print(">>> ALL BACKEND & ML/SMS TESTS PASSED WITH 100% SUCCESS!")
    print("=======================================================\n")

if __name__ == "__main__":
    test_endpoints()
