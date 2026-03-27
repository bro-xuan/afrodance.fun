import os
from dataclasses import dataclass

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import (
    FaceLandmarker,
    FaceLandmarkerOptions,
    RunningMode,
)
import config


@dataclass
class DetectionResult:
    face_detected: bool
    yaw: float = 0.0
    pitch: float = 0.0
    roll: float = 0.0
    landmarks: list = None
    state: str = "absent"  # "focused" | "distracted_yaw" | "distracted_pitch" | "absent" | "calibrating"


# Canonical 3D model points for 6 key face landmarks (nose-centered coords)
MODEL_POINTS = np.array([
    [0.0, 0.0, 0.0],         # Nose tip (1)
    [0.0, -63.6, -12.5],     # Chin (152)
    [-43.3, 32.7, -26.0],    # Left eye outer corner (33)
    [43.3, 32.7, -26.0],     # Right eye outer corner (263)
    [-28.9, -28.9, -24.1],   # Left mouth corner (61)
    [28.9, -28.9, -24.1],    # Right mouth corner (291)
], dtype=np.float64)

# Landmark indices corresponding to the model points above
LANDMARK_INDICES = [1, 152, 33, 263, 61, 291]

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "face_landmarker.task")


class FocusDetector:
    def __init__(self):
        options = FaceLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=MODEL_PATH),
            running_mode=RunningMode.VIDEO,
            num_faces=1,
            min_face_detection_confidence=config.FACE_DETECTION_CONFIDENCE,
            min_face_presence_confidence=config.FACE_DETECTION_CONFIDENCE,
            min_tracking_confidence=config.FACE_TRACKING_CONFIDENCE,
        )
        self.landmarker = FaceLandmarker.create_from_options(options)
        self.smoothed_yaw = 0.0
        self.smoothed_pitch = 0.0
        self.smoothed_roll = 0.0
        self._frame_ts = 0

        # Calibration baseline (None = uncalibrated)
        self.baseline_yaw = None
        self.baseline_pitch = None
        self.baseline_roll = None

    @property
    def is_calibrated(self):
        return self.baseline_yaw is not None

    def calibrate(self, samples):
        """Set baseline from a list of (yaw, pitch, roll) tuples."""
        if not samples:
            return
        yaws, pitches, rolls = zip(*samples)
        self.baseline_yaw = sum(yaws) / len(yaws)
        self.baseline_pitch = sum(pitches) / len(pitches)
        self.baseline_roll = sum(rolls) / len(rolls)

    def process_frame(self, frame: np.ndarray) -> DetectionResult:
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

        self._frame_ts += 33  # ~30fps, timestamps must be monotonically increasing
        results = self.landmarker.detect_for_video(mp_image, self._frame_ts)

        if not results.face_landmarks:
            self.smoothed_yaw = 0.0
            self.smoothed_pitch = 0.0
            self.smoothed_roll = 0.0
            return DetectionResult(face_detected=False, state="absent")

        face_landmarks = results.face_landmarks[0]
        pitch, yaw, roll = self._estimate_pose(face_landmarks, frame.shape)

        # Exponential moving average for smoothing
        self.smoothed_yaw = 0.7 * self.smoothed_yaw + 0.3 * yaw
        self.smoothed_pitch = 0.7 * self.smoothed_pitch + 0.3 * pitch
        self.smoothed_roll = 0.7 * self.smoothed_roll + 0.3 * roll

        if not self.is_calibrated:
            state = "calibrating"
        else:
            state = self._classify(self.smoothed_yaw, self.smoothed_pitch)

        return DetectionResult(
            face_detected=True,
            yaw=self.smoothed_yaw,
            pitch=self.smoothed_pitch,
            roll=self.smoothed_roll,
            landmarks=face_landmarks,
            state=state,
        )

    def _estimate_pose(self, landmarks, frame_shape):
        h, w = frame_shape[:2]

        image_points = np.array([
            [landmarks[i].x * w, landmarks[i].y * h]
            for i in LANDMARK_INDICES
        ], dtype=np.float64)

        focal_length = w
        center = (w / 2.0, h / 2.0)
        camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1],
        ], dtype=np.float64)

        dist_coeffs = np.zeros((4, 1))

        success, rotation_vec, translation_vec = cv2.solvePnP(
            MODEL_POINTS, image_points, camera_matrix, dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE,
        )

        if not success:
            return 0.0, 0.0, 0.0

        rotation_mat, _ = cv2.Rodrigues(rotation_vec)
        angles, _, _, _, _, _ = cv2.RQDecomp3x3(rotation_mat)
        pitch, yaw, roll = angles[0], angles[1], angles[2]
        return pitch, yaw, roll

    def _classify(self, yaw, pitch):
        yaw_dev = abs(yaw - self.baseline_yaw)
        pitch_down = self.baseline_pitch - pitch  # positive = looking further down
        pitch_up = pitch - self.baseline_pitch     # positive = looking further up

        if yaw_dev > config.YAW_THRESHOLD:
            return "distracted_yaw"
        if pitch_down > config.PITCH_DOWN_DEVIATION:
            return "distracted_pitch"
        if pitch_up > config.PITCH_UP_DEVIATION:
            return "distracted_pitch"
        return "focused"

    def close(self):
        self.landmarker.close()
