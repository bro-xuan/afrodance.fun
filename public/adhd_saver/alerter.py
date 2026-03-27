import subprocess
from enum import Enum

import config


class AlertState(Enum):
    IDLE = "idle"
    GRACE_PERIOD = "grace_period"
    ALERTING_L1 = "alerting_l1"
    ALERTING_L2 = "alerting_l2"
    ALERTING_L3 = "alerting_l3"


def _get_level_sound(level):
    """Read sound path from config at call time so live changes take effect."""
    return {
        AlertState.ALERTING_L1: config.SOUND_GENTLE,
        AlertState.ALERTING_L2: config.SOUND_MEDIUM,
        AlertState.ALERTING_L3: config.SOUND_AGGRESSIVE,
    }[level]


class Alerter:
    def __init__(self):
        self.state = AlertState.IDLE
        self.distraction_start = None
        self.last_alert_time = None

    def update(self, detection_state: str, current_time: float):
        # Absent or focused → instant reset
        if detection_state in ("absent", "focused"):
            self._reset()
            return

        # Still distracted — advance the state machine
        if self.state == AlertState.IDLE:
            self.state = AlertState.GRACE_PERIOD
            self.distraction_start = current_time
            if config.LOG_TO_CONSOLE:
                print("[alerter] Distraction detected — grace period started")
            return

        if self.state == AlertState.GRACE_PERIOD:
            elapsed = current_time - self.distraction_start
            if elapsed >= config.DISTRACTION_GRACE_PERIOD:
                self._fire_alert(AlertState.ALERTING_L1, current_time)
            return

        # Currently alerting — check cooldown and escalation
        if current_time - self.last_alert_time >= config.ALERT_COOLDOWN:
            total_distracted = current_time - self.distraction_start
            if total_distracted >= 2 * config.ESCALATION_INTERVAL and self.state != AlertState.ALERTING_L3:
                self._fire_alert(AlertState.ALERTING_L3, current_time)
            elif total_distracted >= config.ESCALATION_INTERVAL and self.state == AlertState.ALERTING_L1:
                self._fire_alert(AlertState.ALERTING_L2, current_time)
            else:
                # Repeat current level
                self._play_sound(_get_level_sound(self.state))
                self.last_alert_time = current_time

    def _fire_alert(self, level: AlertState, current_time: float):
        self.state = level
        self.last_alert_time = current_time
        self._play_sound(_get_level_sound(level))
        if config.LOG_TO_CONSOLE:
            print(f"[alerter] Alert escalated to {level.value}")

    def _reset(self):
        if self.state != AlertState.IDLE and config.LOG_TO_CONSOLE:
            print("[alerter] Reset to IDLE")
        self.state = AlertState.IDLE
        self.distraction_start = None
        self.last_alert_time = None

    @staticmethod
    def _play_sound(sound_path: str):
        subprocess.Popen(
            ["afplay", sound_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
