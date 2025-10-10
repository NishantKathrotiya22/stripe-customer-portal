// app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession, ensureCustomerForUser } from "@/lib/stipeService";
import { getAuthUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { priceId } = body;

  try {
    if (!priceId) {
      return NextResponse.json({ error: "priceId is required" }, { status: 400 });
    }

    const auth = getAuthUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Load current user and ensure Stripe customer
    let user = await prisma.user.findUnique({ where: { id: auth.uid } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    user = await ensureCustomerForUser(user.id);

    // Prevent duplicate subscription for same plan
    const existing = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        priceId,
        status: { in: ["active", "trialing", "incomplete", "past_due"] },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You are already subscribed to this plan." },
        { status: 409 }
      );
    }

    const sessionUrl = await createCheckoutSession(priceId, user.stripeCustomerId!);
    return NextResponse.json({ url: sessionUrl });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
