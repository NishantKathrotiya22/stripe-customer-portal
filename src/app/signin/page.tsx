"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function SigninPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to sign in");
        toast.error(data.error || "Failed to sign in");
        return;
      }
      toast.success("Welcome back");
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-xl mx-auto my-12">
      <div className="card rounded-xl p-6">
        <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
        {error && <p className="text-red-500 mb-3">{error}</p>}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm opacity-80">Email</label>
            <input
              className="px-3 py-2 rounded-md border border-white/10 bg-transparent focus:outline-none"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm opacity-80">Password</label>
            <input
              className="px-3 py-2 rounded-md border border-white/10 bg-transparent focus:outline-none"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            disabled={loading}
            type="submit"
            className="btn btn-primary"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="mt-4 opacity-80">
          New here? <a className="underline" href="/signup">Create account</a>
        </p>
      </div>
    </main>
  );
}
