import Link from "next/link";
import LanceBot from "@/components/LanceBot";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 text-center">
      <LanceBot mood="sad" size={80} animate />
      <h1 className="text-3xl font-bold text-white mt-6">Lost in the void 💀</h1>
      <p className="text-gray-400 mt-2 text-sm">This page doesn't exist. Did you take a wrong turn?</p>
      <Link
        href="/notebooks"
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-purple-900/50 hover:-translate-y-0.5"
      >
        Take me home
      </Link>
    </div>
  );
}
