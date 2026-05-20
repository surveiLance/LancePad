"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
      <p className="text-gray-400">Something went wrong.</p>
      <button onClick={reset} className="text-purple-400 hover:text-purple-300 text-sm underline">
        Try again
      </button>
    </div>
  );
}
