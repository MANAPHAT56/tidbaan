// ============================================================
//  📦 Cloudflare Worker — Geofence + PromptPay QR + LINE
//  Routes:
//    POST /create-order      → ตรวจ GPS, สร้าง order, ส่ง QR payload
//    GET  /payment-status    → ดูสถานะการโอน (polling จาก front-end)
//    POST /payment-webhook   → รับ webhook จากธนาคาร/บริษัท payment
//    OPTIONS *               → CORS preflight
// ============================================================

const SHOP_LAT = 13.355270;
const SHOP_LNG = 100.985970;
const RADIUS_KM = 0.1; // 100 เมตร

// เลขพร้อมเพย์ธนาคารออมสิน (ตั้งค่าผ่าน wrangler secret หรือ env)
// env.PROMPTPAY_ID  เช่น "0812345678"

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

// ─── PromptPay QR payload (EMVCo) ───────────────────────────
function crc16(data) {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

function buildPromptPayPayload(promptPayId, amount) {
  // normalize เบอร์โทร → 0066XXXXXXXX
  let id = promptPayId.replace(/-/g, "").trim();
  if (id.startsWith("0") && id.length === 10) id = "0066" + id.slice(1);
  const aid = "A000000677010111";
  const merchant = `0016${aid}0213${id}`;
  const amountStr = Number(amount).toFixed(2);

  let payload =
    "000201" +
    "010212" +
    `2${String(merchant.length + 4).padStart(2, "0")}${merchant}` +
    "5303764" +
    `54${String(amountStr.length).padStart(2, "0")}${amountStr}` +
    "5802TH" +
    "6304";

  return payload + crc16(payload);
}

// ─── Generate Order ID ───────────────────────────────────────
function genOrderId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

// ─── KV helpers (ใช้ env.ORDERS_KV) ─────────────────────────
async function saveOrder(kv, orderId, data) {
  await kv.put(orderId, JSON.stringify(data), { expirationTtl: 3600 }); // หมดอายุ 1 ชม.
}

async function getOrder(kv, orderId) {
  const raw = await kv.get(orderId);
  return raw ? JSON.parse(raw) : null;
}

async function updateOrderStatus(kv, orderId, status) {
  const order = await getOrder(kv, orderId);
  if (order) {
    order.status = status;
    order.updatedAt = new Date().toISOString();
    await kv.put(orderId, JSON.stringify(order), { expirationTtl: 3600 });
  }
  return order;
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

  // ข้อมูลเพิ่มเติม: โต๊ะ หรือ ที่อยู่/เบอร์
  const metaContents = isTakeaway
    ? [
        { type: "text", text: `📱 ${phone}`, size: "sm", color: "#555555", wrap: true },
        ...(address
          ? [{ type: "text", text: `🏠 ${address}`, size: "sm", color: "#555555", wrap: true }]
          : lat && lng
          ? [{ type: "text", text: `📍 GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, size: "xs", color: "#888888", wrap: true }]
          : []),
      ]
    : [
        { type: "text", text: `📍 โต๊ะ ${tableNumber}`, size: "sm", color: "#e67e00", weight: "bold" },
      ];

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
    // รับ webhook จากธนาคาร / payment gateway
    // ตัวอย่าง payload: { orderId, status: "success"|"fail", ref1, amount }
    if (request.method === "POST" && path === "/payment-webhook") {
      // ตรวจ secret header (กัน request ปลอม)
      const webhookSecret = request.headers.get("x-webhook-secret");
      if (env.WEBHOOK_SECRET && webhookSecret !== env.WEBHOOK_SECRET) {
        return cors({ error: "unauthorized" }, 401);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return cors({ error: "invalid json" }, 400);
      }

      const { orderId, status, amount } = body;
      if (!orderId || !status) return cors({ error: "missing fields" }, 400);

      if (!env.ORDERS_KV) return cors({ error: "KV not configured" }, 500);

      const order = await updateOrderStatus(env.ORDERS_KV, orderId, status);

      if (!order) return cors({ error: "order not found" }, 404);

      // ถ้าโอนสำเร็จ → แจ้ง LINE + บันทึก Sheets
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

      // takeaway ต้องมีเบอร์โทร
      if (isTakeaway && !phone) {
        return cors({ message: "กรุณาระบุเบอร์โทรศัพท์", ok: false }, 400);
      }

      // ตรวจระยะทาง (ต้องอยู่ในร้านทั้ง dine-in และ takeaway)
      const dist = getDistance(lat, lng, SHOP_LAT, SHOP_LNG);
      console.log(`ระยะทาง: ${(dist * 1000).toFixed(0)} ม. | โต๊ะ: ${tableNumber || "takeaway"}`);

      if (dist > RADIUS_KM) {
        return cors(
          { ok: false, message: `📍 คุณอยู่ห่างจากร้าน ${Math.round(dist * 1000)} เมตร\nกรุณาสั่งอาหารที่ร้านเท่านั้น 🙏` },
          403
        );
      }

      // ตรวจ secrets
      if (!env.PROMPTPAY_ID) {
        console.error("Missing PROMPTPAY_ID secret");
        return cors({ ok: false, message: "ระบบชำระเงินยังไม่พร้อม กรุณาแจ้งพนักงาน" }, 500);
      }

      // สร้าง Order ID
      const orderId = genOrderId();

      // สร้าง PromptPay QR payload
      const qrPayload = buildPromptPayPayload(env.PROMPTPAY_ID, Number(total));

      // เก็บ order ลง KV (ถ้ามี)
      if (env.ORDERS_KV) {
        const orderData = {
          orderId,
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
        qrPayload,
        message: `สร้างออร์เดอร์ ${orderId} สำเร็จ รอการชำระเงิน`,
      });
    }

    return cors({ message: "Not found" }, 404);
  },
};