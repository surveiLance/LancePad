import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
      <p className="text-gray-400">Page not found.</p>
      <Link href="/notebooks" className="text-purple-400 hover:text-purple-300 text-sm underline">
        Go home
      </Link>
    </div>
  );
}
