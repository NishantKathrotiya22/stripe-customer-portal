// app/success/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

const Success = () => {
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const sessionId = query.get("session_id");
    if (sessionId) {
      setSessionId(sessionId);
    }
  }, []);

  const openPortal = async () => {
    try {
      toast.loading("Opening Customer Portal...", { id: "portal" });
      const res = await fetch("/api/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error(data.error || "Unable to open portal", { id: "portal" });
        return;
      }
      toast.success("Redirecting...", { id: "portal" });
      window.location.href = data.url;
    } catch (e) {
      toast.error("Failed to open portal", { id: "portal" });
    }
  };

  return (
    <main className="max-w-2xl mx-auto my-12">
      <div className="card glow-border p-6" style={{ borderColor: "rgba(34,197,94,.35)" }}>
        <h2 className="text-2xl font-semibold mb-2" style={{ color: "#22c55e" }}>Subscription Successful</h2>
        <p className="opacity-80 mb-2">Your subscription has been confirmed.</p>
        {sessionId && <p className="opacity-70 text-sm mb-4">Session ID: {sessionId}</p>}
        <div className="flex gap-3">
          <button className="btn btn-secondary" onClick={openPortal}>Manage Subscription</button>
          <a className="btn btn-ghost" href="/">Back to products</a>
        </div>
      </div>
    </main>
  );
};

export default Success;
