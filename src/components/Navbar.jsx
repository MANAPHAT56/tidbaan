import { useState } from "react";
import { useApp } from "../hooks/useApp";

const LOGO_SRC = "/logo.png";

export default function Navbar({ page, setPage, cartCount, onCartOpen }) {
  const { lang, setLang, theme, setTheme, fontSize, setFontSize, t, baseFontSize } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false); // เพิ่ม State คุม Dropdown ตัวอักษร

  const navItems = [
    { key: "home", label: { th: "หน้าแรก", en: "Home" } },
    { key: "menu", label: { th: "เมนู", en: "Menu" } },
    { key: "about", label: { th: "เกี่ยวกับเรา", en: "About" } },
  ];

  const handleNavigation = (key) => {
    setPage(key);
    setIsMobileMenuOpen(false);
  };

  // ตัวเลือกขนาดตัวอักษรสำหรับ Dropdown
  const fontOptions = [
    { id: "normal", label: lang === "th" ? "ปกติ" : "Normal", previewSize: 14 },
    { id: "large", label: lang === "th" ? "ใหญ่" : "Large", previewSize: 16 },
    { id: "xlarge", label: lang === "th" ? "ใหญ่มาก" : "X-Large", previewSize: 18 },
  ];

  return (
    <>
      <style>{`
        .nav-desktop {
          display: flex;
          gap: 4px;
          align-items: center;
        }
        .mobile-menu-btn {
          display: none !important;
        }
        @media (max-width: 850px) {
          .nav-desktop {
            display: none !important;
          }
          .mobile-menu-btn {
            display: flex !important;
          }
        }
      `}</style>

      <nav
        style={{
          background: "var(--navBg)",
          height: 64,
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 2px 24px var(--shadowDeep)",
          borderBottom: "1px solid rgba(245,200,66,0.12)",
          gap: 12,
        }}
      >
        {/* Logo */}
        <div
          onClick={() => handleNavigation("home")}
          style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}
        >
          <img
            src={LOGO_SRC}
            alt="ติดบ้าน"
            style={{ height: 38, width: "auto", objectFit: "contain" }}
            onError={(e) => {
              e.target.style.display = "none";
              document.getElementById("logo-fallback").style.display = "block";
            }}
          />
          <span
            id="logo-fallback"
            style={{
              color: "var(--goldBright)",
              fontSize: baseFontSize + 6,
              fontWeight: 900,
              fontFamily: "'Mitr', sans-serif",
              letterSpacing: 0.5,
              display: "none",
            }}
          >
            ติดบ้าน
          </span>
        </div>

        {/* Nav links — สำหรับหน้าจอคอมพิวเตอร์ (Desktop) */}
        <div className="nav-desktop">
          {navItems.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleNavigation(key)}
              style={{
                background: page === key ? "var(--goldBright)" : "transparent",
                color: page === key ? "#1c1008" : "var(--navText)",
                border: "none",
                padding: `8px ${baseFontSize < 18 ? "16px" : "20px"}`,
                borderRadius: 100,
                fontFamily: "'Mitr', sans-serif",
                fontSize: baseFontSize - 1,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {t(label)}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          
          {/* Font size Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
              style={{
                background: isFontDropdownOpen ? "rgba(245,200,66,0.2)" : "rgba(245,200,66,0.1)",
                border: isFontDropdownOpen ? "1px solid var(--goldBright)" : "1px solid rgba(245,200,66,0.3)",
                color: "var(--goldBright)",
                borderRadius: 8,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontFamily: "'Mitr', sans-serif",
                fontWeight: 700,
                fontSize: 16,
                transition: "all 0.2s",
              }}
            >
              A
            </button>

            {/* เมนูย่อยของ Font Size */}
            {isFontDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  marginTop: 8,
                  right: 0, // จัดให้อยู่ชิดขวาของปุ่ม
                  background: "var(--navBg)",
                  border: "1px solid rgba(245,200,66,0.12)",
                  boxShadow: "0 8px 24px var(--shadowDeep)",
                  borderRadius: 12,
                  display: "flex",
                  flexDirection: "column",
                  padding: 8,
                  gap: 4,
                  zIndex: 101,
                  minWidth: 140,
                }}
              >
                {fontOptions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setFontSize(item.id);
                      setIsFontDropdownOpen(false); // ปิด Dropdown หลังจากเลือก
                    }}
                    style={{
                      background: fontSize === item.id ? "var(--goldBright)" : "transparent",
                      color: fontSize === item.id ? "#1c1008" : "var(--navText)",
                      border: "none",
                      padding: "10px 16px",
                      borderRadius: 8,
                      fontFamily: "'Mitr', sans-serif",
                      fontSize: item.previewSize, // แสดงขนาดฟอนต์ให้เห็นความต่าง
                      fontWeight: fontSize === item.id ? 600 : 400,
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      transition: "all 0.2s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>A</span> {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lang toggle */}
          <button
            onClick={() => setLang(lang === "th" ? "en" : "th")}
            style={{
              background: "rgba(245,200,66,0.1)",
              border: "1px solid rgba(245,200,66,0.3)",
              color: "var(--goldBright)",
              borderRadius: 100,
              padding: "5px 12px",
              fontFamily: "'Mitr', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {lang === "th" ? "EN" : "ไทย"}
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            style={{
              background: "rgba(245,200,66,0.1)",
              border: "1px solid rgba(245,200,66,0.3)",
              color: "var(--goldBright)",
              borderRadius: 100,
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 16,
              transition: "all 0.2s",
            }}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>

          {/* Cart */}
          <button
            onClick={onCartOpen}
            style={{
              background: "var(--goldBright)",
              color: "#1c1008",
              border: "none",
              padding: "8px 14px",
              borderRadius: 100,
              fontFamily: "'Mitr', sans-serif",
              fontSize: baseFontSize - 2,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              position: "relative",
              transition: "all 0.2s",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            {cartCount > 0 && (
              <>
                <span>{lang === "th" ? "ตะกร้า" : "Cart"}</span>
                <span
                  style={{
                    background: "#dc2626",
                    color: "#fff",
                    borderRadius: 100,
                    fontSize: 11,
                    fontWeight: 800,
                    minWidth: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 5px",
                  }}
                >
                  {cartCount}
                </span>
              </>
            )}
            {cartCount === 0 && <span>{lang === "th" ? "ตะกร้า" : "Cart"}</span>}
          </button>

          {/* ปุ่ม Hamburger (แสดงเฉพาะมือถือ) */}
          <button
            className="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--goldBright)",
              fontSize: 24,
              cursor: "pointer",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              marginLeft: "4px"
            }}
          >
            {isMobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {/* Dropdown Menu สำหรับมือถือ */}
      {isMobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            top: 64, // ความสูงเท่ากับ Navbar
            left: 0,
            width: "100%",
            background: "var(--navBg)",
            boxShadow: "0 8px 16px var(--shadowDeep)",
            borderBottom: "1px solid rgba(245,200,66,0.12)",
            zIndex: 99,
            display: "flex",
            flexDirection: "column",
            padding: "16px 20px",
            gap: 8,
          }}
        >
          {navItems.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleNavigation(key)}
              style={{
                background: page === key ? "var(--goldBright)" : "transparent",
                color: page === key ? "#1c1008" : "var(--navText)",
                border: "none",
                padding: "12px 20px",
                borderRadius: 12,
                fontFamily: "'Mitr', sans-serif",
                fontSize: baseFontSize,
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
              }}
            >
              {t(label)}
            </button>
          ))}
        </div>
      )}
    </>
  );
}