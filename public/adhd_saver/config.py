import json
import os

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_SOUNDS_DIR = os.path.join(_BASE_DIR, "sounds")
_SETTINGS_FILE = os.path.join(_BASE_DIR, "settings.json")

# --- Defaults ---

# Camera settings
CAMERA_INDEX = 0
FRAME_WIDTH = 640
FRAME_HEIGHT = 480

# Head pose thresholds (degrees of DEVIATION from calibrated baseline)
YAW_THRESHOLD = 30.0
PITCH_DOWN_DEVIATION = 15.0
PITCH_UP_DEVIATION = 20.0

# Calibration
CALIBRATION_DURATION = 3.0

# Timing (seconds)
DISTRACTION_GRACE_PERIOD = 3.0
ALERT_COOLDOWN = 10.0
ESCALATION_INTERVAL = 15.0

# MediaPipe confidence
FACE_DETECTION_CONFIDENCE = 0.5
FACE_TRACKING_CONFIDENCE = 0.5

# Alert sounds
SOUND_GENTLE = os.path.join(_SOUNDS_DIR, "mgs-alert.mp3")
SOUND_MEDIUM = os.path.join(_SOUNDS_DIR, "jontron-excuse-me-what.mp3")
SOUND_AGGRESSIVE = os.path.join(_SOUNDS_DIR, "get-back-to-work.mp3")

# Debug
DEBUG_WINDOW = True
LOG_TO_CONSOLE = True

# --- Keys that are persisted to settings.json ---
_SAVEABLE = [
    "YAW_THRESHOLD", "PITCH_DOWN_DEVIATION", "PITCH_UP_DEVIATION",
    "DISTRACTION_GRACE_PERIOD", "ALERT_COOLDOWN", "ESCALATION_INTERVAL",
    "SOUND_GENTLE", "SOUND_MEDIUM", "SOUND_AGGRESSIVE",
]


def save_settings():
    """Save current user-adjustable settings to settings.json."""
    import config
    data = {k: getattr(config, k) for k in _SAVEABLE}
    with open(_SETTINGS_FILE, "w") as f:
        json.dump(data, f, indent=2)


def load_settings():
    """Load settings from settings.json if it exists, overriding defaults."""
    import config
    if not os.path.exists(_SETTINGS_FILE):
        return
    try:
        with open(_SETTINGS_FILE) as f:
            data = json.load(f)
        for k, v in data.items():
            if k in _SAVEABLE:
                # Validate sound paths still exist
                if k.startswith("SOUND_") and not os.path.exists(v):
                    continue
                setattr(config, k, v)
        if LOG_TO_CONSOLE:
            print(f"[config] Loaded settings from {_SETTINGS_FILE}")
    except (json.JSONDecodeError, OSError) as e:
        print(f"[config] Warning: could not load settings: {e}")


# Auto-load on import
load_settings()
