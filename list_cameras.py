#!/usr/bin/env python3
"""
Probe local camera indices 0..N-1 to find which ones can be opened.
Run this to help identify the correct camera index or surface permission errors.
"""
import cv2
import time

MAX_INDEX = 6

def probe(max_index=MAX_INDEX):
    results = {}
    for i in range(max_index):
        cap = cv2.VideoCapture(i)
        time.sleep(0.5)
        ok, frame = cap.read()
        if ok and frame is not None:
            results[i] = True
            print(f"Camera index {i}: OPEN (read frame)")
        else:
            # Try to print backend status if possible
            status = cap.get(cv2.CAP_PROP_POS_MSEC)
            print(f"Camera index {i}: FAILED to open or read (status {status})")
            results[i] = False
        cap.release()
    return results

if __name__ == '__main__':
    print("Probing camera indices 0..5")
    res = probe()
    open_indices = [i for i,ok in res.items() if ok]
    if open_indices:
        print("Open camera indices:", open_indices)
    else:
        print("No camera indices opened. On macOS grant Camera permission to the Terminal/python process in System Settings → Privacy & Security → Camera.")
