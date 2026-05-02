// ============================================================
//  📦 Cloudflare Worker — Geofence + LINE + Google Sheets + Table Number
// ============================================================

const SHOP_LAT = 13.355270;
const SHOP_LNG = 100.985970;
const RADIUS_KM = 0.1; // 100 เมตร

// ─── Haversine ──────────────────────────────────────────────
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── CORS ───────────────────────────────────────────────────
function cors(body, status = 200) {
  const responseBody = status === 204 ? null : JSON.stringify(body);
  
  return new Response(responseBody, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// ─── Google Sheets ──────────────────────────────────────────
async function sendToGoogleSheet(sheetUrl, cart, total, tableNumber) {
  try {
    const payload = {
      cart: cart,
      total: total,
      table: tableNumber
    };
    
    await fetch(sheetUrl, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    console.log("บันทึกลง Google Sheets สำเร็จ");
  } catch (error) {
    console.error("Google Sheets error:", error);
  }
}

// ─── LINE Flex Message (ภาษาไทยล้วน) ──────────────────────
async function sendLineMessage(token, userId, cart, total, tableNumber) {
  console.log(`ส่งออร์เดอร์โต๊ะ: ${tableNumber}`);
  
  if (!token || !userId) {
    console.error("Missing LINE_TOKEN or LINE_USER_ID");
    return false;
  }

  const now = new Date();
  const timeThai = now.toLocaleTimeString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  });
  
  const dateThai = now.toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // แปลงรายการอาหารเป็นภาษาไทย
  const itemRows = cart.map((i) => ({
    type: "box",
    layout: "horizontal",
    spacing: "sm",
    contents: [
      {
        type: "text",
        text: `${i.name}`, // ชื่อภาษาไทย
        flex: 4,
        size: "sm",
        color: "#333333",
        wrap: true,
      },
      {
        type: "text",
        text: `x${i.qty}`,
        flex: 1,
        size: "sm",
        color: "#888888",
        align: "center",
      },
      {
        type: "text",
        text: `฿${i.price * i.qty}`,
        flex: 2,
        size: "sm",
        color: "#e67e00",
        weight: "bold",
        align: "end",
      },
    ],
  }));

  const message = {
    to: userId,
    messages: [
      {
        type: "flex",
        altText: `🛎️ ออร์เดอร์ใหม่! โต๊ะ ${tableNumber} รวมเงิน ${total} บาท`,
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
                  {
                    type: "text",
                    text: "🛎️ ออร์เดอร์ใหม่!",
                    color: "#FFD700",
                    weight: "bold",
                    size: "lg",
                    flex: 1,
                  },
                  {
                    type: "text",
                    text: `โต๊ะ ${tableNumber}`,
                    color: "#FFD700",
                    weight: "bold",
                    size: "md",
                    align: "end",
                  },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                margin: "xs",
                contents: [
                  {
                    type: "text",
                    text: ` ${dateThai}  ${timeThai}`,
                    color: "#aaaaaa",
                    size: "xs",
                    flex: 1,
                  },
                ],
              },
            ],
          },
          body: {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            paddingAll: "16px",
            contents: [
              ...itemRows,
              {
                type: "separator",
                margin: "md",
                color: "#eeeeee",
              },
              {
                type: "box",
                layout: "horizontal",
                margin: "md",
                contents: [
                  {
                    type: "text",
                    text: "รวมทั้งสิ้น",
                    weight: "bold",
                    size: "md",
                    color: "#333333",
                    flex: 3,
                  },
                  {
                    type: "text",
                    text: `฿${total}`,
                    weight: "bold",
                    size: "xl",
                    color: "#e67e00",
                    align: "end",
                    flex: 2,
                  },
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
              {
                type: "text",
                text: "🙏 ขอบคุณที่อุดหนุน ร้านติดบ้าน",
                color: "#666666",
                size: "xs",
                align: "center",
              },
            ],
          },
        },
      },
    ],
  };

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`LINE API Error ${res.status}: ${errorText}`);
      return false;
    }
    
    console.log("ส่ง LINE สำเร็จ");
    return true;
  } catch (error) {
    console.error("LINE send error:", error);
    return false;
  }
}

// ─── Main handler ────────────────────────────────────────────
export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return cors(null, 204);
    }
    
    if (request.method !== "POST") {
      return cors({ message: "Method not allowed" }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return cors({ message: "ข้อมูล JSON ไม่ถูกต้อง" }, 400);
    }

    console.log("Request body:", JSON.stringify(body, null, 2));

    // รับค่า tableNumber
    const { lat, lng, cart, total, tableNumber } = body;

    if (!lat || !lng || !cart?.length) {
      return cors({ 
        message: "กรุณาส่งข้อมูลให้ครบ: lat, lng, cart",
        required: ["lat", "lng", "cart"]
      }, 400);
    }

    // ถ้าไม่มี tableNumber ให้ใช้ "ไม่ระบุโต๊ะ"
    const finalTableNumber = tableNumber || "ไม่ระบุโต๊ะ";

    // ตรวจสอบระยะทาง
    const dist = getDistance(lat, lng, SHOP_LAT, SHOP_LNG);
    console.log(`ระยะทาง: ${dist} km (${Math.round(dist * 1000)} ม.) - โต๊ะ: ${finalTableNumber}`);
    
    // RADIUS_KM = 0.1 = 100 เมตร
    if (dist > RADIUS_KM) {
      const distanceMeters = Math.round(dist * 1000);
      return cors(
        {
          ok: false,
          message: `📍 คุณอยู่ห่างจากร้าน ${distanceMeters} เมตร\nกรุณาสั่งอาหารที่ร้านเท่านั้น 🙏`,
        },
        403
      );
    }

    // ตรวจสอบ secrets
    if (!env.LINE_MESSAGING_TOKEN || !env.LINE_USER_ID) {
      console.error("Missing LINE secrets!");
      return cors(
        { ok: false, message: "ระบบส่งข้อความยังไม่พร้อม กรุณาแจ้งเจ้าหน้าที่" },
        500
      );
    }

    // ส่ง LINE message
    const sent = await sendLineMessage(
      env.LINE_MESSAGING_TOKEN,
      env.LINE_USER_ID,
      cart,
      total,
      finalTableNumber
    );

    if (!sent) {
      return cors({ 
        ok: false, 
        message: "ไม่สามารถส่งข้อความแจ้งเตือนได้ กรุณาลองใหม่" 
      }, 502);
    }

    // ─── ส่งข้อมูลไป Google Sheets (ถ้าตั้งค่า URL ไว้) ───
    if (env.GOOGLE_SHEET_URL) {
      await sendToGoogleSheet(env.GOOGLE_SHEET_URL, cart, total, finalTableNumber);
    }

    // สำเร็จ
    const successMessage = finalTableNumber === "ไม่ระบุโต๊ะ"
      ? "ส่งออร์เดอร์เรียบร้อยแล้ว! 🎉"
      : `ส่งออร์เดอร์โต๊ะ ${finalTableNumber} เรียบร้อยแล้ว! 🎉`;

    return cors({ 
      ok: true, 
      message: successMessage,
      distance: Math.round(dist * 1000),
      table: finalTableNumber
    });
  },
};