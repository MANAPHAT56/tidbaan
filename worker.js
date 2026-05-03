// ============================================================
//  📦 Cloudflare Worker — Geofence + Omise PromptPay + LINE
//  Routes:
//    POST /create-order      → ตรวจ GPS, สร้าง order + Omise charge
//    GET  /payment-status    → ดูสถานะการโอน (polling จาก front-end)
//    POST /payment-webhook   → รับ webhook จาก Omise หรือ payment gateway อื่น
//    OPTIONS *               → CORS preflight
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

// ─── Omise: สร้าง PromptPay charge ──────────────────────────
async function createOmiseCharge(secretKey, { orderId, total, returnUri }) {
  const res = await fetch("https://api.omise.co/charges", {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(secretKey + ":"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(Number(total) * 100), // บาท → สตางค์
      currency: "thb",
      source: { type: "promptpay" },
      metadata: { orderId },           // ✅ สำคัญ: ใช้ดึง orderId ตอน webhook
      return_uri: returnUri || "https://your-app.com/payment-result",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Omise error ${res.status}: ${err.message || "unknown"}`);
  }

  return res.json();
}

// ─── Omise: verify webhook signature ────────────────────────
// Omise ส่ง HMAC-SHA1 ใน header x-omise-signature
// ถ้าไม่มี OMISE_WEBHOOK_SECRET ใน env → ข้ามการ verify (dev mode)
async function verifyOmiseSignature(secret, rawBody, signature) {
  if (!secret) return true; // ไม่มี secret → ข้าม (ควรตั้งใน production)
  if (!signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hex === signature;
}

// ─── Google Sheets ───────────────────────────────────────────
async function sendToGoogleSheet(sheetUrl, order) {
  try {
    await fetch(sheetUrl, {
      method: "POST",
      body: JSON.stringify(order),
    });
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
              {
                type: "text",
                text: `${dateThai}  ${timeThai}  #${orderId}`,
                color: "#aaaaaa",
                size: "xs",
                margin: "xs",
              },
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
    if (!res.ok) {
      console.error(`LINE error ${res.status}: ${await res.text()}`);
      return false;
    }
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

    // CORS preflight
    if (request.method === "OPTIONS") return cors(null, 204);

    // ── GET /payment-status?orderId=XXX ─────────────────────
    if (request.method === "GET" && path === "/payment-status") {
      const orderId = url.searchParams.get("orderId");
      if (!orderId) return cors({ error: "missing orderId" }, 400);
      if (!env.ORDERS_KV) return cors({ status: "unknown", error: "KV not configured" }, 500);

      const order = await getOrder(env.ORDERS_KV, orderId);
      if (!order) return cors({ status: "not_found" }, 404);

      return cors({ status: order.status, orderId, updatedAt: order.updatedAt });
    }

    // ── POST /payment-webhook ────────────────────────────────
    if (request.method === "POST" && path === "/payment-webhook") {
      // อ่าน raw body ก่อน (ต้องใช้สำหรับ verify signature)
      const rawBody = await request.text();
      let body;
      try {
        body = JSON.parse(rawBody);
      } catch {
        return cors({ error: "invalid json" }, 400);
      }

      // ════ Omise webhook ════════════════════════════════════
      if (body.object === "event" && typeof body.type === "string" && body.type.startsWith("charge.")) {
        // verify Omise signature
        const omiseSig = request.headers.get("x-omise-signature");
        const valid = await verifyOmiseSignature(env.OMISE_WEBHOOK_SECRET, rawBody, omiseSig);
        if (!valid) {
          console.error("Omise signature mismatch");
          return cors({ error: "invalid signature" }, 401);
        }

        const charge = body.data;
        const orderId = charge?.metadata?.orderId;

        if (!orderId) {
          console.error("Omise webhook: missing orderId in metadata");
          return cors({ error: "missing orderId in metadata" }, 400);
        }

        if (!env.ORDERS_KV) return cors({ error: "KV not configured" }, 500);

        // แปลง Omise event → status ของเรา
        let status = "pending";
        if (body.type === "charge.complete" && charge.status === "successful") {
          status = "success";
        } else if (charge.status === "failed" || charge.status === "expired") {
          status = "failed";
        }

        const order = await updateOrderStatus(env.ORDERS_KV, orderId, status, {
          chargeId: charge.id,
          omiseStatus: charge.status,
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

      // ════ Generic webhook (เดิม) ═══════════════════════════
      const webhookSecret = request.headers.get("x-webhook-secret");
      if (env.WEBHOOK_SECRET && webhookSecret !== env.WEBHOOK_SECRET) {
        return cors({ error: "unauthorized" }, 401);
      }

      const { orderId, status, amount } = body;
      if (!orderId || !status) return cors({ error: "missing fields" }, 400);
      if (!env.ORDERS_KV) return cors({ error: "KV not configured" }, 500);

      const order = await updateOrderStatus(env.ORDERS_KV, orderId, status);
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
      try {
        body = await request.json();
      } catch {
        return cors({ message: "ข้อมูล JSON ไม่ถูกต้อง" }, 400);
      }

      const { lat, lng, cart, total, tableNumber, isTakeaway, phone, address } = body;

      if (!lat || !lng || !cart?.length) {
        return cors({ message: "กรุณาส่งข้อมูลให้ครบ: lat, lng, cart", required: ["lat", "lng", "cart"] }, 400);
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

      if (!env.OMISE_SECRET_KEY) {
        console.error("Missing OMISE_SECRET_KEY");
        return cors({ ok: false, message: "ระบบชำระเงินยังไม่พร้อม กรุณาแจ้งพนักงาน" }, 500);
      }

      // สร้าง Order ID
      const orderId = genOrderId();

      // สร้าง Omise charge (PromptPay)
      let chargeResult;
      try {
        chargeResult = await createOmiseCharge(env.OMISE_SECRET_KEY, {
          orderId,
          total,
          returnUri: env.RETURN_URI || "https://your-app.com/payment-result",
        });
      } catch (e) {
        console.error("Omise charge error:", e.message);
        return cors({ ok: false, message: "สร้างคำสั่งชำระเงินไม่สำเร็จ กรุณาลองใหม่" }, 502);
      }

      // ดึง QR image URL จาก Omise response
      const qrImageUrl = chargeResult?.source?.scannable_code?.image?.download_uri || null;
      const chargeId = chargeResult?.id || null;

      // บันทึก order ลง KV
      if (env.ORDERS_KV) {
        const orderData = {
          orderId,
          chargeId,
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
        };
        await saveOrder(env.ORDERS_KV, orderId, orderData);
      }

      return cors({
        ok: true,
        orderId,
        chargeId,
        qrImageUrl,   // URL ภาพ QR จาก Omise (ใช้ <img src="..."> ตรงๆ ได้เลย)
        message: `สร้างออร์เดอร์ ${orderId} สำเร็จ รอการชำระเงิน`,
      });
    }

    return cors({ message: "Not found" }, 404);
  },
};