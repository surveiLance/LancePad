"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import LanceBot from "@/components/LanceBot";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Zap, Eye, EyeOff } from "lucide-react";

function toEmail(username: string) {
  return `${username.toLowerCase()}@lancepad.local`;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const justCreated = params.get("created") === "1";
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn("password", { email: toEmail(username), password, flow: "signIn" });
      window.location.href = "/notebooks";
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("InvalidAccountId") || msg.includes("InvalidSecret")) {
        setError("Wrong username or password.");
      } else if (msg.includes("NoAuthProvider")) {
        // Stale token in browser — sign out to clear it, then let user retry
        await signIn("anonymous").catch(() => {});
        setError("Session expired. Please try again.");
      } else {
        setError("Couldn't log in. Please try again.");
      }
      setLoading(false);
    }
  }

  async function handleGuest() {
    setGuestLoading(true);
    try {
      await signIn("anonymous");
      window.location.href = "/notebooks";
    } catch {
      setError("Couldn't start guest session. Try again.");
      setGuestLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm fade-slide-up">
        <div className="flex flex-col items-center mb-8">
          <LanceBot mood="happy" size={72} />
          <h1 className="text-3xl font-bold text-white mt-4">LancePad</h1>
          <p className="text-gray-400 text-sm mt-1">Your AI study buddy is ready 🚀</p>
        </div>


        {justCreated && (
          <p className="text-green-400 text-sm bg-green-950/50 border border-green-900 rounded-lg px-3 py-2 mb-4 text-center">
            Account created! Log in to continue.
          </p>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value.trim())}
            autoComplete="username"
          />
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" variant="secondary" className="w-full" disabled={loading}>
            {loading ? "Logging in..." : "Log in"}
          </Button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          No account?{" "}
          <Link href="/auth/signup" className="text-purple-400 hover:text-purple-300 font-medium">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
