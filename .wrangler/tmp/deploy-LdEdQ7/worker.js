var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var SHOP_LAT = 13.35527;
var SHOP_LNG = 100.98597;
var RADIUS_KM = 0.1;
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = /* @__PURE__ */ __name((deg) => deg * Math.PI / 180, "toRad");
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
__name(getDistance, "getDistance");
function cors(body, status = 200) {
  const responseBody = status === 204 ? null : JSON.stringify(body);
  return new Response(responseBody, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    }
  });
}
__name(cors, "cors");
async function sendLineMessage(token, userId, cart, total, tableNumber) {
  console.log(`\u0E2A\u0E48\u0E07\u0E2D\u0E2D\u0E23\u0E4C\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E42\u0E15\u0E4A\u0E30: ${tableNumber}`);
  if (!token || !userId) {
    console.error("Missing LINE_TOKEN or LINE_USER_ID");
    return false;
  }
  const now = /* @__PURE__ */ new Date();
  const timeThai = now.toLocaleTimeString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit"
  });
  const dateThai = now.toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  const itemRows = cart.map((i) => ({
    type: "box",
    layout: "horizontal",
    spacing: "sm",
    contents: [
      {
        type: "text",
        text: `${i.name}`,
        // ชื่อภาษาไทย
        flex: 4,
        size: "sm",
        color: "#333333",
        wrap: true
      },
      {
        type: "text",
        text: `x${i.qty}`,
        flex: 1,
        size: "sm",
        color: "#888888",
        align: "center"
      },
      {
        type: "text",
        text: `\u0E3F${i.price * i.qty}`,
        flex: 2,
        size: "sm",
        color: "#e67e00",
        weight: "bold",
        align: "end"
      }
    ]
  }));
  const message = {
    to: userId,
    messages: [
      {
        type: "flex",
        altText: `\u{1F6CE}\uFE0F \u0E2D\u0E2D\u0E23\u0E4C\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E43\u0E2B\u0E21\u0E48! \u0E42\u0E15\u0E4A\u0E30 ${tableNumber} \u0E23\u0E27\u0E21\u0E40\u0E07\u0E34\u0E19 ${total} \u0E1A\u0E32\u0E17`,
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
                    text: "\u{1F6CE}\uFE0F \u0E2D\u0E2D\u0E23\u0E4C\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E43\u0E2B\u0E21\u0E48!",
                    color: "#FFD700",
                    weight: "bold",
                    size: "lg",
                    flex: 1
                  },
                  {
                    type: "text",
                    text: `\u0E42\u0E15\u0E4A\u0E30 ${tableNumber}`,
                    color: "#FFD700",
                    weight: "bold",
                    size: "md",
                    align: "end"
                  }
                ]
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
                    flex: 1
                  }
                ]
              }
            ]
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
                color: "#eeeeee"
              },
              {
                type: "box",
                layout: "horizontal",
                margin: "md",
                contents: [
                  {
                    type: "text",
                    text: "\u0E23\u0E27\u0E21\u0E17\u0E31\u0E49\u0E07\u0E2A\u0E34\u0E49\u0E19",
                    weight: "bold",
                    size: "md",
                    color: "#333333",
                    flex: 3
                  },
                  {
                    type: "text",
                    text: `\u0E3F${total}`,
                    weight: "bold",
                    size: "xl",
                    color: "#e67e00",
                    align: "end",
                    flex: 2
                  }
                ]
              }
            ]
          },
          footer: {
            type: "box",
            layout: "vertical",
            paddingAll: "12px",
            backgroundColor: "#f8f8f8",
            contents: [
              {
                type: "text",
                text: "\u{1F64F} \u0E02\u0E2D\u0E1A\u0E04\u0E38\u0E13\u0E17\u0E35\u0E48\u0E2D\u0E38\u0E14\u0E2B\u0E19\u0E38\u0E19 \u0E23\u0E49\u0E32\u0E19\u0E15\u0E34\u0E14\u0E1A\u0E49\u0E32\u0E19",
                color: "#666666",
                size: "xs",
                align: "center"
              }
            ]
          }
        }
      }
    ]
  };
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message)
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`LINE API Error ${res.status}: ${errorText}`);
      return false;
    }
    console.log("\u0E2A\u0E48\u0E07 LINE \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08");
    return true;
  } catch (error) {
    console.error("LINE send error:", error);
    return false;
  }
}
__name(sendLineMessage, "sendLineMessage");
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
__name(sendToGoogleSheet, "sendToGoogleSheet");
var worker_default = {
  async fetch(request, env) {
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
      return cors({ message: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 JSON \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07" }, 400);
    }
    console.log("Request body:", JSON.stringify(body, null, 2));
    const { lat, lng, cart, total, tableNumber } = body;
    if (!lat || !lng || !cart?.length) {
      return cors({
        message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E2A\u0E48\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E2B\u0E49\u0E04\u0E23\u0E1A: lat, lng, cart",
        required: ["lat", "lng", "cart"]
      }, 400);
    }
    const finalTableNumber = tableNumber || "\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E42\u0E15\u0E4A\u0E30";
    const dist = getDistance(lat, lng, SHOP_LAT, SHOP_LNG);
    console.log(`\u0E23\u0E30\u0E22\u0E30\u0E17\u0E32\u0E07: ${dist} km (${Math.round(dist * 1e3)} \u0E21.) - \u0E42\u0E15\u0E4A\u0E30: ${finalTableNumber}`);
    if (dist > RADIUS_KM) {
      const distanceMeters = Math.round(dist * 1e3);
      return cors(
        {
          ok: false,
          message: `\u{1F4CD} \u0E04\u0E38\u0E13\u0E2D\u0E22\u0E39\u0E48\u0E2B\u0E48\u0E32\u0E07\u0E08\u0E32\u0E01\u0E23\u0E49\u0E32\u0E19 ${distanceMeters} \u0E40\u0E21\u0E15\u0E23
\u0E01\u0E23\u0E38\u0E13\u0E32\u0E2A\u0E31\u0E48\u0E07\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E17\u0E35\u0E48\u0E23\u0E49\u0E32\u0E19\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19 \u{1F64F}`
        },
        403
      );
    }
    if (!env.LINE_MESSAGING_TOKEN || !env.LINE_USER_ID) {
      console.error("Missing LINE secrets!");
      return cors(
        { ok: false, message: "\u0E23\u0E30\u0E1A\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E41\u0E08\u0E49\u0E07\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48" },
        500
      );
    }
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

    // === เพิ่มส่วนนี้เข้าไป ===
    if (env.GOOGLE_SHEET_URL) {
      // ใช้ await เพื่อให้บันทึกเสร็จก่อนตอบกลับ หรือถอด await ออกเพื่อให้ระบบทำงานเบื้องหลัง
      await sendToGoogleSheet(env.GOOGLE_SHEET_URL, cart, total, finalTableNumber);
    }
    // =======================

    const successMessage = finalTableNumber === "ไม่ระบุโต๊ะ" ? "ส่งออร์เดอร์เรียบร้อยแล้ว! 🎉" : `ส่งออร์เดอร์โต๊ะ ${finalTableNumber} เรียบร้อยแล้ว! 🎉`;
    
    return cors({
      ok: true,
      message: successMessage,
      distance: Math.round(dist * 1e3),
      table: finalTableNumber
    });
  }
};
export {
  worker_default as default
};