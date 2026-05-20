"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type Mood = "idle" | "happy" | "thinking" | "celebrate" | "sad";

interface LanceBotProps {
  mood?: Mood;
  size?: number;
  className?: string;
  animate?: boolean;
}

const MOOD_FILTER: Record<Mood, string> = {
  idle:      "brightness(1) saturate(1)",
  happy:     "brightness(1.08) saturate(1.2) drop-shadow(0 0 12px rgba(167,139,250,0.5))",
  thinking:  "brightness(0.95) saturate(0.85)",
  celebrate: "brightness(1.15) saturate(1.4) drop-shadow(0 0 18px rgba(167,139,250,0.7))",
  sad:       "grayscale(0.5) brightness(0.8)",
};

const MOOD_ANIM: Record<Mood, string> = {
  idle:      "lancebot-float",
  happy:     "lancebot-float",
  thinking:  "lancebot-think",
  celebrate: "lancebot-celebrate",
  sad:       "lancebot-sad",
};

export default function LanceBot({ mood = "idle", size = 52, className, animate = true }: LanceBotProps) {
  return (
    <div
      className={cn("relative inline-flex items-center justify-center flex-shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/lancebot.png"
        alt="LanceBot"
        width={size}
        height={size}
        className={cn("object-contain object-top select-none", animate && MOOD_ANIM[mood])}
        style={{ filter: MOOD_FILTER[mood], transition: "filter 0.4s ease" }}
        priority
      />

      {/* Thinking dots */}
      {mood === "thinking" && animate && (
        <div className="absolute -top-1 -right-1 flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-purple-400"
              style={{ animation: `breathe 1s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      )}

      {/* Celebrate sparkles */}
      {mood === "celebrate" && animate && (
        <>
          <span className="absolute -top-2 -left-1 text-sm pointer-events-none" style={{ animation: "float 1s ease-in-out infinite" }}>✨</span>
          <span className="absolute -top-3 right-0 text-sm pointer-events-none" style={{ animation: "float 1.3s ease-in-out 0.2s infinite" }}>🎉</span>
        </>
      )}
    </div>
  );
}
