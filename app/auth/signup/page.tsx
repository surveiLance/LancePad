"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import LanceBot from "@/components/LanceBot";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Zap } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn("password", { email, password, flow: "signUp" });
      router.push("/notebooks");
    } catch {
      setError("Couldn't create account. Try a stronger password.");
      setLoading(false);
    }
  }

  async function handleGuest() {
    setGuestLoading(true);
    try {
      await signIn("anonymous");
      router.push("/notebooks");
    } catch {
      setError("Couldn't start guest session. Try again.");
      setGuestLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <LanceBot mood="happy" size={72} />
          <h1 className="text-3xl font-bold text-white mt-4">LancePad</h1>
          <p className="text-gray-400 text-sm mt-1">Your AI study buddy is waiting 🧠</p>
        </div>

        <Button
          type="button"
          size="lg"
          className="w-full mb-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
          onClick={handleGuest}
          disabled={guestLoading}
        >
          <Zap size={16} />
          {guestLoading ? "Loading..." : "Try it instantly — no account needed"}
        </Button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-gray-600 text-xs">or create an account</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
          />
          {error && (
            <p className="text-red-400 text-sm bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" variant="secondary" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create free account"}
          </Button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have one?{" "}
          <Link href="/auth/login" className="text-purple-400 hover:text-purple-300 font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
