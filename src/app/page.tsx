// app/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

const ProductDisplay = ({ products }: { products: any[] }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      setUser(data.user);
    })();
  }, []);

  const handleCheckout = async (priceId: string) => {
    setLoading(true);
    try {
      setMessage(null);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setMessage("Please sign in to subscribe.");
        toast.error("Please sign in to subscribe");
        return;
      }
      if (res.status === 409) {
        setMessage(data.error || "You are already subscribed to this plan.");
        toast("Already subscribed to this plan", { icon: "ℹ️" });
        return;
      }
      if (data.url) {
        toast.loading("Redirecting to checkout...");
        window.location.href = data.url;
      } else {
        setMessage("Something went wrong.");
        toast.error("Something went wrong");
      }
    } catch (error) {
      console.error("Error during checkout:", error);
      setMessage("Something went wrong.");
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleManage = async () => {
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
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Stripe</h1>
          <p className="opacity-80">
            Pick a plan and manage it anytime in the Customer Portal.
          </p>
        </div>
        <div className="flex items-center">
          {user ? (
            <>
              <span className="mr-3 opacity-80">Signed in as {user.email}</span>
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.reload();
                }}
                className="btn btn-ghost"
              >
                Logout
              </button>
              <button className="btn btn-secondary ml-3" onClick={handleManage}>
                Manage Subscription
              </button>
            </>
          ) : (
            <>
              <a className="btn btn-secondary mr-3" href="/signup">
                Sign up
              </a>
              <a className="btn btn-ghost" href="/signin">
                Sign in
              </a>
            </>
          )}
        </div>
      </div>
      {message && <p className="text-red-400">{message}</p>}
      {loading && <p className="opacity-80">Loading...</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {products?.map((product) => (
          <div key={product.id} className="card glow-border p-5">
            <div className="mb-3">
              <h3 className="text-xl font-semibold">{product?.name}</h3>
              <p className="opacity-80 text-sm">
                {product?.description || "Subscription plan"}
              </p>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold">${product?.price}</div>
              <button
                className="btn btn-primary"
                onClick={() => handleCheckout(product?.priceId)}
              >
                Subscribe
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default function Page() {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const res = await fetch("/api/products");
      const data = await res.json();
      console.log(data);
      setProducts(data);
    };

    fetchProducts();
  }, []);

  return <ProductDisplay products={products} />;
}
