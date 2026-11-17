type OrderEmailStatus = "sent" | "not_configured" | "failed";
type OrderForEmail = { orderNumber: string; customerName: string; email: string; status: string; totalPaise: number; paymentMethod: string; createdAt: Date | string; items: { productName: string; variantName: string; quantity: number; unitPricePaise: number }[] };

const copy: Record<string, { subject: string; heading: string; message: string }> = {
  PENDING: { subject: "We received your Vistar order", heading: "Your order is in good hands.", message: "Thanks for choosing Vistar. We’ve received your order and our team will confirm it shortly." },
  CONFIRMED: { subject: "Your Vistar order is confirmed", heading: "Your order is confirmed.", message: "We’ve confirmed your order and are getting everything ready." },
  PROCESSING: { subject: "Your Vistar cards are being prepared", heading: "We’re preparing your order.", message: "Your Vistar cards are being packed with care. We’ll let you know as soon as they’re on the way." },
  SHIPPED: { subject: "Your Vistar order is on the way", heading: "Your order is on the way.", message: "Your Vistar order has been handed over for delivery. Use the tracking button below for the latest status." },
  DELIVERED: { subject: "Your Vistar order has arrived", heading: "Delivered. Now make every tap count.", message: "Your order is marked as delivered. We hope your new Vistar cards help your business grow." },
  CANCELLED: { subject: "An update about your Vistar order", heading: "Your order was cancelled.", message: "This order has been cancelled. If you think this is a mistake, please contact our team." },
};

function escapeHtml(value: unknown): string {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, character => entities[character] || character);
}
function formatMoney(paise: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

function buildEmail(order: OrderForEmail) {
  const message = copy[order.status] ?? copy.PENDING;
  const appUrl = (process.env.APP_URL || "https://vistarai.vercel.app").replace(/\/+$/, "");
  const trackUrl = `${appUrl}/track-order?orderNumber=${encodeURIComponent(order.orderNumber)}`;
  const rows = order.items.map(item => `<tr><td style="padding:12px 0;border-bottom:1px solid #e8edf6;color:#23345a;font-size:14px"><strong>${escapeHtml(item.productName)}</strong><br><span style="color:#71809a;font-size:12px">${escapeHtml(item.variantName)} · Qty ${item.quantity}</span></td><td align="right" style="padding:12px 0;border-bottom:1px solid #e8edf6;color:#14254b;font-size:14px;font-weight:700;white-space:nowrap">${formatMoney(item.unitPricePaise * item.quantity)}</td></tr>`).join("");
  const labels = ["Order received", "Confirmed", "Preparing", "Shipped", "Delivered"];
  const statusIndex = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].indexOf(order.status);
  const progress = order.status === "CANCELLED"
    ? `<div style="margin:24px 0;padding:12px 16px;border-radius:10px;background:#fff3f3;color:#a33b3b;font-size:13px;font-weight:700">Order cancelled</div>`
    : `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0"><tr>${labels.map((label, index) => { const active = index <= statusIndex; return `<td align="center" style="width:20%;font-size:10px;color:${active ? "#102f91" : "#929db0"};font-weight:700"><span style="display:block;width:20px;height:20px;margin:0 auto 7px;border-radius:50%;line-height:20px;background:${active ? "#1463f3" : "#e8edf6"};color:#fff">${index < statusIndex ? "✓" : index + 1}</span>${label}</td>`; }).join("")}</tr></table>`;
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f3f6fc;font-family:Arial,Helvetica,sans-serif;color:#14254b"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(message.message)} Order ${escapeHtml(order.orderNumber)}.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fc;padding:30px 12px"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;border-radius:20px;overflow:hidden;background:#fff;box-shadow:0 14px 40px rgba(8,27,96,.10)"><tr><td style="padding:22px 30px;background:#081b60;border-bottom:4px solid #ffd21f"><span style="color:#fff;font-size:22px;font-weight:900;letter-spacing:2px">VISTAR</span><span style="display:block;margin-top:4px;color:#c9d7ff;font-size:10px;font-weight:700;letter-spacing:1.5px">EXPAND YOUR BUSINESS</span></td></tr><tr><td style="padding:34px 30px 18px"><span style="display:inline-block;padding:7px 11px;border-radius:999px;background:#edf3ff;color:#1458cc;font-size:10px;font-weight:800;letter-spacing:.8px">${escapeHtml(order.status.replace("_", " "))}</span><h1 style="margin:16px 0 9px;color:#102f91;font-size:28px;line-height:1.2">${escapeHtml(message.heading)}</h1><p style="margin:0;color:#5b6b86;font-size:15px;line-height:1.7">Hi ${escapeHtml(order.customerName)}, ${escapeHtml(message.message)}</p>${progress}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;border:1px solid #e3eafa;border-radius:14px;background:#f8faff"><tr><td style="padding:16px 18px"><span style="color:#75839a;font-size:10px;font-weight:800;letter-spacing:1px">ORDER NUMBER</span><div style="margin-top:5px;color:#102f91;font-size:17px;font-weight:800">${escapeHtml(order.orderNumber)}</div></td><td align="right" style="padding:16px 18px"><span style="color:#75839a;font-size:10px;font-weight:800;letter-spacing:1px">ORDER TOTAL</span><div style="margin-top:5px;color:#102f91;font-size:17px;font-weight:800">${formatMoney(order.totalPaise)}</div></td></tr></table><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><thead><tr><th align="left" style="padding-bottom:6px;color:#75839a;font-size:10px;letter-spacing:1px">YOUR ITEMS</th><th align="right" style="padding-bottom:6px;color:#75839a;font-size:10px;letter-spacing:1px">AMOUNT</th></tr></thead><tbody>${rows}</tbody></table><p style="margin:13px 0 0;color:#65758e;font-size:12px">Payment: ${escapeHtml(order.paymentMethod === "COD" ? "Cash on delivery" : order.paymentMethod)}</p><table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px auto 10px"><tr><td align="center" style="border-radius:11px;background:#ffd21f"><a href="${escapeHtml(trackUrl)}" style="display:inline-block;padding:14px 24px;color:#081b60;text-decoration:none;font-size:14px;font-weight:800">Track your order&nbsp; →</a></td></tr></table><p style="margin:16px 0 0;color:#71809a;font-size:12px;line-height:1.6;text-align:center">For your privacy, tracking asks for the order number and the email used at checkout.</p></td></tr><tr><td style="padding:20px 30px;background:#f8faff;border-top:1px solid #e8edf6;text-align:center"><p style="margin:0;color:#61718b;font-size:12px;line-height:1.7">Questions? <a href="${escapeHtml(appUrl)}/#contact" style="color:#1458cc;font-weight:700">Contact Vistar support</a></p><p style="margin:8px 0 0;color:#98a3b5;font-size:10px">© ${new Date().getFullYear()} Vistar · Expand your business, one tap at a time.</p></td></tr></table></td></tr></table></body></html>`;
  const text = [
    `Hi ${order.customerName},`, message.message, `Order: ${order.orderNumber}`, `Status: ${order.status}`,
    `Total: ${formatMoney(order.totalPaise)}`, `Payment: ${order.paymentMethod === "COD" ? "Cash on delivery" : order.paymentMethod}`,
    "Items:", ...order.items.map(item => `- ${item.productName} / ${item.variantName} × ${item.quantity}: ${formatMoney(item.unitPricePaise * item.quantity)}`),
    `Track your order: ${trackUrl}`, `Vistar · ${appUrl}`,
  ].join("\n");
  return { subject: `${message.subject} · ${order.orderNumber}`, html, text };
}

export async function sendOrderEmail(order: OrderForEmail): Promise<{ status: OrderEmailStatus }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM;
  if (!apiKey || !from) return { status: "not_configured" };
  const email = buildEmail(order);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [order.email], subject: email.subject, html: email.html, text: email.text }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      console.error("[order-email] provider rejected an order notification", { status: response.status });
      return { status: "failed" };
    }
    return { status: "sent" };
  } catch {
    console.error("[order-email] order notification request failed");
    return { status: "failed" };
  }
}
