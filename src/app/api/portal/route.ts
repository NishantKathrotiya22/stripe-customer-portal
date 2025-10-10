import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/auth";
import { createPortalSessionForUser } from "@/lib/stipeService";

// POST /api/portal
// Returns a Stripe Billing Portal URL for the authenticated user based on their role
export async function POST(req: NextRequest) {
  // 1) Require auth and resolve app user
  const auth = getAuthUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2) Load user to get stripeCustomerId and role
  const user = await prisma.user.findUnique({ where: { id: auth.uid } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // 3) Create a role-aware portal session and return the redirect URL
    const url = await createPortalSessionForUser(user.id);
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unable to open portal" }, { status: 400 });
  }
}
