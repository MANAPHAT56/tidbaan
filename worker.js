// ============================================================
//  📦 Cloudflare Worker — Geofence + Turnstile + Rate Limit + Stripe PromptPay + LINE
// ============================================================

const SHOP_LAT = 13.355270;
const SHOP_LNG = 100.985970;
const RADIUS_KM = 1;

// ── Rate Limit config ────────────────────────────────────────
const RATE_LIMIT_MAX      = 10;   // ครั้งสูงสุดต่อ window
const RATE_LIMIT_WINDOW_S = 60;   // window ขนาด 60 วินาที (1 นาที)

// ============================================================
//  Helpers
// ============================================================

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

function cors(body, status = 200, extraHeaders = {}) {
  const responseBody = status === 204 ? null : JSON.stringify(body);
  return new Response(responseBody, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
      ...extraHeaders,
    },
  });
}

function genOrderId() {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

// ============================================================
//  KV helpers — Orders
// ============================================================

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
    order.status    = status;
    order.updatedAt = new Date().toISOString();
    Object.assign(order, extra);
    await kv.put(orderId, JSON.stringify(order), { expirationTtl: 3600 });
  }
  return order;
}

// ============================================================
//  Rate Limiter — sliding window counter ใน KV
//
//  key  : "rl:<ip>"
//  value: JSON { count: number, resetAt: unix-ms }
//  TTL  : RATE_LIMIT_WINDOW_S วินาที (KV auto-expire เอง)
//
//  Return: { allowed: bool, count: number, resetAt: unix-ms, retryAfterS: number }
// ============================================================

async function checkRateLimit(kv, ip) {
  const key = `rl:${ip}`;
  const now = Date.now();

  let entry = null;
  try {
    const raw = await kv.get(key);
    if (raw) entry = JSON.parse(raw);
  } catch (_) {
    // KV read error → fail open (ไม่บล็อก) เพื่อไม่กระทบ UX ปกติ
    console.error("Rate limit KV read error — failing open");
    return {
      allowed: true,
      count: 0,
      resetAt: now + RATE_LIMIT_WINDOW_S * 1000,
      retryAfterS: 0,
    };
  }

  // ยังไม่มี entry หรือ window หมดแล้ว → เริ่ม window ใหม่
  if (!entry || now >= entry.resetAt) {
    const resetAt   = now + RATE_LIMIT_WINDOW_S * 1000;
    const newEntry  = { count: 1, resetAt };
    try {
      await kv.put(key, JSON.stringify(newEntry), { expirationTtl: RATE_LIMIT_WINDOW_S });
    } catch (_) {
      console.error("Rate limit KV write error");
    }
    return { allowed: true, count: 1, resetAt, retryAfterS: 0 };
  }

  // window ยังไม่หมด → เพิ่ม count
  entry.count += 1;
  const retryAfterS = Math.ceil((entry.resetAt - now) / 1000);
  const ttl         = retryAfterS > 0 ? retryAfterS : 1;

  if (entry.count > RATE_LIMIT_MAX) {
    // เกิน limit → บันทึก count ที่เพิ่มแล้ว แต่ไม่ต่อ window
    try {
      await kv.put(key, JSON.stringify(entry), { expirationTtl: ttl });
    } catch (_) {}
    console.warn(`Rate limit exceeded — IP: ${ip}, count: ${entry.count}`);
    return { allowed: false, count: entry.count, resetAt: entry.resetAt, retryAfterS };
  }

  // ยังอยู่ใน limit → อัปเดต count
  try {
    await kv.put(key, JSON.stringify(entry), { expirationTtl: ttl });
  } catch (_) {}
  return { allowed: true, count: entry.count, resetAt: entry.resetAt, retryAfterS: 0 };
}

// ============================================================
//  Turnstile
// ============================================================

async function verifyTurnstile(token, secretKey, ip) {
  if (!secretKey) {
    console.warn("TURNSTILE_SECRET not set — skipping verification");
    return true;
  }
  if (!token) return false;

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
    }
  );
  const data = await res.json();
  console.log("Turnstile verify result:", JSON.stringify(data));
  return data.success === true;
}

// ============================================================
//  Stripe
// ============================================================

async function createStripePaymentIntent(secretKey, { orderId, total }) {
  const amountSatang = Math.round(Number(total) * 100);

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
      "payment_method_data[billing_details][email]": "guest@order.local",
    }),
  });

  if (!piRes.ok) {
    const err = await piRes.json().catch(() => ({}));
    throw new Error(`Stripe error ${piRes.status}: ${err?.error?.message || "unknown"}`);
  }

  const pi = await piRes.json();
  console.log("Stripe PI created:", pi.id, "| metadata.orderId:", pi.metadata?.orderId);

  const qrImageUrl = pi?.next_action?.promptpay_display_qr_code?.image_url_png || null;
  return { paymentIntentId: pi.id, clientSecret: pi.client_secret, qrImageUrl };
}

async function cancelStripePaymentIntent(secretKey, paymentIntentId) {
  const res = await fetch(
    `https://api.stripe.com/v1/payment_intents/${paymentIntentId}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ cancellation_reason: "abandoned" }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Stripe cancel error:", err?.error?.message);
    return false;
  }
  console.log("Stripe PI cancelled:", paymentIntentId);
  return true;
}

async function verifyStripeSignature(secret, rawBody, header) {
  if (!secret) return true;
  if (!header)  return false;

  const parts      = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  const timestamp  = parts["t"];
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

  return signatures.some((s) => s === hex);
}

// ============================================================
//  LINE + Google Sheet
// ============================================================

async function sendToGoogleSheet(sheetUrl, order) {
  try {
    await fetch(sheetUrl, { method: "POST", body: JSON.stringify(order) });
  } catch (e) {
    console.error("Google Sheets error:", e);
  }
}

async function sendLineMessage(token, userId, order) {
  if (!token || !userId) {
    console.error("LINE missing token or userId");
    return false;
  }

  const { cart, total, tableNumber, isTakeaway, phone, address, orderId, lat, lng } = order;

  const now      = new Date();
  const timeThai = now.toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });
  const dateThai = now.toLocaleDateString("th-TH",  { timeZone: "Asia/Bangkok", day: "2-digit", month: "2-digit", year: "numeric" });

  const itemRows = cart.map((i) => ({
    type: "box", layout: "horizontal", spacing: "sm",
    contents: [
      { type: "text", text: i.name,                flex: 4, size: "sm", color: "#333333", wrap: true },
      { type: "text", text: `x${i.qty}`,           flex: 1, size: "sm", color: "#888888", align: "center" },
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
    messages: [{
      type: "flex",
      altText: `✅ ออร์เดอร์ใหม่! ${orderType} รวม ฿${total}`,
      contents: {
        type: "bubble", size: "kilo",
        header: {
          type: "box", layout: "vertical", paddingAll: "16px", backgroundColor: "#1a1a2e",
          contents: [
            {
              type: "box", layout: "horizontal",
              contents: [
                { type: "text", text: "✅ ออร์เดอร์ใหม่!", color: "#FFD700", weight: "bold", size: "lg", flex: 1 },
                { type: "text", text: orderType,            color: "#FFD700", weight: "bold", size: "sm", align: "end", wrap: true, flex: 2 },
              ],
            },
            { type: "text", text: `${dateThai}  ${timeThai}  #${orderId}`, color: "#aaaaaa", size: "xs", margin: "xs" },
          ],
        },
        body: {
          type: "box", layout: "vertical", spacing: "sm", paddingAll: "16px",
          contents: [
            ...metaContents,
            { type: "separator", margin: "md", color: "#eeeeee" },
            ...itemRows,
            { type: "separator", margin: "md", color: "#eeeeee" },
            {
              type: "box", layout: "horizontal", margin: "md",
              contents: [
                { type: "text", text: "รวมทั้งสิ้น", weight: "bold", size: "md", color: "#333333", flex: 3 },
                { type: "text", text: `฿${total}`,   weight: "bold", size: "xl", color: "#e67e00", align: "end", flex: 2 },
              ],
            },
          ],
        },
        footer: {
          type: "box", layout: "vertical", paddingAll: "12px", backgroundColor: "#f8f8f8",
          contents: [
            { type: "text", text: "🙏 ขอบคุณที่อุดหนุน ร้านติดบ้าน", color: "#666666", size: "xs", align: "center" },
          ],
        },
      },
    }],
  };

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    if (!res.ok) {
      console.error(`LINE error ${res.status}: ${await res.text()}`);
      return false;
    }
    console.log("LINE sent ok");
    return true;
  } catch (e) {
    console.error("LINE send error:", e);
    return false;
  }
}

// ============================================================
//  Main handler
// ============================================================

export default {
  async fetch(request, env) {
    const url  = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";

    if (request.method === "OPTIONS") return cors(null, 204);

    // ── GET /payment-status ──────────────────────────────────
    if (request.method === "GET" && path === "/payment-status") {
      const orderId = url.searchParams.get("orderId");
      if (!orderId)       return cors({ error: "missing orderId" }, 400);
      if (!env.ORDERS_KV) return cors({ status: "unknown", error: "KV not configured" }, 500);

      const order = await getOrder(env.ORDERS_KV, orderId);
      if (!order) return cors({ status: "not_found" }, 404);

      return cors({ status: order.status, orderId, updatedAt: order.updatedAt });
    }

    // ── POST /cancel-order ───────────────────────────────────
    if (request.method === "POST" && path === "/cancel-order") {
      let body;
      try { body = await request.json(); }
      catch { return cors({ error: "invalid json" }, 400); }

      const { orderId, paymentIntentId } = body;
      if (!orderId || !paymentIntentId)
        return cors({ error: "missing orderId or paymentIntentId" }, 400);
      if (!env.ORDERS_KV)
        return cors({ error: "KV not configured" }, 500);

      const order = await getOrder(env.ORDERS_KV, orderId);
      if (!order) return cors({ error: "order not found" }, 404);
      if (order.status !== "pending") {
        console.log(`cancel-order: skip — status is already "${order.status}"`);
        return cors({ ok: true, skipped: true, status: order.status });
      }

      if (env.STRIPE_SECRET_KEY)
        await cancelStripePaymentIntent(env.STRIPE_SECRET_KEY, paymentIntentId);

      await updateOrderStatus(env.ORDERS_KV, orderId, "expired");
      console.log("order expired:", orderId);
      return cors({ ok: true, orderId, status: "expired" });
    }

    // ── POST /payment-webhook ────────────────────────────────
    if (request.method === "POST" && path === "/payment-webhook") {
      const rawBody   = await request.text();
      const stripeSig = request.headers.get("stripe-signature");

      let event;
      try { event = JSON.parse(rawBody); }
      catch { return cors({ error: "invalid json" }, 400); }

      console.log("webhook event type:", event.type);

      const valid = await verifyStripeSignature(env.STRIPE_WEBHOOK_SECRET, rawBody, stripeSig);
      console.log("signature valid:", valid);
      if (!valid) {
        console.error("Stripe signature mismatch");
        return cors({ error: "invalid signature" }, 401);
      }

      const pi      = event?.data?.object;
      const orderId = pi?.metadata?.orderId;
      console.log("pi.id:", pi?.id, "| orderId from metadata:", orderId);

      if (!orderId) {
        console.error("missing orderId in metadata");
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
        const existing = await getOrder(env.ORDERS_KV, orderId);
        status = existing?.status === "expired" ? "expired" : "fail";
      } else {
        return cors({ ok: true, ignored: true, type: event.type });
      }

      console.log("updating KV orderId:", orderId, "→ status:", status);
      const updated = await updateOrderStatus(env.ORDERS_KV, orderId, status, {
        paymentIntentId: pi.id,
        stripeStatus: pi.status,
      });

      console.log("order from KV:", updated ? "found" : "NOT FOUND");
      if (!updated) return cors({ error: "order not found in KV" }, 404);

      if (status === "success") {
        console.log("sending LINE + Sheet...");
        await sendLineMessage(env.LINE_MESSAGING_TOKEN, env.LINE_USER_ID, updated);
        if (env.GOOGLE_SHEET_URL)
          await sendToGoogleSheet(env.GOOGLE_SHEET_URL, { ...updated, status });
      }

      return cors({ ok: true, orderId, status });
    }

    // ── POST /create-order ───────────────────────────────────
    if (request.method === "POST" && (path === "/create-order" || path === "/")) {

      if (!env.ORDERS_KV) return cors({ ok: false, message: "KV not configured" }, 500);

      // ── Step 0: Rate Limit ── ตรวจก่อน parse body (ประหยัด CPU) ──
      const clientIp =
        request.headers.get("CF-Connecting-IP") ||
        request.headers.get("X-Forwarded-For")?.split(",")[0].trim() ||
        "unknown";

      const rl = await checkRateLimit(env.ORDERS_KV, clientIp);

      // Standard rate-limit headers ส่งกลับทุก response
      const rlHeaders = {
        "X-RateLimit-Limit":     String(RATE_LIMIT_MAX),
        "X-RateLimit-Remaining": String(Math.max(0, RATE_LIMIT_MAX - rl.count)),
        "X-RateLimit-Reset":     String(Math.ceil(rl.resetAt / 1000)),
      };

      if (!rl.allowed) {
        console.warn(`🚫 Rate limit blocked — IP: ${clientIp}, count: ${rl.count}`);
        return cors(
          {
            ok: false,
            message: `⛔ คุณสั่งถี่เกินไป กรุณารอ ${rl.retryAfterS} วินาทีแล้วลองใหม่`,
          },
          429,
          { ...rlHeaders, "Retry-After": String(rl.retryAfterS) }
        );
      }

      // ── Step 1: Parse body ───────────────────────────────
      let body;
      try { body = await request.json(); }
      catch { return cors({ message: "ข้อมูล JSON ไม่ถูกต้อง" }, 400); }

      const { lat, lng, cart, total, tableNumber, isTakeaway, phone, address, turnstileToken } = body;

      // ── Step 2: Validate fields ──────────────────────────
      if (!lat || !lng || !cart?.length)
        return cors({ message: "กรุณาส่งข้อมูลให้ครบ: lat, lng, cart" }, 400);

      if (isTakeaway && !phone)
        return cors({ message: "กรุณาระบุเบอร์โทรศัพท์", ok: false }, 400);

      // ── Step 3: Verify Turnstile ─────────────────────────
      if (!turnstileToken)
        return cors(
          { ok: false, message: "กรุณายืนยันตัวตนก่อนสั่งอาหาร (Turnstile token missing)" },
          400
        );

      const turnstileOk = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET, clientIp);
      if (!turnstileOk) {
        console.error("Turnstile verification failed for IP:", clientIp);
        return cors(
          { ok: false, message: "การยืนยันตัวตนล้มเหลว กรุณาลองใหม่อีกครั้ง" },
          403
        );
      }
      console.log("Turnstile passed ✓ IP:", clientIp);

      // ── Step 4: Geofence ─────────────────────────────────
      const dist = getDistance(lat, lng, SHOP_LAT, SHOP_LNG);
      console.log(`ระยะทาง: ${(dist * 1000).toFixed(0)} ม. | โต๊ะ: ${tableNumber || "takeaway"}`);

      if (dist > RADIUS_KM)
        return cors(
          { ok: false, message: `📍 คุณอยู่ห่างจากร้าน ${Math.round(dist * 1000)} เมตร\nกรุณาสั่งอาหารที่ร้านเท่านั้น 🙏` },
          403
        );

      // ── Step 5: Stripe PaymentIntent ─────────────────────
      if (!env.STRIPE_SECRET_KEY) {
        console.error("Missing STRIPE_SECRET_KEY");
        return cors(
          { ok: false, message: "ระบบชำระเงินยังไม่พร้อม กรุณาแจ้งพนักงาน" },
          500
        );
      }

      const orderId = genOrderId();
      console.log("creating order:", orderId);

      let stripeResult;
      try {
        stripeResult = await createStripePaymentIntent(env.STRIPE_SECRET_KEY, { orderId, total });
      } catch (e) {
        console.error("Stripe PaymentIntent error:", e.message);
        return cors(
          { ok: false, message: "สร้างคำสั่งชำระเงินไม่สำเร็จ กรุณาลองใหม่" },
          502
        );
      }

      const { paymentIntentId, qrImageUrl } = stripeResult;

      // ── Step 6: Save to KV ───────────────────────────────
      await saveOrder(env.ORDERS_KV, orderId, {
        orderId,
        paymentIntentId,
        status:      "pending",
        cart,
        total:       Number(total),
        tableNumber: tableNumber || null,
        isTakeaway:  !!isTakeaway,
        phone:       phone   || null,
        address:     address || null,
        lat,
        lng,
        createdAt:  new Date().toISOString(),
        updatedAt:  new Date().toISOString(),
      });
      console.log("KV saved:", orderId);

      return cors(
        {
          ok: true,
          orderId,
          paymentIntentId,
          qrImageUrl,
          message: `สร้างออร์เดอร์ ${orderId} สำเร็จ รอการชำระเงิน`,
        },
        200,
        rlHeaders  // ส่ง quota header กลับด้วยทุกครั้งที่สำเร็จ
      );
    }

    return cors({ message: "Not found" }, 404);
  },
};