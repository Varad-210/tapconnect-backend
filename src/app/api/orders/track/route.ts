import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { jsonError, rateLimited } from "@/lib/http";

const schema = z.object({ orderNumber: z.string().trim().min(6).max(60), email: z.string().trim().email().max(254) });

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (rateLimited(`order-track:${ip}`, 12, 15 * 60_000)) return jsonError("Too many lookups. Please wait a little and try again.", 429);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter the order number and email used at checkout.");
  const orderNumber = parsed.data.orderNumber.replace(/\s+/g, "").toUpperCase();
  const email = parsed.data.email.trim().toLowerCase();
  const order = await db.order.findFirst({
    where: { orderNumber, email },
    include: { items: { select: { productName: true, variantName: true, quantity: true, unitPricePaise: true } } },
  });
  if (!order) return jsonError("We couldn’t find an order with those details. Check the order number and checkout email.", 404);
  return NextResponse.json({ order: { orderNumber: order.orderNumber, status: order.status, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, totalPaise: order.totalPaise, createdAt: order.createdAt, items: order.items } });
}
