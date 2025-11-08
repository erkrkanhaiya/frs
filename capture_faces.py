#!/usr/bin/env python3
"""
Simple webcam helper to capture labeled face images into
`faces_db/<PersonName>/` for use with `realtime_face_watchlist.py`.

Usage examples:
  # Interactive capture: press 'c' to save a frame, 'q' to quit
  python capture_faces.py --name john_doe

  # Auto-capture 20 images with 0.5s delay between frames
  python capture_faces.py --name john_doe --count 20 --delay 0.5

This script is offline and uses your local webcam only.
"""

import cv2
import os
import time
import argparse
from datetime import datetime

FACE_DB_PATH = "faces_db"


def ensure_dir(path: str):
    if not os.path.exists(path):
        os.makedirs(path, exist_ok=True)


def parse_args():
    p = argparse.ArgumentParser(description="Capture labeled face images from webcam")
    p.add_argument("--name", required=True, help="Person name (folder will be created under faces_db)")
    p.add_argument("--camera", type=int, default=0, help="Camera index (default: 0)")
    p.add_argument("--count", type=int, default=0, help="If >0, auto-capture this many images then exit")
    p.add_argument("--delay", type=float, default=0.5, help="Delay between auto-captures in seconds")
    p.add_argument("--width", type=int, default=640, help="Frame width to request from camera")
    return p.parse_args()


def main():
    args = parse_args()
    target_dir = os.path.join(FACE_DB_PATH, args.name)
    ensure_dir(target_dir)

    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened():
        print(f"ERROR: Cannot open camera index {args.camera}")
        return

    # Request a resolution for faster processing / consistent images
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, args.width)

    print("Instructions:")
    print(" - Press 'c' to capture/save a frame")
    print(" - Press 'q' to quit")
    if args.count > 0:
        print(f"Auto-capture mode: capturing {args.count} images with {args.delay}s delay")

    saved = 0
    auto_mode = args.count > 0

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Failed to read frame from camera")
                break

            # Show instructions overlay
            overlay = frame.copy()
            cv2.putText(overlay, f"Name: {args.name}", (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,0), 2)
            if auto_mode:
                cv2.putText(overlay, f"Auto: {saved}/{args.count}", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,255), 2)
            cv2.imshow(f"Capture -> {args.name}", overlay)

            if auto_mode:
                # Save and wait
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
                filename = f"{timestamp}_{saved+1}.jpg"
                filepath = os.path.join(target_dir, filename)
                cv2.imwrite(filepath, frame)
                saved += 1
                print(f"Saved {filepath}")
                if saved >= args.count:
                    break
                time.sleep(args.delay)
                # allow window events
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                continue

            # Interactive mode
            key = cv2.waitKey(1) & 0xFF
            if key == ord('c'):
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
                filename = f"{timestamp}.jpg"
                filepath = os.path.join(target_dir, filename)
                cv2.imwrite(filepath, frame)
                saved += 1
                print(f"Saved {filepath}")
            elif key == ord('q'):
                break

    finally:
        cap.release()
        cv2.destroyAllWindows()
        print(f"Done. Captured {saved} images to {target_dir}")


if __name__ == '__main__':
    main()
