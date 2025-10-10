import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/auth";
import { createPortalSessionForUser } from "@/lib/stipeService";

export async function POST(req: NextRequest) {
  const auth = getAuthUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: auth.uid } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const url = await createPortalSessionForUser(user.id);
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unable to open portal" }, { status: 400 });
  }
}
