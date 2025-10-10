"use client";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"user" | "admin">("user");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to sign up");
        toast.error(data.error || "Failed to sign up");
        return;
      }
      toast.success("Account created");
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-xl mx-auto my-12">
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-4">Create account</h1>
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
          <div className="flex flex-col gap-2">
            <label className="text-sm opacity-80">Role</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  value="user"
                  checked={role === "user"}
                  onChange={() => setRole("user")}
                />
                User
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={role === "admin"}
                  onChange={() => setRole("admin")}
                />
                Admin
              </label>
            </div>
          </div>
          <button
            disabled={loading}
            type="submit"
            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 transition disabled:opacity-50"
          >
            {loading ? "Creating..." : "Sign up"}
          </button>
        </form>
        <p className="mt-4 opacity-80">
          Already have an account? <a className="underline" href="/signin">Sign in</a>
        </p>
      </div>
    </main>
  );
}
