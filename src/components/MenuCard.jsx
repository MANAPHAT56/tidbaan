import { useState } from "react";
import { useApp } from "../hooks/useApp";

function SpicyIndicator({ level }) {
  return (
    <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: i < level ? "#ef4444" : "var(--border)",
            transition: "background 0.2s",
          }}
        />
      ))}
    </div>
  );
}

export default function MenuCard({ item, addToCart, small = false, onClick }) {
  const [added, setAdded] = useState(false);
  const { lang, t, baseFontSize } = useApp();

  const handleAdd = (e) => {
    e.stopPropagation();
    addToCart(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 900);
  };

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface)",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 2px 16px var(--shadow)",
        border: "1px solid var(--border)",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.22s cubic-bezier(.34,1.56,.64,1), box-shadow 0.22s",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-5px)";
        e.currentTarget.style.boxShadow = "0 12px 36px var(--shadowDeep)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 16px var(--shadow)";
      }}
    >
      {/* Image / Placeholder */}
      <div
        style={{
          height: small ? 88 : 140,
          background: `linear-gradient(135deg, ${item.gradientFrom}, ${item.gradientTo})`,
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {item.imageSrc ? (
          <img
            src={item.imageSrc}
            alt={t({ th: item.name, en: item.nameEn })}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          /* Decorative plate SVG placeholder */
          <svg
            viewBox="0 0 200 140"
            style={{ width: "100%", height: "100%", opacity: 0.25 }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="100" cy="70" r="48" fill="rgba(255,255,255,0.5)" />
            <circle cx="100" cy="70" r="36" fill="rgba(255,255,255,0.3)" />
            <circle cx="100" cy="70" r="20" fill="rgba(255,255,255,0.4)" />
          </svg>
        )}

        {/* Tag badge */}
        {item.tag && (
          <span
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              background: "var(--badgeBg)",
              color: "var(--badgeText)",
              fontSize: baseFontSize - 4,
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: 100,
              fontFamily: "'Mitr', sans-serif",
              letterSpacing: 0.3,
            }}
          >
            {lang === "th" ? item.tag : item.tagEn}
          </span>
        )}

        {/* Price pill overlay */}
        <span
          style={{
            position: "absolute",
            bottom: 10,
            right: 10,
            background: "rgba(28,16,8,0.78)",
            color: "#f5c842",
            fontSize: baseFontSize,
            fontWeight: 800,
            padding: "4px 12px",
            borderRadius: 100,
            fontFamily: "'Mitr', sans-serif",
            backdropFilter: "blur(4px)",
          }}
        >
          ฿{item.price}
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: small ? "12px 14px" : "16px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: small ? baseFontSize - 1 : baseFontSize + 1,
            marginBottom: 2,
            color: "var(--text)",
            fontFamily: "'Mitr', sans-serif",
            lineHeight: 1.3,
          }}
        >
          {lang === "th" ? item.name : item.nameEn}
        </div>

        {!small && (
          <div
            style={{
              fontSize: baseFontSize - 3,
              color: "var(--text3)",
              marginBottom: 10,
              lineHeight: 1.6,
              flex: 1,
            }}
          >
            {lang === "th" ? item.desc : item.descEn}
          </div>
        )}

        {item.spicy > 0 && <SpicyIndicator level={item.spicy} />}

        <button
          onClick={handleAdd}
          style={{
            background: added ? "#16a34a" : "var(--navBg)",
            color: added ? "#fff" : "var(--goldBright)",
            border: "none",
            borderRadius: 12,
            padding: `${baseFontSize > 18 ? "10px" : "8px"} 0`,
            width: "100%",
            fontFamily: "'Mitr', sans-serif",
            fontSize: baseFontSize - 2,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
            marginTop: small ? 8 : 0,
            letterSpacing: 0.3,
          }}
        >
          {added
            ? lang === "th"
              ? "✓ เพิ่มแล้ว"
              : "✓ Added!"
            : lang === "th"
              ? "+ ใส่ตะกร้า"
              : "+ Add to Cart"}
        </button>
      </div>
    </div>
  );
}
