import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = getAuthUserFromRequest(req);
  if (!auth) return NextResponse.json({ subscriptions: [] }, { status: 200 });

  const subs = await prisma.subscription.findMany({
    where: { userId: auth.uid },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ subscriptions: subs });
}
