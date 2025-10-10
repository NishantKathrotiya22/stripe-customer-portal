// app/api/webhook/route.ts
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const headerList = await headers();
  const sig = headerList.get("stripe-signature") as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated"
  ) {
    const s = event.data.object as Stripe.Subscription;
    const customerId =
      typeof s.customer === "string" ? s.customer : s.customer.id;
    const priceId = s.items.data[0]?.price.id;
    if (!priceId) return new NextResponse("Missing price", { status: 200 });

    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });
    if (!user)
      return new NextResponse("User not found for customer", { status: 200 });

    await prisma.subscription.upsert({
      where: { stripeSubscriptionId: s.id },
      update: {
        status: s.status,
        priceId,
      },
      create: {
        userId: user.id,
        priceId,
        stripeSubscriptionId: s.id,
        status: s.status,
      },
    });
  } else if (event.type === "customer.subscription.deleted") {
    const s = event.data.object as Stripe.Subscription;
    await prisma.subscription.deleteMany({
      where: { stripeSubscriptionId: s.id },
    });
  }

  return new NextResponse("ok", { status: 200 });
}
