"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Timer, Play, Pause, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TIMER_MODES, subscribeTimer, startTimer, pauseTimer, resetTimer, switchTimerMode, setCustomDuration,
  type TimerState,
} from "@/lib/timer-store";

const RING_COLORS = ["#a855f7", "#22c55e", "#3b82f6"];

interface PomodoroTimerProps {
  variant?: "floating" | "header";
}

function TimerPanel({ state, onClose }: { state: TimerState; onClose: () => void }) {
  const { modeIdx, seconds, totalSeconds, running } = state;
  const isCustom = modeIdx === 3;
  const mode = isCustom ? { label: "Custom" } : TIMER_MODES[modeIdx];
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  const progress = totalSeconds > 0 ? 1 - seconds / totalSeconds : 0;
  const circumference = 2 * Math.PI * 44;
  const ringColor = isCustom ? "#f59e0b" : RING_COLORS[modeIdx];

  const [customMins, setCustomMins] = useState(isCustom ? String(Math.floor(totalSeconds / 60)) : "");
  const [customSecs, setCustomSecs] = useState(isCustom ? String(totalSeconds % 60).padStart(2, "0") : "00");

  function applyCustom() {
    const m = Math.max(0, parseInt(customMins) || 0);
    const s = Math.max(0, Math.min(59, parseInt(customSecs) || 0));
    const total = m * 60 + s;
    if (total > 0) setCustomDuration(total);
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl p-5 w-60 bounce-in">
      <div className="flex items-center justify-between mb-4">
        <span className="text-white font-bold text-sm">Pomodoro</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 p-1">
          <X size={14} />
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 mb-4 bg-gray-800 rounded-xl p-1">
        {TIMER_MODES.map((m, i) => (
          <button key={m.label} onClick={() => switchTimerMode(i)}
            className={cn("flex-1 text-xs py-1 rounded-lg font-semibold transition-all",
              modeIdx === i ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300")}>
            {i === 0 ? "Focus" : i === 1 ? "Short" : "Long"}
          </button>
        ))}
        <button onClick={() => { setCustomDuration(isCustom ? totalSeconds : 10 * 60); setCustomMins(isCustom ? String(Math.floor(totalSeconds / 60)) : "10"); setCustomSecs("00"); }}
          className={cn("flex-1 text-xs py-1 rounded-lg font-semibold transition-all",
            isCustom ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300")}>
          ✏️
        </button>
      </div>

      {/* Custom input */}
      {isCustom && (
        <div className="flex items-center gap-1.5 mb-4 bounce-in">
          <input
            type="number" min={0} max={999}
            value={customMins}
            onChange={(e) => setCustomMins(e.target.value)}
            onBlur={applyCustom}
            onKeyDown={(e) => e.key === "Enter" && applyCustom()}
            placeholder="mm"
            className="w-full bg-gray-800 border border-gray-700 focus:border-amber-500/60 rounded-xl px-3 py-2 text-center text-white text-sm font-bold focus:outline-none tabular-nums"
          />
          <span className="text-gray-500 font-bold text-sm flex-shrink-0">:</span>
          <input
            type="number" min={0} max={59}
            value={customSecs}
            onChange={(e) => setCustomSecs(e.target.value)}
            onBlur={applyCustom}
            onKeyDown={(e) => e.key === "Enter" && applyCustom()}
            placeholder="ss"
            className="w-full bg-gray-800 border border-gray-700 focus:border-amber-500/60 rounded-xl px-3 py-2 text-center text-white text-sm font-bold focus:outline-none tabular-nums"
          />
          <span className="text-[10px] text-gray-500 flex-shrink-0">min&nbsp;sec</span>
        </div>
      )}

      {/* Circular progress */}
      <div className="flex items-center justify-center mb-5">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#1f2937" strokeWidth="8" />
            <circle cx="50" cy="50" r="44" fill="none"
              stroke={ringColor} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums text-white">{mins}:{secs}</span>
            <span className="text-gray-500 text-[10px] mt-0.5">{mode.label}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={resetTimer} className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all">
          <RotateCcw size={14} />
        </button>
        <button
          onClick={() => running ? pauseTimer() : startTimer()}
          className={cn("flex items-center gap-2 px-5 py-2 rounded-xl text-white font-semibold text-sm transition-all",
            running ? "bg-gray-700 hover:bg-gray-600" : "bg-purple-600 hover:bg-purple-500 hover:shadow-lg hover:shadow-purple-900/40")}
        >
          {running ? <Pause size={14} /> : <Play size={14} />}
          {running ? "Pause" : "Start"}
        </button>
      </div>
    </div>
  );
}

export default function PomodoroTimer({ variant = "floating" }: PomodoroTimerProps) {
  const pathname = usePathname();
  const initialSeconds = TIMER_MODES[0].minutes * 60;
  const [state, setState] = useState<TimerState>({
    modeIdx: 0,
    seconds: initialSeconds,
    totalSeconds: initialSeconds,
    running: false,
  });
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeTimer(setState), []);

  if (pathname.startsWith("/auth")) return null;
  // Hide the global floating widget on the notebook main page — the header variant is used there
  if (variant === "floating" && /\/notebooks\/[^/]+$/.test(pathname)) return null;

  const { seconds, running } = state;
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  function requestNotificationPermission() {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  const triggerBtn = (
    <button
      onClick={() => { setOpen((v) => !v); requestNotificationPermission(); }}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all",
        running
          ? "bg-purple-600 border-purple-500 text-white hover:bg-purple-500"
          : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700",
        variant === "floating" && "shadow-lg py-2 rounded-2xl"
      )}
    >
      <Timer size={13} />
      {running ? `${mins}:${secs}` : "Timer"}
    </button>
  );

  if (variant === "header") {
    return (
      <div className="relative">
        {triggerBtn}
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-2 z-50">
              <TimerPanel state={state} onClose={() => setOpen(false)} />
            </div>
          </>
        )}
      </div>
    );
  }

  // floating variant
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="relative z-50 mb-2">
            <TimerPanel state={state} onClose={() => setOpen(false)} />
          </div>
        </>
      )}
      {triggerBtn}
    </div>
  );
}
