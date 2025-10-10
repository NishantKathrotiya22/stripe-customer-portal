import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = getAuthUserFromRequest(req);
  if (!auth) return NextResponse.json({ user: null }, { status: 200 });
  const user = await prisma.user.findUnique({ where: { id: auth.uid } });
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({ user: { id: user.id, email: user.email, stripeCustomerId: user.stripeCustomerId } });
}
