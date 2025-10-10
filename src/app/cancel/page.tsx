"use client";
import React from "react";

const Cancel = () => {
  return (
    <main className="max-w-2xl mx-auto my-12">
      <div className="card glow-border p-6" style={{ borderColor: "rgba(239,68,68,.35)" }}>
        <h2 className="text-2xl font-semibold mb-2" style={{ color: "#ef4444" }}>Payment Canceled</h2>
        <p className="opacity-80 mb-4">Your checkout was canceled. You can review products and try again anytime.</p>
        <a className="btn btn-secondary" href="/">Back to products</a>
      </div>
    </main>
  );
};

export default Cancel;
