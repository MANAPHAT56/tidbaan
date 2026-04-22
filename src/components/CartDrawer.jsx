import { useState, useEffect } from "react";
import { useApp } from "../hooks/useApp";

// 🔧 เปลี่ยน URL นี้หลัง wrangler deploy
const WORKER_URL = "https://food-order-worker.ttpho5874.workers.dev";

export default function CartDrawer({
  cart,
  total,
  addToCart,
  removeFromCart,
  onClose,
  ordered,
  setOrdered,
}) {
  const { lang, baseFontSize } = useApp();
  const [checking, setChecking] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [tableNumber, setTableNumber] = useState(null);

  // ✅ อ่านค่าโต๊ะจาก URL ตอน component โหลด
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const table = urlParams.get('table');
    if (table && !isNaN(table) && table > 0 && table <= 20) {
      setTableNumber(table);
      // เก็บไว้ใน localStorage เผื่อใช้ครั้งต่อไป
      localStorage.setItem('currentTable', table);
    } else {
      // เช็ค localStorage ว่ามีค่าเก่าหรือไม่
      const savedTable = localStorage.getItem('currentTable');
      if (savedTable && !isNaN(savedTable)) {
        setTableNumber(savedTable);
      }
    }
  }, []);

  async function handleOrder() {
    setChecking(true);
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError("เบราว์เซอร์นี้ไม่รองรับ Location");
      setChecking(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          // ✅ สร้าง payload ส่ง tableNumber ไปด้วย
          const payload = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            cart: cart.map(item => ({
              id: item.id,
              name: item.name,
              nameEn: item.nameEn,
              price: item.price,
              qty: item.qty,
            })),
            total: total,
            tableNumber: tableNumber // ส่งเลขโต๊ะ (อาจเป็น null)
          };

          const res = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const data = await res.json();

          if (res.ok && data.ok) {
            setOrdered(true);
          } else {
            setGeoError(data.message || "เกิดข้อผิดพลาด");
          }
        } catch (err) {
          console.error(err);
          setGeoError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
        } finally {
          setChecking(false);
        }
      },
      (err) => {
        setChecking(false);
        const msgs = {
          1: "กรุณาอนุญาตการเข้าถึงตำแหน่ง แล้วลองใหม่",
          2: "ไม่พบสัญญาณ GPS กรุณาลองใหม่",
          3: "หมดเวลา กรุณาลองใหม่",
        };
        setGeoError(msgs[err.code] || "เกิดข้อผิดพลาดกับ GPS");
      },
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
    );
  }

  // ส่วน JSX ที่เหลือเหมือนเดิม แต่เพิ่มแสดงเลขโต๊ะใน header
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ flex: 1, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div
        style={{
          width: 400,
          maxWidth: "100vw",
          background: "var(--drawerBg)",
          height: "100%",
          overflow: "auto",
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-8px 0 48px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header - เพิ่มแสดงเลขโต๊ะ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h3
              style={{
                fontSize: baseFontSize + 6,
                fontWeight: 800,
                margin: 0,
                color: "var(--text)",
                fontFamily: "'Mitr', sans-serif",
              }}
            >
              {lang === "th" ? "🛒 ตะกร้า" : "🛒 Your Cart"}
            </h3>
            {tableNumber && (
              <div
                style={{
                  fontSize: baseFontSize - 2,
                  color: "var(--amber)",
                  fontWeight: 600,
                  marginTop: 4,
                  fontFamily: "'Mitr', sans-serif",
                }}
              >
                📍 {lang === "th" ? `โต๊ะ ${tableNumber}` : `Table ${tableNumber}`}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: "50%",
              width: 38,
              height: 38,
              cursor: "pointer",
              fontSize: 18,
              color: "var(--text2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Ordered state ── */}
        {ordered ? (
          <div style={{ textAlign: "center", padding: "60px 0", flex: 1 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <h4
              style={{
                fontWeight: 800,
                fontSize: baseFontSize + 8,
                color: "var(--text)",
                fontFamily: "'Mitr', sans-serif",
                marginBottom: 8,
              }}
            >
              {lang === "th" ? "สั่งเรียบร้อยแล้ว!" : "Order Placed!"}
            </h4>
            <p style={{ color: "var(--text3)", fontSize: baseFontSize, fontFamily: "'Sarabun', sans-serif" }}>
              {lang === "th" ? "รอรับอาหารได้เลยค่ะ" : "Your food is being prepared."}
            </p>
            <button
              onClick={() => { setOrdered(false); onClose(); }}
              style={{
                marginTop: 28,
                background: "var(--navBg)",
                color: "var(--goldBright)",
                border: "none",
                padding: "14px 36px",
                borderRadius: 14,
                fontFamily: "'Mitr', sans-serif",
                fontSize: baseFontSize,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {lang === "th" ? "ปิด" : "Close"}
            </button>
          </div>

        /* ── Empty cart ── */
        ) : cart.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", flex: 1, color: "var(--text3)" }}>
            <div style={{ fontSize: 52, marginBottom: 16, opacity: 0.5 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 64, margin: "0 auto", display: "block" }}>
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
            <p style={{ fontWeight: 600, fontSize: baseFontSize, fontFamily: "'Mitr', sans-serif" }}>
              {lang === "th" ? "ยังไม่มีรายการในตะกร้า" : "Your cart is empty"}
            </p>
          </div>

        /* ── Cart items ── */
        ) : (
          <>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {cart.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "var(--surface)",
                    borderRadius: 16,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: `linear-gradient(135deg, ${item.gradientFrom}, ${item.gradientTo})`,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: baseFontSize - 1,
                        color: "var(--text)",
                        fontFamily: "'Mitr', sans-serif",
                        lineHeight: 1.3,
                      }}
                    >
                      {lang === "th" ? item.name : item.nameEn}
                    </div>
                    <div
                      style={{
                        fontSize: baseFontSize - 2,
                        color: "var(--amber)",
                        fontWeight: 700,
                        fontFamily: "'Mitr', sans-serif",
                      }}
                    >
                      ฿{item.price} × {item.qty} = ฿{item.price * item.qty}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      style={{
                        background: "var(--bg2)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        width: 30,
                        height: 30,
                        cursor: "pointer",
                        fontWeight: 800,
                        fontSize: 18,
                        color: "var(--text2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      −
                    </button>
                    <span
                      style={{
                        fontWeight: 800,
                        minWidth: 24,
                        textAlign: "center",
                        fontSize: baseFontSize,
                        color: "var(--text)",
                        fontFamily: "'Mitr', sans-serif",
                      }}
                    >
                      {item.qty}
                    </span>
                    <button
                      onClick={() => addToCart(item)}
                      style={{
                        background: "var(--navBg)",
                        color: "var(--goldBright)",
                        border: "none",
                        borderRadius: 8,
                        width: 30,
                        height: 30,
                        cursor: "pointer",
                        fontWeight: 800,
                        fontSize: 18,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Total + Order button ── */}
            <div style={{ borderTop: "2px dashed var(--divider)", paddingTop: 20, marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: baseFontSize + 2,
                    color: "var(--text)",
                    fontFamily: "'Mitr', sans-serif",
                  }}
                >
                  {lang === "th" ? "รวมทั้งหมด" : "Total"}
                </span>
                <span
                  style={{
                    fontWeight: 900,
                    fontSize: baseFontSize + 6,
                    color: "var(--amber)",
                    fontFamily: "'Mitr', sans-serif",
                  }}
                >
                  ฿{total}
                </span>
              </div>

              {/* GPS / Network error */}
              {geoError && (
                <div
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    marginBottom: 12,
                    fontSize: baseFontSize - 2,
                    color: "#ef4444",
                    fontFamily: "'Sarabun', sans-serif",
                    lineHeight: 1.5,
                    whiteSpace: "pre-line",
                  }}
                >
                  {geoError}
                </div>
              )}

              <button
                onClick={handleOrder}
                disabled={checking}
                style={{
                  background: checking ? "var(--bg2)" : "var(--navBg)",
                  color: checking ? "var(--text3)" : "var(--goldBright)",
                  border: "none",
                  width: "100%",
                  padding: baseFontSize > 18 ? "18px" : "14px",
                  borderRadius: 16,
                  fontFamily: "'Mitr', sans-serif",
                  fontSize: baseFontSize + 2,
                  fontWeight: 800,
                  cursor: checking ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  letterSpacing: 0.5,
                  opacity: checking ? 0.7 : 1,
                }}
                onMouseEnter={(e) => { if (!checking) e.currentTarget.style.opacity = "0.85"; }}
                onMouseLeave={(e) => { if (!checking) e.currentTarget.style.opacity = "1"; }}
              >
                {checking
                  ? (lang === "th" ? "⏳ กำลังตรวจสอบตำแหน่ง..." : "⏳ Checking location...")
                  : (lang === "th" ? `สั่งอาหาร ฿${total}` : `Place Order ฿${total}`) + " →"}
              </button>

              <p
                style={{
                  textAlign: "center",
                  fontSize: baseFontSize - 3,
                  color: "var(--text3)",
                  marginTop: 10,
                  fontFamily: "'Sarabun', sans-serif",
                }}
              >
                📍 {lang === "th" ? "ต้องอยู่ในบริเวณร้านเพื่อสั่งอาหาร" : "Must be at the restaurant to order"}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}