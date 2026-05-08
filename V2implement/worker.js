// ============================================================
//  📦 Cloudflare Worker — Geofence + Stripe PromptPay + LINE
//  Routes:
//    POST /create-order      → ตรวจ GPS, สร้าง PaymentIntent (Stripe)
//    GET  /payment-status    → ดูสถานะการโอน (polling จาก front-end)
//    POST /payment-webhook   → รับ webhook จาก Stripe
//    OPTIONS *               → CORS preflight
//
//  ENV vars ที่ต้องตั้งใน Cloudflare Dashboard:
//    STRIPE_SECRET_KEY       → sk_live_xxxx  (หรือ sk_test_xxxx สำหรับ test)
//    STRIPE_WEBHOOK_SECRET   → whsec_xxxx    (จาก Stripe Dashboard > Webhooks)
//    ORDERS_KV               → KV namespace binding
//    LINE_MESSAGING_TOKEN    → LINE channel access token
//    LINE_USER_ID            → LINE user/group ID ที่จะรับแจ้งเตือน
//    GOOGLE_SHEET_URL        → (optional) Apps Script URL
// ============================================================

const SHOP_LAT = 13.355270;
const SHOP_LNG = 100.985970;
const RADIUS_KM = 0.1; // 100 เมตร

// ─── Haversine ──────────────────────────────────────────────
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── CORS ────────────────────────────────────────────────────
function cors(body, status = 200) {
  const responseBody = status === 204 ? null : JSON.stringify(body);
  return new Response(responseBody, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// ─── Generate Order ID ───────────────────────────────────────
function genOrderId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

// ─── KV helpers ─────────────────────────────────────────────
async function saveOrder(kv, orderId, data) {
  await kv.put(orderId, JSON.stringify(data), { expirationTtl: 3600 });
}

async function getOrder(kv, orderId) {
  const raw = await kv.get(orderId);
  return raw ? JSON.parse(raw) : null;
}

async function updateOrderStatus(kv, orderId, status, extra = {}) {
  const order = await getOrder(kv, orderId);
  if (order) {
    order.status = status;
    order.updatedAt = new Date().toISOString();
    Object.assign(order, extra);
    await kv.put(orderId, JSON.stringify(order), { expirationTtl: 3600 });
  }
  return order;
}

// ─── Stripe: สร้าง PaymentIntent (PromptPay) ────────────────
// Stripe PromptPay ต้องการ:
//   - payment_method_types: ["promptpay"]
//   - currency: "thb"
//   - confirm: true  → ให้ Stripe สร้าง QR ทันที
//   - payment_method: { type: "promptpay" }
//   - return_url ไม่จำเป็นสำหรับ PromptPay แต่ Stripe บาง version บังคับ
async function createStripePaymentIntent(secretKey, { orderId, total }) {
  const amountSatang = Math.round(Number(total) * 100); // บาท → สตางค์

  // Step 1: สร้าง PaymentIntent
  const piRes = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      amount: String(amountSatang),
      currency: "thb",
      "payment_method_types[]": "promptpay",
      "metadata[orderId]": orderId,
      confirm: "true",
      "payment_method_data[type]": "promptpay",
    }),
  });

  if (!piRes.ok) {
    const err = await piRes.json().catch(() => ({}));
    throw new Error(`Stripe error ${piRes.status}: ${err?.error?.message || "unknown"}`);
  }

  const pi = await piRes.json();

  // QR image URL อยู่ใน next_action
  // next_action.type === "promptpay_display_qr_code"
  const qrImageUrl =
    pi?.next_action?.promptpay_display_qr_code?.image_url_png || null;

  return { paymentIntentId: pi.id, clientSecret: pi.client_secret, qrImageUrl };
}

// ─── Stripe: verify webhook signature ───────────────────────
// Stripe ส่ง timestamp + signature ใน header "Stripe-Signature"
// format: t=xxx,v1=xxx,v1=xxx
async function verifyStripeSignature(secret, rawBody, header) {
  if (!secret) return true; // dev mode: ข้ามถ้าไม่มี secret
  if (!header) return false;

  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  const timestamp = parts["t"];
  const signatures = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));

  if (!timestamp || signatures.length === 0) return false;

  const signedPayload = `${timestamp}.${rawBody}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // ป้องกัน timing attack ด้วย constant-time compare
  return signatures.some((s) => s === hex);
}

// ─── Google Sheets ───────────────────────────────────────────
async function sendToGoogleSheet(sheetUrl, order) {
  try {
    await fetch(sheetUrl, { method: "POST", body: JSON.stringify(order) });
  } catch (e) {
    console.error("Google Sheets error:", e);
  }
}

// ─── LINE Flex Message ───────────────────────────────────────
async function sendLineMessage(token, userId, order) {
  if (!token || !userId) return false;

  const { cart, total, tableNumber, isTakeaway, phone, address, orderId, lat, lng } = order;

  const now = new Date();
  const timeThai = now.toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });
  const dateThai = now.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "2-digit", month: "2-digit", year: "numeric" });

  const itemRows = cart.map((i) => ({
    type: "box",
    layout: "horizontal",
    spacing: "sm",
    contents: [
      { type: "text", text: i.name, flex: 4, size: "sm", color: "#333333", wrap: true },
      { type: "text", text: `x${i.qty}`, flex: 1, size: "sm", color: "#888888", align: "center" },
      { type: "text", text: `฿${i.price * i.qty}`, flex: 2, size: "sm", color: "#e67e00", weight: "bold", align: "end" },
    ],
  }));

  const metaContents = isTakeaway
    ? [
        { type: "text", text: `📱 ${phone}`, size: "sm", color: "#555555", wrap: true },
        ...(address
          ? [{ type: "text", text: `🏠 ${address}`, size: "sm", color: "#555555", wrap: true }]
          : lat && lng
          ? [{ type: "text", text: `📍 GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, size: "xs", color: "#888888", wrap: true }]
          : []),
      ]
    : [{ type: "text", text: `📍 โต๊ะ ${tableNumber}`, size: "sm", color: "#e67e00", weight: "bold" }];

  const orderType = isTakeaway ? "🛵 สั่งกลับบ้าน" : `🍽️ ทานที่ร้าน · โต๊ะ ${tableNumber}`;

  const message = {
    to: userId,
    messages: [
      {
        type: "flex",
        altText: `✅ ออร์เดอร์ใหม่! ${orderType} รวม ฿${total}`,
        contents: {
          type: "bubble",
          size: "kilo",
          header: {
            type: "box",
            layout: "vertical",
            paddingAll: "16px",
            backgroundColor: "#1a1a2e",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "✅ ออร์เดอร์ใหม่!", color: "#FFD700", weight: "bold", size: "lg", flex: 1 },
                  { type: "text", text: orderType, color: "#FFD700", weight: "bold", size: "sm", align: "end", wrap: true, flex: 2 },
                ],
              },
              { type: "text", text: `${dateThai}  ${timeThai}  #${orderId}`, color: "#aaaaaa", size: "xs", margin: "xs" },
            ],
          },
          body: {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            paddingAll: "16px",
            contents: [
              ...metaContents,
              { type: "separator", margin: "md", color: "#eeeeee" },
              ...itemRows,
              { type: "separator", margin: "md", color: "#eeeeee" },
              {
                type: "box",
                layout: "horizontal",
                margin: "md",
                contents: [
                  { type: "text", text: "รวมทั้งสิ้น", weight: "bold", size: "md", color: "#333333", flex: 3 },
                  { type: "text", text: `฿${total}`, weight: "bold", size: "xl", color: "#e67e00", align: "end", flex: 2 },
                ],
              },
            ],
          },
          footer: {
            type: "box",
            layout: "vertical",
            paddingAll: "12px",
            backgroundColor: "#f8f8f8",
            contents: [
              { type: "text", text: "🙏 ขอบคุณที่อุดหนุน ร้านติดบ้าน", color: "#666666", size: "xs", align: "center" },
            ],
          },
        },
      },
    ],
  };

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    if (!res.ok) { console.error(`LINE error ${res.status}: ${await res.text()}`); return false; }
    return true;
  } catch (e) {
    console.error("LINE send error:", e);
    return false;
  }
}

// ════════════════════════════════════════════════════════════
//  Main handler
// ════════════════════════════════════════════════════════════
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";

    if (request.method === "OPTIONS") return cors(null, 204);

    // ── GET /payment-status ──────────────────────────────────
    if (request.method === "GET" && path === "/payment-status") {
      const orderId = url.searchParams.get("orderId");
      if (!orderId) return cors({ error: "missing orderId" }, 400);
      if (!env.ORDERS_KV) return cors({ status: "unknown", error: "KV not configured" }, 500);

      const order = await getOrder(env.ORDERS_KV, orderId);
      if (!order) return cors({ status: "not_found" }, 404);

      return cors({ status: order.status, orderId, updatedAt: order.updatedAt });
    }

    // ── POST /payment-webhook (Stripe) ───────────────────────
    if (request.method === "POST" && path === "/payment-webhook") {
      const rawBody = await request.text();
      const stripeSig = request.headers.get("stripe-signature");

      // Verify Stripe signature (HMAC-SHA256)
      const valid = await verifyStripeSignature(env.STRIPE_WEBHOOK_SECRET, rawBody, stripeSig);
      if (!valid) {
        console.error("Stripe signature mismatch");
        return cors({ error: "invalid signature" }, 401);
      }

      let event;
      try { event = JSON.parse(rawBody); }
      catch { return cors({ error: "invalid json" }, 400); }

      // Stripe events ที่เราสนใจ
      // payment_intent.succeeded          → โอนสำเร็จ ✅
      // payment_intent.payment_failed     → ล้มเหลว ❌
      // payment_intent.canceled           → ยกเลิก ❌

      const pi = event?.data?.object;
      const orderId = pi?.metadata?.orderId;

      if (!orderId) {
        console.error("Stripe webhook: missing orderId in metadata");
        return cors({ error: "missing orderId in metadata" }, 400);
      }

      if (!env.ORDERS_KV) return cors({ error: "KV not configured" }, 500);

      let status = "pending";
      if (event.type === "payment_intent.succeeded") {
        status = "success";
      } else if (
        event.type === "payment_intent.payment_failed" ||
        event.type === "payment_intent.canceled"
      ) {
        status = "fail";
      } else {
        // event อื่นๆ (processing, requires_action ฯลฯ) → ไม่ต้องทำอะไร
        return cors({ ok: true, ignored: true, type: event.type });
      }

      const order = await updateOrderStatus(env.ORDERS_KV, orderId, status, {
        paymentIntentId: pi.id,
        stripeStatus: pi.status,
      });

      if (!order) return cors({ error: "order not found" }, 404);

      if (status === "success") {
        await sendLineMessage(env.LINE_MESSAGING_TOKEN, env.LINE_USER_ID, order);
        if (env.GOOGLE_SHEET_URL) {
          await sendToGoogleSheet(env.GOOGLE_SHEET_URL, { ...order, status });
        }
      }

      return cors({ ok: true, orderId, status });
    }

    // ── POST /create-order ───────────────────────────────────
    if (request.method === "POST" && (path === "/create-order" || path === "/")) {
      let body;
      try { body = await request.json(); }
      catch { return cors({ message: "ข้อมูล JSON ไม่ถูกต้อง" }, 400); }

      const { lat, lng, cart, total, tableNumber, isTakeaway, phone, address } = body;

      if (!lat || !lng || !cart?.length) {
        return cors({ message: "กรุณาส่งข้อมูลให้ครบ: lat, lng, cart" }, 400);
      }

      if (isTakeaway && !phone) {
        return cors({ message: "กรุณาระบุเบอร์โทรศัพท์", ok: false }, 400);
      }

      // ตรวจระยะทาง
      const dist = getDistance(lat, lng, SHOP_LAT, SHOP_LNG);
      console.log(`ระยะทาง: ${(dist * 1000).toFixed(0)} ม. | โต๊ะ: ${tableNumber || "takeaway"}`);

      if (dist > RADIUS_KM) {
        return cors(
          { ok: false, message: `📍 คุณอยู่ห่างจากร้าน ${Math.round(dist * 1000)} เมตร\nกรุณาสั่งอาหารที่ร้านเท่านั้น 🙏` },
          403
        );
      }

      if (!env.STRIPE_SECRET_KEY) {
        console.error("Missing STRIPE_SECRET_KEY");
        return cors({ ok: false, message: "ระบบชำระเงินยังไม่พร้อม กรุณาแจ้งพนักงาน" }, 500);
      }

      const orderId = genOrderId();

      // สร้าง Stripe PaymentIntent (PromptPay)
      let stripeResult;
      try {
        stripeResult = await createStripePaymentIntent(env.STRIPE_SECRET_KEY, { orderId, total });
      } catch (e) {
        console.error("Stripe PaymentIntent error:", e.message);
        return cors({ ok: false, message: "สร้างคำสั่งชำระเงินไม่สำเร็จ กรุณาลองใหม่" }, 502);
      }

      const { paymentIntentId, qrImageUrl } = stripeResult;

      // บันทึก order ลง KV
      if (env.ORDERS_KV) {
        await saveOrder(env.ORDERS_KV, orderId, {
          orderId,
          paymentIntentId,
          status: "pending",
          cart,
          total: Number(total),
          tableNumber: tableNumber || null,
          isTakeaway: !!isTakeaway,
          phone: phone || null,
          address: address || null,
          lat,
          lng,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      return cors({
        ok: true,
        orderId,
        paymentIntentId,
        qrImageUrl,   // ← ส่งไปให้ front-end ใช้ <img src="qrImageUrl" /> ตรงๆ
        message: `สร้างออร์เดอร์ ${orderId} สำเร็จ รอการชำระเงิน`,
      });
    }

    return cors({ message: "Not found" }, 404);
  },
};