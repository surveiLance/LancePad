"use client";

import { useEffect, useState } from "react";
import { getGroqUsage, subscribeGroqUsage } from "@/lib/groq-usage-store";

export default function GroqUsageBadge() {
  const [usage, setUsage] = useState(getGroqUsage());

  useEffect(() => {
    const unsub = subscribeGroqUsage(() => setUsage({ ...getGroqUsage() }));
    return () => { unsub(); };
  }, []);

  const DEFAULT_LIMIT = 30000;
  const remaining = usage.remainingTokens ?? DEFAULT_LIMIT;
  const limit = usage.limitTokens ?? DEFAULT_LIMIT;
  const pct = Math.round((remaining / limit) * 100);
  const isRateLimited = remaining === 0;

  const color =
    pct > 50 ? "text-green-400 border-green-800/60 bg-green-950/30" :
    pct > 20 ? "text-yellow-400 border-yellow-800/60 bg-yellow-950/30" :
               "text-red-400 border-red-800/60 bg-red-950/30";

  // Parse reset string like "1m30s", "59.1s", "2m" into a readable label
  function formatReset(reset: string | null): string {
    if (!reset) return "~60s";
    const mins = reset.match(/(\d+)m/)?.[1];
    const secs = reset.match(/([\d.]+)s/)?.[1];
    if (mins && secs) return `${mins}m ${Math.ceil(parseFloat(secs))}s`;
    if (mins) return `${mins}m`;
    if (secs) return `${Math.ceil(parseFloat(secs))}s`;
    return reset;
  }

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-medium ${color}`}
      title={isRateLimited ? `Resets in ${formatReset(usage.resetTokens)}` : "Groq token usage — resets every 60s"}
    >
      <span>⚡</span>
      {isRateLimited
        ? <span>Rate limited — resets in {formatReset(usage.resetTokens)}</span>
        : <span>{remaining.toLocaleString()} / {limit.toLocaleString()} tokens</span>
      }
    </div>
  );
}
