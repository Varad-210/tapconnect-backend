import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { sendOrderEmail } from "@/lib/order-email";
const schema = z.object({ status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]) });
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireUser(["ADMIN"]); if (!admin) return jsonError("Admin access required.", 403);
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return jsonError("Choose a valid order status.");
  try {
    const outcome = await db.$transaction(async tx => {
      const current = await tx.order.findUnique({ where: { id } });
      if (!current) throw new Error("ORDER_NOT_FOUND");
      if (current.status === "CANCELLED" && parsed.data.status !== "CANCELLED") throw new Error("ORDER_CANCELLED");
      const changed = current.status !== parsed.data.status;
      if (changed) {
        const result = await tx.order.updateMany({ where: { id, status: current.status }, data: { status: parsed.data.status } });
        if (result.count !== 1) throw new Error("ORDER_RACE");
        if (parsed.data.status === "CANCELLED") for (const item of await tx.orderItem.findMany({ where: { orderId: id } })) await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
      }
      const order = await tx.order.findUniqueOrThrow({ where: { id }, include: { items: true } });
      return { order, changed };
    });
    if (outcome.changed) await db.auditLog.create({ data: { actorId: admin.sub, action: "ORDER_STATUS_UPDATED", targetType: "Order", targetId: id, details: { status: outcome.order.status } } });
    const emailResult = outcome.changed ? await sendOrderEmail(outcome.order) : { status: "unchanged" as const };
    return NextResponse.json({ order: outcome.order, emailStatus: emailResult.status });
  } catch (error) {
    const reason = (error as Error).message;
    if (reason === "ORDER_NOT_FOUND") return jsonError("Order not found.", 404);
    if (reason === "ORDER_CANCELLED") return jsonError("Cancelled orders cannot be reopened.", 409);
    if (reason === "ORDER_RACE") return jsonError("This order changed. Refresh and try again.", 409);
    throw error;
  }
}
