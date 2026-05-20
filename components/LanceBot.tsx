"use client";

import { cn } from "@/lib/utils";

type Mood = "idle" | "happy" | "thinking" | "celebrate" | "sad";

interface LanceBotProps {
  mood?: Mood;
  size?: number;
  className?: string;
  animate?: boolean;
}

const EYES: Record<Mood, string> = {
  idle: "M18 22 Q20 20 22 22 M30 22 Q32 20 34 22",
  happy: "M18 22 Q20 18 22 22 M30 22 Q32 18 34 22",
  thinking: "M18 22 Q20 20 22 22 M30 22 Q32 20 34 22",
  celebrate: "M17 21 Q20 17 23 21 M29 21 Q32 17 35 21",
  sad: "M18 24 Q20 22 22 24 M30 24 Q32 22 34 24",
};

const MOUTHS: Record<Mood, string> = {
  idle: "M22 30 Q26 33 30 30",
  happy: "M20 29 Q26 35 32 29",
  thinking: "M22 31 Q26 30 30 31",
  celebrate: "M19 29 Q26 36 33 29",
  sad: "M22 34 Q26 30 30 34",
};

const CHEEKS: Record<Mood, boolean> = {
  idle: false,
  happy: true,
  thinking: false,
  celebrate: true,
  sad: false,
};

export default function LanceBot({ mood = "idle", size = 52, className, animate = true }: LanceBotProps) {
  const id = `lb-${size}`;
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        animate && "lancebot-float",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
        <defs>
          <radialGradient id={`${id}-bodyGrad`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#6D28D9" />
          </radialGradient>
          <filter id={`${id}-glow`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Body — subtle breathe */}
        <g className="lancebot-breathe">
          <ellipse cx="26" cy="30" rx="17" ry="18" fill={`url(#${id}-bodyGrad)`} />
        </g>

        {/* Ears */}
        <ellipse cx="10" cy="24" rx="4" ry="6" fill="#8B5CF6" />
        <ellipse cx="42" cy="24" rx="4" ry="6" fill="#8B5CF6" />
        <ellipse cx="10" cy="24" rx="2" ry="3.5" fill="#C4B5FD" />
        <ellipse cx="42" cy="24" rx="2" ry="3.5" fill="#C4B5FD" />

        {/* Eyes — blink when idle */}
        <g className={mood === "idle" ? "lancebot-blink" : ""} style={{ transformOrigin: "26px 22px" }}>
          <path
            d={EYES[mood]}
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            filter={`url(#${id}-glow)`}
          />
        </g>

        {/* Cheeks */}
        {CHEEKS[mood] && (
          <>
            <ellipse cx="17" cy="28" rx="4" ry="2.5" fill="#EC4899" opacity="0.4" />
            <ellipse cx="35" cy="28" rx="4" ry="2.5" fill="#EC4899" opacity="0.4" />
          </>
        )}

        {/* Mouth */}
        <path
          d={MOUTHS[mood]}
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Antenna */}
        <line x1="26" y1="12" x2="26" y2="6" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
        <circle cx="26" cy="5" r="3" fill="#A78BFA" filter={`url(#${id}-glow)`} className="lancebot-antenna" />
        <circle cx="26" cy="5" r="1.5" fill="white" opacity="0.8" />

        {/* Stars for celebrate */}
        {mood === "celebrate" && (
          <>
            <circle cx="8" cy="10" r="1.5" fill="#FCD34D" opacity="0.9" />
            <circle cx="44" cy="12" r="1" fill="#FCD34D" opacity="0.9" />
            <circle cx="5" cy="20" r="1" fill="#F9A8D4" opacity="0.9" />
            <circle cx="47" cy="18" r="1.5" fill="#F9A8D4" opacity="0.9" />
          </>
        )}

        {/* Thinking dots */}
        {mood === "thinking" && (
          <>
            <circle cx="36" cy="10" r="1.5" fill="#C4B5FD" opacity="0.9" />
            <circle cx="40" cy="7" r="2" fill="#C4B5FD" opacity="0.7" />
            <circle cx="45" cy="5" r="2.5" fill="#C4B5FD" opacity="0.5" />
          </>
        )}
      </svg>
    </div>
  );
}
