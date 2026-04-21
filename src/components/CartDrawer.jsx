import { useApp } from "../hooks/useApp";

export default function CartDrawer({ cart, total, addToCart, removeFromCart, onClose, ordered, setOrdered }) {
  const { lang, baseFontSize } = useApp();

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
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
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
              transition: "all 0.2s",
            }}
          >
            ✕
          </button>
        </div>

        {ordered ? (
          <div style={{ textAlign: "center", padding: "60px 0", flex: 1 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <h4 style={{ fontWeight: 800, fontSize: baseFontSize + 8, color: "var(--text)", fontFamily: "'Mitr', sans-serif", marginBottom: 8 }}>
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
                  {/* Color swatch */}
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
                    <div style={{ fontWeight: 700, fontSize: baseFontSize - 1, color: "var(--text)", fontFamily: "'Mitr', sans-serif", lineHeight: 1.3 }}>
                      {lang === "th" ? item.name : item.nameEn}
                    </div>
                    <div style={{ fontSize: baseFontSize - 2, color: "var(--amber)", fontWeight: 700, fontFamily: "'Mitr', sans-serif" }}>
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
                    <span style={{ fontWeight: 800, minWidth: 24, textAlign: "center", fontSize: baseFontSize, color: "var(--text)", fontFamily: "'Mitr', sans-serif" }}>
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

            <div style={{ borderTop: "2px dashed var(--divider)", paddingTop: 20, marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ fontWeight: 700, fontSize: baseFontSize + 2, color: "var(--text)", fontFamily: "'Mitr', sans-serif" }}>
                  {lang === "th" ? "รวมทั้งหมด" : "Total"}
                </span>
                <span style={{ fontWeight: 900, fontSize: baseFontSize + 6, color: "var(--amber)", fontFamily: "'Mitr', sans-serif" }}>
                  ฿{total}
                </span>
              </div>
              <button
                onClick={() => setOrdered(true)}
                style={{
                  background: "var(--navBg)",
                  color: "var(--goldBright)",
                  border: "none",
                  width: "100%",
                  padding: baseFontSize > 18 ? "18px" : "14px",
                  borderRadius: 16,
                  fontFamily: "'Mitr', sans-serif",
                  fontSize: baseFontSize + 2,
                  fontWeight: 800,
                  cursor: "pointer",
                  transition: "opacity 0.2s",
                  letterSpacing: 0.5,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                {lang === "th" ? `สั่งอาหาร ฿${total}` : `Place Order ฿${total}`} →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
