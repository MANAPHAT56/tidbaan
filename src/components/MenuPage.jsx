import { useState } from "react";
import { useApp } from "../hooks/useApp";
import MenuCard from "./MenuCard";

export default function MenuPage({ menu, addToCart, onItemClick }) {
  const { lang, baseFontSize } = useApp();
  const [filter, setFilter] = useState("all");

  const categories = [
    { key: "all", th: "ทั้งหมด", en: "All" },
    { key: "recommended", th: "เมนูหลัก", en: "Main" },
    { key: "extras", th: "เพิ่มเติม", en: "Add-ons" },
  ];

  return (
    <div style={{ padding: "44px 24px 64px", maxWidth: 980, margin: "0 auto" }}>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontSize: baseFontSize + 16,
            fontWeight: 900,
            margin: "0 0 6px",
            color: "var(--text)",
            fontFamily: "'Mitr', sans-serif",
          }}
        >
          {lang === "th" ? "เมนูทั้งหมด" : "Full Menu"}
        </h2>
        <div style={{ width: 48, height: 3, background: "var(--goldBright)", borderRadius: 4, marginBottom: 8 }} />
        <p style={{ color: "var(--text3)", fontFamily: "'Sarabun', sans-serif", fontSize: baseFontSize - 1 }}>
          {lang === "th" ? "เลือกได้ตามใจ ทำสดทุกจาน" : "Made fresh to order, every dish."}
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 36, flexWrap: "wrap" }}>
        {categories.map(({ key, th, en }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              background: filter === key ? "var(--navBg)" : "var(--surface)",
              color: filter === key ? "var(--goldBright)" : "var(--text2)",
              border: `1px solid ${filter === key ? "transparent" : "var(--border)"}`,
              padding: `${baseFontSize > 18 ? "12px 28px" : "9px 22px"}`,
              borderRadius: 100,
              fontFamily: "'Mitr', sans-serif",
              fontSize: baseFontSize - 1,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {lang === "th" ? th : en}
          </button>
        ))}
      </div>

      {/* Main dishes */}
      {(filter === "all" || filter === "recommended") && (
        <div style={{ marginBottom: 48 }}>
          <h3
            style={{
              fontSize: baseFontSize + 4,
              fontWeight: 800,
              marginBottom: 20,
              color: "var(--text)",
              fontFamily: "'Mitr', sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 24,
                background: "var(--goldBright)",
                borderRadius: 4,
              }}
            />
            {lang === "th" ? "เมนูหลัก" : "Main Dishes"}
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))",
              gap: 20,
            }}
          >
            {menu.recommended.map((item) => (
              <MenuCard
                key={item.id}
                item={item}
                addToCart={addToCart}
                onClick={() => onItemClick(item)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add-ons */}
      {(filter === "all" || filter === "extras") && (
        <div>
          <h3
            style={{
              fontSize: baseFontSize + 4,
              fontWeight: 800,
              marginBottom: 20,
              color: "var(--text)",
              fontFamily: "'Mitr', sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 24,
                background: "var(--goldBright)",
                borderRadius: 4,
              }}
            />
            {lang === "th" ? "เพิ่มเติม" : "Add-ons"}
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 16,
            }}
          >
            {menu.extras.map((item) => (
              <MenuCard
                key={item.id}
                item={item}
                addToCart={addToCart}
                small
                onClick={() => onItemClick(item)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
