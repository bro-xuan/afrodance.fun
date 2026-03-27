import argparse
import glob
import os
import subprocess
import time

import cv2

import config
from detector import FocusDetector, LANDMARK_INDICES
from alerter import Alerter, AlertState


STATE_COLORS = {
    "focused": (0, 200, 0),         # green
    "distracted_yaw": (0, 0, 220),   # red
    "distracted_pitch": (0, 0, 220),
    "absent": (180, 180, 180),       # gray
    "calibrating": (255, 180, 0),    # orange
}

ALERT_LABELS = {
    AlertState.IDLE: "",
    AlertState.GRACE_PERIOD: "GRACE PERIOD",
    AlertState.ALERTING_L1: "ALERT L1",
    AlertState.ALERTING_L2: "ALERT L2",
    AlertState.ALERTING_L3: "ALERT L3",
}

SETTINGS_WIN = "Settings"


# ---------------------------------------------------------------------------
# Discover available sounds
# ---------------------------------------------------------------------------

def discover_sounds():
    """Scan the sounds/ dir for playable audio files."""
    sounds_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sounds")
    files = sorted(
        glob.glob(os.path.join(sounds_dir, "*.mp3"))
        + glob.glob(os.path.join(sounds_dir, "*.wav"))
        + glob.glob(os.path.join(sounds_dir, "*.aiff"))
        + glob.glob(os.path.join(sounds_dir, "*.ogg"))
    )
    return files


def sound_label(path):
    """Short display name from a sound file path."""
    return os.path.splitext(os.path.basename(path))[0]


# ---------------------------------------------------------------------------
# Settings panel (OpenCV trackbar window)
# ---------------------------------------------------------------------------

class SettingsPanel:
    def __init__(self, sound_files):
        self.sound_files = sound_files
        self.visible = False
        self._preview_proc = None

        # Find current sound indices
        self._l1_idx = self._find_index(config.SOUND_GENTLE)
        self._l2_idx = self._find_index(config.SOUND_MEDIUM)
        self._l3_idx = self._find_index(config.SOUND_AGGRESSIVE)

    def _find_index(self, path):
        for i, f in enumerate(self.sound_files):
            if os.path.abspath(f) == os.path.abspath(path):
                return i
        return 0

    def toggle(self):
        if self.visible:
            cv2.destroyWindow(SETTINGS_WIN)
            self.visible = False
        else:
            self._create_window()
            self.visible = True

    def _create_window(self):
        cv2.namedWindow(SETTINGS_WIN, cv2.WINDOW_AUTOSIZE)
        n = max(len(self.sound_files) - 1, 1)

        cv2.createTrackbar("L1 Sound", SETTINGS_WIN, self._l1_idx, n, self._on_l1)
        cv2.createTrackbar("L2 Sound", SETTINGS_WIN, self._l2_idx, n, self._on_l2)
        cv2.createTrackbar("L3 Sound", SETTINGS_WIN, self._l3_idx, n, self._on_l3)
        cv2.createTrackbar("Grace (s)", SETTINGS_WIN,
                           int(config.DISTRACTION_GRACE_PERIOD), 15, self._on_grace)
        cv2.createTrackbar("Cooldown (s)", SETTINGS_WIN,
                           int(config.ALERT_COOLDOWN), 30, self._on_cooldown)
        cv2.createTrackbar("Escalation (s)", SETTINGS_WIN,
                           int(config.ESCALATION_INTERVAL), 60, self._on_escalation)
        cv2.createTrackbar("Yaw Thresh", SETTINGS_WIN,
                           int(config.YAW_THRESHOLD), 60, self._on_yaw)
        cv2.createTrackbar("Pitch Down", SETTINGS_WIN,
                           int(config.PITCH_DOWN_DEVIATION), 40, self._on_pitch_down)
        cv2.createTrackbar("Pitch Up", SETTINGS_WIN,
                           int(config.PITCH_UP_DEVIATION), 40, self._on_pitch_up)

    # --- sound callbacks (update config + preview) ---

    def _on_l1(self, val):
        self._l1_idx = val
        config.SOUND_GENTLE = self.sound_files[val]
        self._preview(self.sound_files[val])
        config.save_settings()

    def _on_l2(self, val):
        self._l2_idx = val
        config.SOUND_MEDIUM = self.sound_files[val]
        self._preview(self.sound_files[val])
        config.save_settings()

    def _on_l3(self, val):
        self._l3_idx = val
        config.SOUND_AGGRESSIVE = self.sound_files[val]
        self._preview(self.sound_files[val])
        config.save_settings()

    # --- timing callbacks ---

    def _on_grace(self, val):
        config.DISTRACTION_GRACE_PERIOD = max(val, 1)
        config.save_settings()

    def _on_cooldown(self, val):
        config.ALERT_COOLDOWN = max(val, 1)
        config.save_settings()

    def _on_escalation(self, val):
        config.ESCALATION_INTERVAL = max(val, 5)
        config.save_settings()

    def _on_yaw(self, val):
        config.YAW_THRESHOLD = max(val, 5)
        config.save_settings()

    def _on_pitch_down(self, val):
        config.PITCH_DOWN_DEVIATION = max(val, 5)
        config.save_settings()

    def _on_pitch_up(self, val):
        config.PITCH_UP_DEVIATION = max(val, 5)
        config.save_settings()

    # --- sound preview ---

    def _preview(self, path):
        # Kill any currently playing preview
        if self._preview_proc and self._preview_proc.poll() is None:
            self._preview_proc.terminate()
        self._preview_proc = subprocess.Popen(
            ["afplay", path],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )

    def draw_info(self, frame):
        """Draw current settings summary on the settings window canvas."""
        if not self.visible:
            return
        h = 260
        w = 420
        canvas = 30 * np.ones((h, w, 3), dtype=np.uint8)

        y = 25
        cv2.putText(canvas, "SETTINGS  (press 's' to close)", (10, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 180, 0), 1)
        y += 30

        lines = [
            f"L1: {sound_label(config.SOUND_GENTLE)}",
            f"L2: {sound_label(config.SOUND_MEDIUM)}",
            f"L3: {sound_label(config.SOUND_AGGRESSIVE)}",
            "",
            f"Grace: {config.DISTRACTION_GRACE_PERIOD:.0f}s  "
            f"Cooldown: {config.ALERT_COOLDOWN:.0f}s  "
            f"Escalate: {config.ESCALATION_INTERVAL:.0f}s",
            "",
            f"Yaw: {config.YAW_THRESHOLD:.0f} deg   "
            f"Pitch down: {config.PITCH_DOWN_DEVIATION:.0f} deg   "
            f"Pitch up: {config.PITCH_UP_DEVIATION:.0f} deg",
            "",
            "Keys: 1/2/3 = preview L1/L2/L3   r = recalibrate",
        ]
        for line in lines:
            cv2.putText(canvas, line, (10, y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (220, 220, 220), 1)
            y += 22

        cv2.imshow(SETTINGS_WIN, canvas)


# ---------------------------------------------------------------------------
# Debug overlay
# ---------------------------------------------------------------------------

def draw_debug(frame, result, alerter, detector, settings_hint=True):
    h, w = frame.shape[:2]
    color = STATE_COLORS.get(result.state, (255, 255, 255))

    # Draw border indicator
    cv2.rectangle(frame, (0, 0), (w - 1, h - 1), color, 4)

    # Status text
    cv2.putText(frame, f"State: {result.state}", (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
    cv2.putText(frame, f"Yaw: {result.yaw:+.1f}  Pitch: {result.pitch:+.1f}  Roll: {result.roll:+.1f}",
                (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

    # Show baseline info if calibrated
    if detector.is_calibrated:
        cv2.putText(frame, f"Baseline  Y:{detector.baseline_yaw:+.1f}  P:{detector.baseline_pitch:+.1f}",
                    (10, h - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (180, 180, 180), 1)

    alert_label = ALERT_LABELS.get(alerter.state, "")
    if alert_label:
        cv2.putText(frame, alert_label, (10, 90),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

    # Draw key landmarks
    if result.landmarks:
        for idx in LANDMARK_INDICES:
            lm = result.landmarks[idx]
            cx, cy = int(lm.x * w), int(lm.y * h)
            cv2.circle(frame, (cx, cy), 4, (0, 255, 255), -1)

    # Hint
    if settings_hint:
        cv2.putText(frame, "s=settings  r=recalibrate  q=quit", (10, h - 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.35, (140, 140, 140), 1)

    return frame


# ---------------------------------------------------------------------------
# Calibration
# ---------------------------------------------------------------------------

def draw_calibration_overlay(frame, remaining):
    h, w = frame.shape[:2]
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, h), (0, 0, 0), -1)
    frame = cv2.addWeighted(overlay, 0.4, frame, 0.6, 0)

    cv2.putText(frame, "CALIBRATING", (w // 2 - 130, h // 2 - 30),
                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 180, 0), 3)
    cv2.putText(frame, "Look at your screen normally", (w // 2 - 170, h // 2 + 15),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    cv2.putText(frame, f"{remaining:.1f}s", (w // 2 - 30, h // 2 + 55),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 180, 0), 2)
    return frame


def run_calibration(cap, detector):
    """Collect baseline head pose samples for CALIBRATION_DURATION seconds."""
    print("Look at your screen normally. Calibrating...")
    samples = []
    start = time.time()

    while True:
        elapsed = time.time() - start
        remaining = config.CALIBRATION_DURATION - elapsed
        if remaining <= 0:
            break

        ret, frame = cap.read()
        if not ret:
            continue

        frame = cv2.flip(frame, 1)
        result = detector.process_frame(frame)

        if result.face_detected:
            samples.append((result.yaw, result.pitch, result.roll))

        if config.DEBUG_WINDOW:
            frame = draw_calibration_overlay(frame, remaining)
            cv2.imshow("Focus Monitor", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                return False

    if not samples:
        print("Warning: No face detected during calibration. Using absolute thresholds.")
        detector.baseline_yaw = 0.0
        detector.baseline_pitch = 0.0
        detector.baseline_roll = 0.0
    else:
        detector.calibrate(samples)
        print(f"Calibrated! Baseline — Yaw: {detector.baseline_yaw:+.1f}, "
              f"Pitch: {detector.baseline_pitch:+.1f}, Roll: {detector.baseline_roll:+.1f} "
              f"({len(samples)} samples)")

    return True


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(description="ADHD Focus Monitor")
    parser.add_argument("--no-debug", action="store_true",
                        help="Hide the camera debug window")
    parser.add_argument("--skip-calibration", action="store_true",
                        help="Skip calibration and use absolute thresholds")
    parser.add_argument("--threshold-yaw", type=float, default=None,
                        help=f"Yaw deviation threshold in degrees (default: {config.YAW_THRESHOLD})")
    parser.add_argument("--threshold-pitch-down", type=float, default=None,
                        help=f"Pitch down deviation threshold (default: {config.PITCH_DOWN_DEVIATION})")
    parser.add_argument("--threshold-pitch-up", type=float, default=None,
                        help=f"Pitch up deviation threshold (default: {config.PITCH_UP_DEVIATION})")
    parser.add_argument("--grace-period", type=float, default=None,
                        help=f"Grace period in seconds (default: {config.DISTRACTION_GRACE_PERIOD})")
    parser.add_argument("--cooldown", type=float, default=None,
                        help=f"Alert cooldown in seconds (default: {config.ALERT_COOLDOWN})")
    return parser.parse_args()


def apply_overrides(args):
    if args.threshold_yaw is not None:
        config.YAW_THRESHOLD = args.threshold_yaw
    if args.threshold_pitch_down is not None:
        config.PITCH_DOWN_DEVIATION = args.threshold_pitch_down
    if args.threshold_pitch_up is not None:
        config.PITCH_UP_DEVIATION = args.threshold_pitch_up
    if args.grace_period is not None:
        config.DISTRACTION_GRACE_PERIOD = args.grace_period
    if args.cooldown is not None:
        config.ALERT_COOLDOWN = args.cooldown
    if args.no_debug:
        config.DEBUG_WINDOW = False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

import numpy as np  # noqa: E402 (needed for settings canvas)


def main():
    args = parse_args()
    apply_overrides(args)

    cap = cv2.VideoCapture(config.CAMERA_INDEX)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, config.FRAME_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, config.FRAME_HEIGHT)

    if not cap.isOpened():
        print("Error: Cannot open camera. Check permissions in System Settings > Privacy > Camera.")
        return

    detector = FocusDetector()
    alerter = Alerter()

    # Discover available sounds
    sound_files = discover_sounds()
    if not sound_files:
        print("Warning: No sound files found in sounds/ directory.")

    settings = SettingsPanel(sound_files) if sound_files else None

    # Calibration phase
    if not args.skip_calibration:
        if not run_calibration(cap, detector):
            cap.release()
            cv2.destroyAllWindows()
            return
    else:
        detector.baseline_yaw = 0.0
        detector.baseline_pitch = 0.0
        detector.baseline_roll = 0.0
        print("Skipped calibration. Using absolute thresholds.")

    print("Focus monitor running. Press 'q' to quit, 's' for settings, 'r' to recalibrate.")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                continue

            frame = cv2.flip(frame, 1)

            result = detector.process_frame(frame)
            alerter.update(result.state, time.time())

            if config.DEBUG_WINDOW:
                annotated = draw_debug(frame, result, alerter, detector)
                cv2.imshow("Focus Monitor", annotated)

            # Update settings info canvas if visible
            if settings and settings.visible:
                settings.draw_info(frame)

            key = cv2.waitKey(1) & 0xFF

            if key == ord("q"):
                break
            elif key == ord("s") and settings:
                settings.toggle()
            elif key == ord("r"):
                # Recalibrate
                detector.smoothed_yaw = 0.0
                detector.smoothed_pitch = 0.0
                detector.smoothed_roll = 0.0
                run_calibration(cap, detector)
                print("Recalibrated. Resuming monitoring.")
            elif key == ord("1") and settings:
                settings._preview(config.SOUND_GENTLE)
            elif key == ord("2") and settings:
                settings._preview(config.SOUND_MEDIUM)
            elif key == ord("3") and settings:
                settings._preview(config.SOUND_AGGRESSIVE)

    except KeyboardInterrupt:
        print("\nStopping...")
    finally:
        detector.close()
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
