import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createToken, verifyPassword, attachAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const token = createToken({ uid: user.id, email: user.email });
  const res = NextResponse.json({ id: user.id, email: user.email });
  attachAuthCookie(res, token);
  return res;
}
