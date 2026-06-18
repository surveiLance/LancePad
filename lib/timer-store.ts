export const TIMER_MODES = [
  { label: "Focus",       minutes: 25 },
  { label: "Short Break", minutes: 5  },
  { label: "Long Break",  minutes: 15 },
];

export type TimerState = {
  modeIdx: number;   // 0-2 = presets, 3 = custom
  seconds: number;   // current countdown
  totalSeconds: number; // full duration (for reset + progress ring)
  running: boolean;
};

type Listener = (state: TimerState) => void;

let _state: TimerState = {
  modeIdx: 0,
  seconds: TIMER_MODES[0].minutes * 60,
  totalSeconds: TIMER_MODES[0].minutes * 60,
  running: false,
};

let _interval: ReturnType<typeof setInterval> | null = null;
const _listeners = new Set<Listener>();

function notify() {
  const snap = { ..._state };
  _listeners.forEach((l) => l(snap));
}

function getLabel() {
  return _state.modeIdx < TIMER_MODES.length ? TIMER_MODES[_state.modeIdx].label : "Custom";
}

function tick() {
  if (_state.seconds <= 1) {
    if (_interval) { clearInterval(_interval); _interval = null; }
    _state = { ..._state, seconds: 0, running: false };
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification("LancePad", { body: `${getLabel()} session done! 🎉` });
    }
  } else {
    _state = { ..._state, seconds: _state.seconds - 1 };
  }
  notify();
}

export function startTimer() {
  if (_interval || _state.running) return;
  _state = { ..._state, running: true };
  _interval = setInterval(tick, 1000);
  notify();
}

export function pauseTimer() {
  if (_interval) { clearInterval(_interval); _interval = null; }
  _state = { ..._state, running: false };
  notify();
}

export function resetTimer() {
  if (_interval) { clearInterval(_interval); _interval = null; }
  _state = { ..._state, seconds: _state.totalSeconds, running: false };
  notify();
}

export function switchTimerMode(idx: number) {
  if (_interval) { clearInterval(_interval); _interval = null; }
  const secs = TIMER_MODES[idx].minutes * 60;
  _state = { modeIdx: idx, seconds: secs, totalSeconds: secs, running: false };
  notify();
}

export function setCustomDuration(totalSeconds: number) {
  if (_interval) { clearInterval(_interval); _interval = null; }
  _state = { modeIdx: 3, seconds: totalSeconds, totalSeconds, running: false };
  notify();
}

export function subscribeTimer(listener: Listener) {
  _listeners.add(listener);
  listener({ ..._state });
  return () => {
    _listeners.delete(listener);
  };
}
