# ADHD Saver

A desktop focus monitor that uses your webcam to detect when you look away from the screen — then plays escalating sound alerts to bring you back. Built with Python, OpenCV, and MediaPipe.

## How It Works

1. **Calibrates** your "focused" head position on startup (3 seconds)
2. **Tracks** head pose (yaw & pitch) in real-time via your webcam using MediaPipe face mesh
3. **Waits** through a grace period before the first alert (default 3s)
4. **Escalates** through 3 alert levels with increasingly aggressive sounds
5. **Resets** instantly when you look back at your screen

## Requirements

- Python 3.8+
- macOS (uses `afplay` for sound playback)
- A webcam

## Quick Start

```bash
git clone https://github.com/bro-xuan/adhd-cure.git
cd adhd-cure
pip install -r requirements.txt
python main.py
```

## Dependencies

```
opencv-python >= 4.8
mediapipe >= 0.10.9
numpy >= 1.24
```

## Usage

```
python main.py [options]
```

### CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `--no-debug` | Hide the camera debug window | Off |
| `--skip-calibration` | Skip calibration, use absolute thresholds | Off |
| `--threshold-yaw` | Yaw deviation threshold (degrees) | 30 |
| `--threshold-pitch-down` | Pitch down deviation threshold (degrees) | 15 |
| `--threshold-pitch-up` | Pitch up deviation threshold (degrees) | 20 |
| `--grace-period` | Grace period before first alert (seconds) | 3 |
| `--cooldown` | Alert cooldown (seconds) | 10 |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `q` | Quit |
| `s` | Toggle settings panel |
| `r` | Recalibrate head position |
| `1` | Preview L1 (gentle) sound |
| `2` | Preview L2 (medium) sound |
| `3` | Preview L3 (aggressive) sound |

## Alert Levels

| Level | Default Sound | Triggers After |
|-------|--------------|----------------|
| L1 — Gentle | `mgs-alert.mp3` | Grace period (3s) |
| L2 — Medium | `jontron-excuse-me-what.mp3` | Escalation interval (15s) |
| L3 — Aggressive | `get-back-to-work.mp3` | 2x escalation interval (30s) |

## Sound Pack

15 built-in alert sounds:

- `bruh`
- `cartoon-bonk`
- `fail-buzzer`
- `get-back-to-work`
- `gordon-ramsay`
- `gta-wasted`
- `jontron-excuse-me-what`
- `mgs-alert`
- `navi-hey-listen`
- `pay-attention`
- `sad-trombone`
- `shrek-what-are-you-doing`
- `vine-boom`
- `what-are-you-doing`
- `wrong-buzzer`

Sounds can be swapped via the settings panel or by dropping `.mp3`/`.wav`/`.aiff`/`.ogg` files into the `sounds/` directory.

## Settings

All settings can be adjusted live via the OpenCV trackbar panel (press `s`) or CLI flags. Changes are persisted to `settings.json`.

| Setting | Default | Description |
|---------|---------|-------------|
| Yaw threshold | 30° | How far you can turn left/right before triggering |
| Pitch down | 15° | How far you can look down |
| Pitch up | 20° | How far you can look up |
| Grace period | 3s | Delay before first alert fires |
| Cooldown | 10s | Minimum time between repeated alerts |
| Escalation interval | 15s | Time before bumping to next alert level |

## Project Structure

```
adhd-cure/
├── main.py           # Entry point, debug overlay, calibration, CLI
├── config.py         # All settings, defaults, persistence
├── detector.py       # MediaPipe face mesh, head pose estimation
├── alerter.py        # 3-level alert state machine
├── requirements.txt
├── settings.json     # Auto-saved user preferences
└── sounds/           # Alert sound files
```
