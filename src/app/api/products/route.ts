// app/api/products/route.ts
import { NextResponse } from "next/server";
import { getProducts } from "@/lib/stipeService";

export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json(products);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
