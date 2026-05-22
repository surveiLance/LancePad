"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import LanceBot from "@/components/LanceBot";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Zap, Eye, EyeOff } from "lucide-react";

// Convex Password provider needs an email — we synthesize one from the username
function toEmail(username: string) {
  return `${username.toLowerCase()}@lancepad.local`;
}

export default function SignupPage() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [slowHint, setSlowHint] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  useEffect(() => {
    if (!loading) { setSlowHint(false); return; }
    const t = setTimeout(() => setSlowHint(true), 7000);
    return () => clearTimeout(t);
  }, [loading]);


  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (username.length < 3) { setError("Username must be at least 3 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    try {
      await signIn("password", { email: toEmail(username), password, flow: "signUp" });
      router.push("/auth/login?created=1");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already") || msg.includes("exists")) {
        setError("That username is already taken. Try another.");
      } else if (msg.includes("NoAuthProvider")) {
        await signIn("anonymous").catch(() => {});
        setError("Session expired. Please try again.");
      } else {
        setError("Couldn't create account. Please try again.");
      }
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

  const passwordsTyped = password.length > 0 && confirm.length > 0;
  const mismatch = passwordsTyped && password !== confirm;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <LanceBot mood="happy" size={72} />
          <h1 className="text-3xl font-bold text-white mt-4">LancePad</h1>
          <p className="text-gray-400 text-sm mt-1">Your AI study buddy is waiting 🧠</p>
        </div>


        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            type="text"
            placeholder="Username (min 3 chars)"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
            autoComplete="username"
          />

          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
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

          <div className="relative">
            <Input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={mismatch ? "border-red-600 focus:border-red-500 pr-10" : "pr-10"}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {mismatch && <p className="text-red-400 text-xs -mt-2">Passwords don&apos;t match</p>}

          {slowHint && (
            <p className="text-yellow-500/80 text-xs text-center">
              First signup takes a bit longer — almost there...
            </p>
          )}

          {error && (
            <p className="text-red-400 text-sm bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" variant="secondary" className="w-full" disabled={loading || mismatch}>
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
