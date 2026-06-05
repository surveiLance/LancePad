"use client";

import { useState, useEffect, useRef } from "react";
import { Timer, Play, Pause, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MODES = [
  { label: "Focus", minutes: 25, color: "text-purple-400", ring: "border-purple-500" },
  { label: "Short Break", minutes: 5, color: "text-green-400", ring: "border-green-500" },
  { label: "Long Break", minutes: 15, color: "text-blue-400", ring: "border-blue-500" },
];

export default function PomodoroTimer() {
  const [open, setOpen] = useState(false);
  const [modeIdx, setModeIdx] = useState(0);
  const [seconds, setSeconds] = useState(MODES[0].minutes * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mode = MODES[modeIdx];

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            // Browser notification if permitted
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              new Notification("LancePad", { body: `${mode.label} session done! 🎉` });
            }
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, mode.label]);

  function switchMode(idx: number) {
    setRunning(false);
    setModeIdx(idx);
    setSeconds(MODES[idx].minutes * 60);
  }

  function reset() {
    setRunning(false);
    setSeconds(mode.minutes * 60);
  }

  function requestNotificationPermission() {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  const progress = 1 - seconds / (mode.minutes * 60);

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => { setOpen((v) => !v); requestNotificationPermission(); }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white text-xs font-semibold transition-all"
        title="Pomodoro Timer"
      >
        <Timer size={13} />
        {running ? `${mins}:${secs}` : "Timer"}
      </button>

      {/* Timer panel — drops down from button */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl p-5 w-60 bounce-in">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white font-bold text-sm">Pomodoro</span>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-300 p-1">
              <X size={14} />
            </button>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 mb-5 bg-gray-800 rounded-xl p-1">
            {MODES.map((m, i) => (
              <button
                key={m.label}
                onClick={() => switchMode(i)}
                className={cn(
                  "flex-1 text-xs py-1 rounded-lg font-semibold transition-all",
                  modeIdx === i ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
                )}
              >
                {i === 0 ? "Focus" : i === 1 ? "Short" : "Long"}
              </button>
            ))}
          </div>

          {/* Circular timer */}
          <div className="flex items-center justify-center mb-5">
            <div className="relative w-28 h-28">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#1f2937" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="44" fill="none"
                  stroke={modeIdx === 0 ? "#a855f7" : modeIdx === 1 ? "#22c55e" : "#3b82f6"}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn("text-2xl font-bold tabular-nums", mode.color)}>{mins}:{secs}</span>
                <span className="text-gray-500 text-[10px] mt-0.5">{mode.label}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={reset}
              className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={() => setRunning((r) => !r)}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-xl text-white font-semibold text-sm transition-all",
                running ? "bg-gray-700 hover:bg-gray-600" : "bg-purple-600 hover:bg-purple-500 hover:shadow-lg hover:shadow-purple-900/40"
              )}
            >
              {running ? <Pause size={14} /> : <Play size={14} />}
              {running ? "Pause" : "Start"}
            </button>
          </div>
          </div>
        </>
      )}
    </div>
  );
}
