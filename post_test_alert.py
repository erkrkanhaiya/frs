#!/usr/bin/env python3
"""
Quick helper to post a synthetic alert to the local FastAPI server.
Usage:
  ./post_test_alert.py --name Unknown --camera 1 --filename test.jpg --suspicious
"""
import argparse
from datetime import datetime
import json
import sys

try:
    import requests
except Exception:
    print("Please install requests: pip install requests", file=sys.stderr)
    sys.exit(2)

parser = argparse.ArgumentParser()
parser.add_argument("--name", default="Unknown")
parser.add_argument("--camera", type=int, default=1)
parser.add_argument("--filename", default="test.jpg")
parser.add_argument("--iso", action="store_true", help="Use ISO timestamp instead of legacy format")
parser.add_argument("--suspicious", action="store_true")
parser.add_argument("--host", default="http://127.0.0.1:8000")
args = parser.parse_args()

now = datetime.utcnow()
if args.iso:
    ts = now.isoformat()
else:
    ts = now.strftime("%Y%m%d_%H%M%S")

payload = {
    "name": args.name,
    "camera_id": args.camera,
    "timestamp": ts,
    "filename": args.filename,
    "suspicious": bool(args.suspicious)
}

r = requests.post(f"{args.host}/alerts", json=payload, timeout=3)
r.raise_for_status()
print("Posted:", json.dumps(payload, indent=2))
