import { useApp } from "../hooks/useApp";

export default function ItemModal({ item, onClose, addToCart }) {
  const { lang, t, baseFontSize } = useApp();
  if (!item) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: "var(--surface)",
          borderRadius: 28,
          maxWidth: 480,
          width: "100%",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          animation: "modalIn 0.25s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.92) translateY(16px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>

        {/* Image */}
        <div
          style={{
            height: 220,
            background: `linear-gradient(135deg, ${item.gradientFrom}, ${item.gradientTo})`,
            position: "relative",
          }}
        >
          {item.imageSrc && (
            <img
              src={item.imageSrc}
              alt={item.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
          {item.tag && (
            <span
              style={{
                position: "absolute",
                top: 14,
                left: 14,
                background: "#dc2626",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                padding: "4px 12px",
                borderRadius: 100,
                fontFamily: "'Mitr', sans-serif",
              }}
            >
              {lang === "th" ? item.tag : item.tagEn}
            </span>
          )}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              background: "rgba(28,16,8,0.6)",
              color: "#fff",
              border: "none",
              borderRadius: "50%",
              width: 36,
              height: 36,
              cursor: "pointer",
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(4px)",
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "24px 28px 28px" }}>
          <div
            style={{
              fontFamily: "'Mitr', sans-serif",
              fontSize: baseFontSize + 6,
              fontWeight: 700,
              color: "var(--text)",
              marginBottom: 4,
              lineHeight: 1.2,
            }}
          >
            {lang === "th" ? item.name : item.nameEn}
          </div>
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: baseFontSize - 2,
              color: "var(--text3)",
              marginBottom: 16,
              fontStyle: "italic",
            }}
          >
            {lang === "th" ? item.nameEn : item.name}
          </div>

          {item.spicy > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: baseFontSize - 3, color: "var(--text3)", fontFamily: "'Mitr', sans-serif" }}>
                {lang === "th" ? "ระดับความเผ็ด" : "Spice Level"}:
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                {Array.from({ length: 4 }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: i < item.spicy ? "#ef4444" : "var(--border)",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <p
            style={{
              fontSize: baseFontSize - 1,
              color: "var(--text2)",
              lineHeight: 1.8,
              marginBottom: 24,
              fontFamily: "'Sarabun', sans-serif",
            }}
          >
            {lang === "th" ? item.desc : item.descEn}
          </p>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span
              style={{
                fontFamily: "'Mitr', sans-serif",
                fontSize: baseFontSize + 10,
                fontWeight: 800,
                color: "var(--amber)",
              }}
            >
              ฿{item.price}
            </span>
            <button
              onClick={() => { addToCart(item); onClose(); }}
              style={{
                background: "var(--navBg)",
                color: "var(--goldBright)",
                border: "none",
                padding: `${baseFontSize > 18 ? "14px 32px" : "12px 28px"}`,
                borderRadius: 14,
                fontFamily: "'Mitr', sans-serif",
                fontSize: baseFontSize,
                fontWeight: 700,
                cursor: "pointer",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              {lang === "th" ? "+ ใส่ตะกร้า" : "+ Add to Cart"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
