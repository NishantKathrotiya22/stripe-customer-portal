import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createToken, hashPassword, attachAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password, role } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "User already exists" }, { status: 409 });
  }

  const roleValue = role === "admin" ? "admin" : "user";
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, passwordHash, role: roleValue as any } });

  const token = createToken({ uid: user.id, email: user.email });
  const res = NextResponse.json({ id: user.id, email: user.email });
  attachAuthCookie(res, token);
  return res;
}
