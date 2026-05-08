import { useApp } from "../hooks/useApp";
import { siteInfo } from "../data/menuData";
import MenuCard from "./MenuCard";

const LOGO_SRC = "/logo.png";

export default function HomePage({ setPage, menu, addToCart, onItemClick }) {
  const { lang, t, baseFontSize } = useApp();

  return (
    <div>
      {/* HERO */}
      <section
        style={{
          background: "linear-gradient(150deg, var(--heroStart) 0%, var(--heroMid) 55%, var(--heroStart) 100%)",
          padding: "80px 24px 72px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative radial glows */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(ellipse at 15% 80%, rgba(245,200,66,0.18) 0%, transparent 55%), radial-gradient(ellipse at 85% 20%, rgba(245,200,66,0.12) 0%, transparent 50%)",
            pointerEvents: "none",
          }}
        />
        {/* Subtle grain texture */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
            opacity: 0.4,
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", maxWidth: 640, margin: "0 auto" }}>
          {/* Logo */}
          <div style={{ marginBottom: 24 }}>
            <img
              src={LOGO_SRC}
              alt="ติดบ้าน"
              style={{
                height: 110,
                width: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 6px 28px rgba(245,200,66,0.35))",
              }}
              onError={(e) => {
                e.target.style.display = "none";
                document.getElementById("hero-logo-text").style.display = "block";
              }}
            />
            <div id="hero-logo-text" style={{ display: "none" }}>
              <h1
                style={{
                  color: "#f5c842",
                  fontSize: baseFontSize + 36,
                  fontWeight: 900,
                  margin: "0 0 4px",
                  letterSpacing: 2,
                  fontFamily: "'Mitr', sans-serif",
                }}
              >
                {t(siteInfo.name)}
              </h1>
            </div>
          </div>

          <p
            style={{
              color: "#e8d5b0",
              fontSize: baseFontSize + 4,
              margin: "0 0 10px",
              fontWeight: 600,
              fontFamily: "'Mitr', sans-serif",
              letterSpacing: 1,
            }}
          >
            {t(siteInfo.tagline)}
          </p>
          <p
            style={{
              color: "#a07850",
              fontSize: baseFontSize - 1,
              margin: "0 0 36px",
              fontFamily: "'Sarabun', sans-serif",
            }}
          >
            {lang === "th" ? "รสชาติบ้านๆ ที่คุ้นเคย เหมือนกินอาหารที่บ้าน" : "Honest home-style cooking, just like Mom made."}
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => setPage("menu")}
              style={{
                background: "#f5c842",
                color: "#1c1008",
                border: "none",
                padding: `${baseFontSize > 18 ? "16px 40px" : "13px 34px"}`,
                borderRadius: 100,
                fontSize: baseFontSize + 2,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "'Mitr', sans-serif",
                boxShadow: "0 4px 24px rgba(245,200,66,0.35)",
                transition: "all 0.2s",
                letterSpacing: 0.3,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.04)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(245,200,66,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 24px rgba(245,200,66,0.35)";
              }}
            >
              {lang === "th" ? "ดูเมนูทั้งหมด →" : "View Full Menu →"}
            </button>

            <a
              href={siteInfo.facebook}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "#e8d5b0",
                border: "1px solid rgba(255,255,255,0.2)",
                padding: `${baseFontSize > 18 ? "16px 28px" : "13px 24px"}`,
                borderRadius: 100,
                fontSize: baseFontSize,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Mitr', sans-serif",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                backdropFilter: "blur(4px)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.18)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#4267B2">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
              </svg>
              {lang === "th" ? "ติดตามเรา" : "Follow Us"}
            </a>
          </div>
        </div>
      </section>

      {/* INFO STRIP */}
      <div
        style={{
          background: "var(--goldBright)",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "center",
          gap: 32,
          flexWrap: "wrap",
        }}
      >
        {[
          {
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            ),
            text: t(siteInfo.hours),
          },
          {
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
            ),
            text: lang === "th" ? "หน้าคอนโดลุมพินี ถ.สุขุมวิท" : "Lumpini Condo, Sukhumvit Rd.",
          },
          {
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012.18 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 8.7a16 16 0 006.29 6.29l1.56-1.56a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
              </svg>
            ),
            text: siteInfo.phone,
          },
        ].map(({ icon, text }, i) => (
          <span
            key={i}
            style={{
              fontWeight: 700,
              fontSize: baseFontSize - 2,
              color: "#1c1008",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "'Mitr', sans-serif",
            }}
          >
            {icon} {text}
          </span>
        ))}
      </div>

      {/* FEATURED MENU */}
      <section style={{ padding: "56px 24px 40px", maxWidth: 960, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <h2
            style={{
              fontSize: baseFontSize + 14,
              fontWeight: 900,
              margin: "0 0 6px",
              color: "var(--text)",
              fontFamily: "'Mitr', sans-serif",
            }}
          >
            {lang === "th" ? "เมนูแนะนำ" : "Recommended Dishes"}
          </h2>
          <div
            style={{
              width: 48,
              height: 3,
              background: "var(--goldBright)",
              borderRadius: 4,
              marginBottom: 8,
            }}
          />
          <p style={{ color: "var(--text3)", marginBottom: 0, fontWeight: 600, fontSize: baseFontSize - 1, fontFamily: "'Sarabun', sans-serif" }}>
            {lang === "th" ? "เมนูขายดีประจำร้าน ไม่ควรพลาด!" : "Our most-loved dishes — don't miss these!"}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
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

        <div style={{ textAlign: "center", marginTop: 36 }}>
          <button
            onClick={() => setPage("menu")}
            style={{
              background: "transparent",
              color: "var(--gold)",
              border: "2px solid var(--gold)",
              padding: `${baseFontSize > 18 ? "14px 36px" : "11px 30px"}`,
              borderRadius: 100,
              fontSize: baseFontSize - 1,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Mitr', sans-serif",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--gold)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--gold)";
            }}
          >
            {lang === "th" ? "ดูเมนูทั้งหมด →" : "View All Menu →"}
          </button>
        </div>
      </section>

      {/* STORY SECTION */}
      <section
        style={{
          background: "var(--bg2)",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          padding: "60px 24px",
        }}
      >
        <div style={{ maxWidth: 740, margin: "0 auto", display: "flex", gap: 48, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1 1 260px" }}>
            <p
              style={{
                fontSize: baseFontSize - 3,
                fontWeight: 700,
                color: "var(--gold)",
                letterSpacing: 3,
                textTransform: "uppercase",
                marginBottom: 8,
                fontFamily: "'Mitr', sans-serif",
              }}
            >
              {lang === "th" ? "เรื่องราวของเรา" : "Our Story"}
            </p>
            <h2
              style={{
                fontSize: baseFontSize + 12,
                fontWeight: 900,
                color: "var(--text)",
                marginBottom: 16,
                fontFamily: "'Mitr', sans-serif",
                lineHeight: 1.25,
              }}
            >
              {lang === "th" ? "2 ปี กับรสชาติบ้านๆ" : "10 Years of Home Flavors"}
            </h2>
            <p
              style={{
                fontSize: baseFontSize - 1,
                color: "var(--text2)",
                lineHeight: 1.85,
                fontFamily: "'Sarabun', sans-serif",
              }}
            >
              {t(siteInfo.story)}
            </p>
          </div>
          {/* <div style={{ flex: "1 1 200px" }}>
            <div
              style={{
                background: "linear-gradient(135deg, var(--heroStart), var(--heroMid))",
                borderRadius: 24,
                padding: 28,
                color: "#e8d5b0",
                border: "1px solid rgba(245,200,66,0.15)",
              }}
            >
              <div style={{ color: "#f5c842", fontSize: 20, marginBottom: 12 }}>★★★★★</div>
              <p
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontStyle: "italic",
                  fontSize: baseFontSize - 1,
                  lineHeight: 1.7,
                  color: "#f5c842",
                  marginBottom: 14,
                }}
              >
                {t(siteInfo.review)}
              </p>
              <p style={{ fontSize: baseFontSize - 3, color: "#a07850", fontFamily: "'Sarabun', sans-serif" }}>
                — {t(siteInfo.review.author)}
              </p>
            </div>
          </div> */}
        </div>
      </section>

      {/* Facebook CTA */}
      <section style={{ padding: "48px 24px", textAlign: "center" }}>
        <a
          href={siteInfo.facebook}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "#1877F2",
            color: "#fff",
            borderRadius: 14,
            padding: `${baseFontSize > 18 ? "16px 36px" : "12px 28px"}`,
            textDecoration: "none",
            fontFamily: "'Mitr', sans-serif",
            fontSize: baseFontSize,
            fontWeight: 700,
            boxShadow: "0 4px 20px rgba(24,119,242,0.35)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.04)";
            e.currentTarget.style.boxShadow = "0 8px 28px rgba(24,119,242,0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(24,119,242,0.35)";
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
          </svg>
          {lang === "th" ? "ติดตามร้านบน Facebook" : "Follow Us on Facebook"}
        </a>
      </section>
    </div>
  );
}
