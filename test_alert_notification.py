#!/usr/bin/env python3
"""
Test script to send a fake suspicious person alert to the backend.
This will trigger the WebSocket notification and test the sound/popup system.
"""
import requests
import json
from datetime import datetime

# Create a test alert for an "Unknown" person
alert_data = {
    "name": "Unknown",
    "camera_id": 1,
    "timestamp": datetime.now().isoformat(),
    "filename": "test_alert_2025-11-08.jpg",
    "suspicious": True,
    "camera_name": "Test Camera"
}

print("Sending test alert to backend...")
print(json.dumps(alert_data, indent=2))

try:
    response = requests.post(
        "http://127.0.0.1:8000/alerts",
        json=alert_data,
        timeout=2
    )
    print(f"\n✓ Response: {response.status_code}")
    print(response.json())
    print("\n🔊 Alert sent! Check your dashboard for:")
    print("  - Sound notification")
    print("  - Browser popup notification")
    print("  - Toast popup in top-right corner")
except Exception as e:
    print(f"\n✗ Error: {e}")
