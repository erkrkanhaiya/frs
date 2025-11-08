#!/usr/bin/env python3
"""
Real-time Face Recognition Surveillance System
-------------------------------------------
A multi-threaded face recognition system that monitors camera feeds
for known faces and logs detection incidents.
"""

import cv2
import face_recognition
import numpy as np
import os
import time
from datetime import datetime
import threading
from queue import Queue
import logging
from typing import Dict, List, Set, Tuple
import imutils

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration constants
FACE_DB_PATH = "faces_db"
INCIDENTS_PATH = "incidents"
ALERT_COOLDOWN = 10  # seconds between duplicate alerts
CONFIDENCE_THRESHOLD = 0.6
FRAME_WIDTH = 640  # Adjust for performance vs quality
PROCESS_EVERY_N_FRAMES = 2  # Skip frames for better performance

# Default camera sources - can be camera indices (0, 1) or RTSP URLs
DEFAULT_CAMERAS = [0]  # Add more camera indices or RTSP URLs here

def parse_camera_source(source):
    """Parse camera source into OpenCV-compatible format."""
    if isinstance(source, (int, str)):
        return source
    try:
        # Try to convert string to int for number-like values
        return int(str(source))
    except ValueError:
        # Return as-is for RTSP URLs
        return str(source)

class FaceRecognitionSystem:
    def __init__(self, camera_sources=None):
        """
        Initialize the face recognition system.
        
        Args:
            camera_sources: List of camera sources (indices or RTSP URLs).
                          Defaults to DEFAULT_CAMERAS if None.
        """
        self.known_face_encodings: List[np.ndarray] = []
        self.known_face_names: List[str] = []
        self.last_alerts: Dict[str, float] = {}
        self.camera_queues: List[Queue] = []
        self.camera_threads: List[threading.Thread] = []
        self.processing_thread: threading.Thread = None
        self.is_running = False
        # Thread-safe store for latest processed frames to be displayed by main thread
        self.latest_frames: Dict[int, np.ndarray] = {}
        self.frame_lock = threading.Lock()
        # Store camera sources
        self.camera_sources = [parse_camera_source(src) for src in (camera_sources or DEFAULT_CAMERAS)]
        
        # Ensure required directories exist
        os.makedirs(INCIDENTS_PATH, exist_ok=True)
        
        # Load known faces
        self._load_known_faces()

    def _load_known_faces(self) -> None:
        """Load and encode all known faces from the faces_db directory."""
        logger.info("Loading known faces...")
        
        if not os.path.exists(FACE_DB_PATH):
            logger.error(f"Face database directory '{FACE_DB_PATH}' not found!")
            return
            
        for person_name in os.listdir(FACE_DB_PATH):
            person_dir = os.path.join(FACE_DB_PATH, person_name)
            if not os.path.isdir(person_dir):
                continue
                
            for image_name in os.listdir(person_dir):
                if not image_name.lower().endswith(('.png', '.jpg', '.jpeg')):
                    continue
                    
                image_path = os.path.join(person_dir, image_name)
                try:
                    # Load and encode face
                    face_image = face_recognition.load_image_file(image_path)
                    face_encodings = face_recognition.face_encodings(face_image)
                    
                    if face_encodings:
                        self.known_face_encodings.append(face_encodings[0])
                        self.known_face_names.append(person_name)
                        logger.info(f"Loaded face: {person_name} ({image_name})")
                    else:
                        logger.warning(f"No face found in {image_path}")
                        
                except Exception as e:
                    logger.error(f"Error loading {image_path}: {str(e)}")
        
        logger.info(f"Loaded {len(self.known_face_encodings)} faces")

    def _process_frame(self, frame: np.ndarray, camera_id: int) -> Tuple[np.ndarray, Set[str]]:
        """
        Process a single frame to detect and recognize faces.
        
        Args:
            frame: The frame to process
            camera_id: ID of the camera that captured the frame
            
        Returns:
            Tuple of processed frame and set of detected names
        """
        # Resize frame for faster processing
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        # Convert BGR to RGB and ensure the array is contiguous for dlib bindings
        rgb_small_frame = np.ascontiguousarray(small_frame[:, :, ::-1])  # BGR to RGB

        # Find faces in frame
        face_locations = face_recognition.face_locations(rgb_small_frame)
        try:
            face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)
        except Exception as e:
            logger.error(f"Error computing face encodings: {e}")
            face_encodings = []
        
        detected_names = set()
        
        # Process each detected face
        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            # Scale back face locations
            top *= 4
            right *= 4
            bottom *= 4
            left *= 4
            
            # Compare with known faces
            matches = face_recognition.compare_faces(
                self.known_face_encodings,
                face_encoding,
                tolerance=CONFIDENCE_THRESHOLD
            )
            
            name = "Unknown"
            if True in matches:
                # Find best match
                face_distances = face_recognition.face_distance(
                    self.known_face_encodings,
                    face_encoding
                )
                best_match_index = np.argmin(face_distances)
                
                if matches[best_match_index]:
                    name = self.known_face_names[best_match_index]
                    detected_names.add(name)
                    
                    # Check alert cooldown
                    current_time = time.time()
                    last_alert_time = self.last_alerts.get(name, 0)
                    
                    if current_time - last_alert_time >= ALERT_COOLDOWN:
                        self.last_alerts[name] = current_time
                        self._log_incident(frame, name, camera_id)
            
            # Draw box and label
            color = (0, 0, 255) if name != "Unknown" else (255, 0, 0)
            cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
            cv2.rectangle(frame, (left, bottom - 35),
                         (right, bottom), color, cv2.FILLED)
            cv2.putText(frame, name, (left + 6, bottom - 6),
                       cv2.FONT_HERSHEY_DUPLEX, 0.6, (255, 255, 255), 1)
        
        return frame, detected_names

    def _log_incident(self, frame: np.ndarray, name: str, camera_id: int) -> None:
        """Log a detection incident with snapshot."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_cam{camera_id}_{name}.jpg"
        filepath = os.path.join(INCIDENTS_PATH, filename)
        
        cv2.imwrite(filepath, frame)
        logger.warning(f"⚠️ Alert! {name} detected on camera {camera_id}")
        logger.info(f"Incident logged: {filename}")
        # Try to POST alert to local FastAPI server (non-blocking, best-effort)
        try:
            self._post_alert(name, camera_id, timestamp, filename)
        except Exception as e:
            logger.debug(f"Failed to send alert to local server: {e}")

    def _post_alert(self, name: str, camera_id: int, timestamp: str, filename: str) -> None:
        """Best-effort POST to local FastAPI server at http://127.0.0.1:8000/alerts"""
        payload = {
            "name": name,
            "camera_id": camera_id,
            "timestamp": timestamp,
            "filename": filename,
        }
        url = "http://127.0.0.1:8000/alerts"
        # Try requests if available, otherwise use urllib
        try:
            import requests
            try:
                requests.post(url, json=payload, timeout=0.8)
            except Exception:
                # swallow any network error to avoid blocking main loop
                pass
            return
        except Exception:
            pass

        # Fallback to urllib
        try:
            import json as _json
            from urllib import request as _request
            data = _json.dumps(payload).encode("utf-8")
            req = _request.Request(url, data=data, headers={"Content-Type": "application/json"})
            # Use a short timeout
            with _request.urlopen(req, timeout=0.8) as resp:
                _ = resp.read()
        except Exception:
            # ignore failures — server is optional
            return

    def _camera_thread(self, camera_id: int, source: str, queue: Queue) -> None:
        """
        Thread function to capture frames from a camera or RTSP stream.
        
        Args:
            camera_id: Numeric ID for this camera thread
            source: Camera index (int) or RTSP URL (str)
            queue: Queue to put captured frames into
        """
        # For RTSP streams, set additional options
        cap = cv2.VideoCapture(source)
        if isinstance(source, str) and source.startswith(('rtsp://', 'rtmp://')):
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 2)  # Minimize latency
        
        if not cap.isOpened():
            logger.error(f"Failed to open camera {camera_id} (source: {source})")
            return
            
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
        frame_count = 0
        fps_start = time.time()
        fps = 0
        
        while self.is_running:
            ret, frame = cap.read()
            if not ret:
                logger.error(f"Failed to read frame from camera {camera_id}")
                break
                
            frame_count += 1
            
            # Calculate FPS
            if frame_count % 30 == 0:
                fps = 30 / (time.time() - fps_start)
                fps_start = time.time()
            
            # Add FPS counter
            cv2.putText(frame, f"FPS: {fps:.1f}", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
            # Only process every Nth frame
            if frame_count % PROCESS_EVERY_N_FRAMES == 0:
                queue.put((frame, camera_id))
        
        cap.release()

    def _processing_thread(self) -> None:
        """Thread function to process frames from all cameras."""
        while self.is_running:
            # Process frames from all cameras
            for q in self.camera_queues:
                if not q.empty():
                    frame, camera_id = q.get()
                    processed_frame, detected_names = self._process_frame(frame, camera_id)

                    # Store the processed frame for the main thread to display.
                    with self.frame_lock:
                        self.latest_frames[camera_id] = processed_frame
            # small yield to avoid busy loop
            time.sleep(0.01)

    def start(self) -> None:
        """Start the face recognition system."""
        if not self.known_face_encodings:
            logger.error("No known faces loaded! Add face images to faces_db/ directory.")
            return
            
        self.is_running = True
        
        # Start camera threads
        for i, source in enumerate(self.camera_sources):
            queue = Queue(maxsize=2)  # Limit queue size to prevent memory issues
            self.camera_queues.append(queue)
            
            thread = threading.Thread(
                target=self._camera_thread,
                args=(i, source, queue),
                daemon=True
            )
            self.camera_threads.append(thread)
            thread.start()
            source_desc = f"{source}" if isinstance(source, int) else f"RTSP: {source}"
            logger.info(f"Started camera {i} ({source_desc})")
        
        # Start processing thread
        self.processing_thread = threading.Thread(
            target=self._processing_thread,
            daemon=True
        )
        self.processing_thread.start()
        logger.info("Face recognition system started")
        
        try:
            # Keep main thread alive and display frames (main thread must handle GUI)
            while self.is_running:
                # Display latest frames captured by processing thread
                with self.frame_lock:
                    for camera_id, frame in list(self.latest_frames.items()):
                        window_name = f"Camera {camera_id}"
                        try:
                            if frame is not None and hasattr(frame, 'shape'):
                                cv2.imshow(window_name, frame)
                            else:
                                logger.debug(f"No valid frame for camera {camera_id} to display")
                        except cv2.error as e:
                            logger.error(f"OpenCV imshow error for camera {camera_id}: {e}")
                # Handle quit key in main thread
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    self.stop()
                time.sleep(0.01)
        except KeyboardInterrupt:
            self.stop()

    def stop(self) -> None:
        """Stop the face recognition system."""
        self.is_running = False
        
        # Wait for threads to finish
        for thread in self.camera_threads:
            thread.join()
        
        if self.processing_thread:
            self.processing_thread.join()
        
        # Clean up windows
        cv2.destroyAllWindows()
        logger.info("Face recognition system stopped")

if __name__ == "__main__":
    system = FaceRecognitionSystem()
    system.start()