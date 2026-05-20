"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

type Mood = "idle" | "happy" | "thinking" | "celebrate" | "sad" | "muted";

interface LanceBotProps {
  mood?: Mood;
  size?: number;
  className?: string;
  animate?: boolean;
  headsetFloat?: boolean;
  headsetPulse?: boolean;
}

const EYES: Record<Mood, string> = {
  idle:      "M18 24 Q20 22 22 24 M30 24 Q32 22 34 24",
  happy:     "M18 24 Q20 20 22 24 M30 24 Q32 20 34 24",
  thinking:  "M18 24 Q20 22 22 24 M30 24 Q32 22 34 24",
  celebrate: "M17 23 Q20 19 23 23 M29 23 Q32 19 35 23",
  sad:       "M18 26 Q20 24 22 26 M30 26 Q32 24 34 26",
  muted:     "M18 25 L22 25 M30 25 L34 25",
};

const MOUTHS: Record<Mood, string> = {
  idle:      "M22 32 Q26 35 30 32",
  happy:     "M20 31 Q26 37 32 31",
  thinking:  "M22 33 Q26 32 30 33",
  celebrate: "M19 31 Q26 38 33 31",
  sad:       "M22 36 Q26 32 30 36",
  muted:     "M21 33 L23 31 L25 33 L27 31 L29 33 L31 31",
};

const CHEEKS: Record<Mood, boolean> = {
  idle: false, happy: true, thinking: false, celebrate: true, sad: false, muted: false,
};

export default function LanceBot({ mood = "idle", size = 52, className, animate = true, headsetFloat = false, headsetPulse = false }: LanceBotProps) {
  const id = `lb-${size}`;
  const outerRef = useRef<SVGGElement>(null);
  const innerRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!headsetFloat) return;
    let frame: number;
    const start = performance.now();
    function tick() {
      const angle = ((performance.now() - start) / 3000) * 2 * Math.PI;
      const deg = (angle * 180 / Math.PI) % 360;
      const R = 26;
      const dx = R * Math.sin(angle);
      const dy = 14 - R * Math.cos(angle);
      outerRef.current?.setAttribute("transform",
        `translate(${dx.toFixed(2)}, ${dy.toFixed(2)}) rotate(${deg.toFixed(2)}, 26, 19)`
      );
      innerRef.current?.removeAttribute("transform");
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [headsetFloat]);

  useEffect(() => {
    if (!headsetPulse) return;
    let frame: number;
    let timer: ReturnType<typeof setTimeout>;

    function runOrbit() {
      const start = performance.now();
      const duration = 2800;
      function tick() {
        const elapsed = performance.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease in-out so it accelerates off and decelerates back
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        const angle = eased * 2 * Math.PI;
        const R = 26;
        // formula: starts at (0,0) when angle=0, returns to (0,0) when angle=2π
        const dx = R * Math.sin(angle);
        const dy = R * (1 - Math.cos(angle));
        const deg = eased * 360;
        outerRef.current?.setAttribute("transform",
          `translate(${dx.toFixed(2)}, ${dy.toFixed(2)}) rotate(${deg.toFixed(2)}, 26, 19)`
        );
        if (progress < 1) {
          frame = requestAnimationFrame(tick);
        } else {
          outerRef.current?.removeAttribute("transform");
          timer = setTimeout(runOrbit, 5000);
        }
      }
      frame = requestAnimationFrame(tick);
    }

    timer = setTimeout(runOrbit, 5000);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
  }, [headsetPulse]);
  return (
    <div
      className={cn("relative inline-flex items-center justify-center", animate && "lancebot-float", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 52 54" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size} overflow="visible">
        <defs>
          <radialGradient id={`${id}-bodyGrad`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#6D28D9" />
          </radialGradient>
          <radialGradient id={`${id}-cupOuter`} cx="30%" cy="25%" r="75%">
            <stop offset="0%" stopColor="#E0D3C0" />
            <stop offset="100%" stopColor="#BCA898" />
          </radialGradient>
          <filter id={`${id}-glow`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ── Headset (optionally orbiting) ── */}
        <g ref={outerRef}>
        <g ref={innerRef}>
          {/* Shadow layer */}
          <path d="M 10 24 Q 26 3 42 24" stroke="#8A7A66" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.25" transform="translate(0,2)" />
          {/* Main band */}
          <path d="M 10 24 Q 26 3 42 24" stroke="#C8B89C" strokeWidth="5" fill="none" strokeLinecap="round" />
          {/* Top highlight */}
          <path d="M 11 24 Q 26 5 41 24" stroke="#EDE0CC" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.65" />
          {/* Padding bump at crown */}
          <ellipse cx="26" cy="4.5" rx="5" ry="2.5" fill="#D4C6AF" />
          <ellipse cx="26" cy="4" rx="3.5" ry="1.5" fill="#EDE0CC" opacity="0.6" />

          {/* Left arm */}
          <rect x="6.5" y="20" width="4" height="9" rx="1.5" fill="#C4B49C" />
          <rect x="7.5" y="20" width="2" height="9" rx="1" fill="#D8CAAE" opacity="0.5" />
          {/* Right arm */}
          <rect x="41.5" y="20" width="4" height="9" rx="1.5" fill="#C4B49C" />
          <rect x="42.5" y="20" width="2" height="9" rx="1" fill="#D8CAAE" opacity="0.5" />

          {/* Left ear cup */}
          <ellipse cx="8" cy="27" rx="6.5" ry="8.5" fill={`url(#${id}-cupOuter)`} />
          <ellipse cx="8" cy="27" rx="5" ry="7" fill="#A89278" opacity="0.6" />
          <ellipse cx="8" cy="27" rx="4.5" ry="6.5" fill="#C0AD96" />
          <ellipse cx="8" cy="27" rx="2.5" ry="3.5" fill="#9A8470" />
          <circle cx="8" cy="27" r="1.2" fill="#7A6858" />
          <ellipse cx="6" cy="23.5" rx="1.2" ry="1.8" fill="white" opacity="0.35" />

          {/* Right ear cup */}
          <ellipse cx="44" cy="27" rx="6.5" ry="8.5" fill={`url(#${id}-cupOuter)`} />
          <ellipse cx="44" cy="27" rx="5" ry="7" fill="#A89278" opacity="0.6" />
          <ellipse cx="44" cy="27" rx="4.5" ry="6.5" fill="#C0AD96" />
          <ellipse cx="44" cy="27" rx="2.5" ry="3.5" fill="#9A8470" />
          <circle cx="44" cy="27" r="1.2" fill="#7A6858" />
          <ellipse cx="42" cy="23.5" rx="1.2" ry="1.8" fill="white" opacity="0.35" />
        </g>
        </g> {/* end headset groups */}

        {/* Body */}
        <g className="lancebot-breathe">
          <ellipse cx="26" cy="33" rx="17" ry="18" fill={`url(#${id}-bodyGrad)`} />
        </g>

        {/* Eyes */}
        <g
          className={mood === "idle" ? "lancebot-eye-wander" : ""}
          style={{ transformOrigin: "26px 24px" }}
        >
          <g
            className={mood === "idle" ? "lancebot-blink-double" : ""}
            style={{ transformOrigin: "26px 24px" }}
          >
            <path d={EYES[mood]} stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" filter={`url(#${id}-glow)`} />
          </g>
        </g>

        {/* Cheeks */}
        {CHEEKS[mood] && (
          <>
            <ellipse cx="17" cy="31" rx="4" ry="2.5" fill="#EC4899" opacity="0.4" />
            <ellipse cx="35" cy="31" rx="4" ry="2.5" fill="#EC4899" opacity="0.4" />
          </>
        )}

        {/* Mouth */}
        <path d={MOUTHS[mood]} stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* Thinking dots */}
        {mood === "thinking" && (
          <>
            <circle cx="37" cy="13" r="1.5" fill="#C4B5FD" opacity="0.9" />
            <circle cx="41" cy="10" r="2" fill="#C4B5FD" opacity="0.7" />
            <circle cx="46" cy="8" r="2.5" fill="#C4B5FD" opacity="0.5" />
          </>
        )}

        {/* Celebrate stars */}
        {mood === "celebrate" && (
          <>
            <circle cx="5"  cy="12" r="1.5" fill="#FCD34D" opacity="0.9" />
            <circle cx="47" cy="14" r="1"   fill="#FCD34D" opacity="0.9" />
            <circle cx="3"  cy="22" r="1"   fill="#F9A8D4" opacity="0.9" />
            <circle cx="49" cy="20" r="1.5" fill="#F9A8D4" opacity="0.9" />
          </>
        )}
      </svg>
    </div>
  );
}
