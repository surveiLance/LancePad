import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const NOTEBOOK_COLORS = [
  "#FF6B6B", "#FF8E53", "#FFD93D", "#6BCB77",
  "#4D96FF", "#C77DFF", "#FF6BBA", "#00C9A7",
];

export const NOTEBOOK_EMOJIS = [
  "📚", "🧠", "🔬", "🌍", "💻", "🎨", "📐", "🎵",
  "🏛️", "🧬", "⚗️", "📝", "🔭", "🌿", "💡", "🚀",
];

export function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
