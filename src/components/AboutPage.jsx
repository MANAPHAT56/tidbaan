import { useApp } from "../hooks/useApp";
import { siteInfo } from "../data/menuData";

export default function AboutPage() {
  const { lang, t, baseFontSize } = useApp();

  const infoCards = [
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
        </svg>
      ),
      titleTh: "ที่อยู่",
      titleEn: "Address",
      detailTh: "ลุมพินี คอนโดทาวน์ ชลบุรี-สุขุมวิท อำเภอเมืองชลบุรี ชลบุรี 20000·",
      detailEn: "Lumpini CondoTown Chonburi-Sukhumvit, Mueang Chonburi District, Chonburi 20000",
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      titleTh: "เวลาเปิด",
      titleEn: "Opening Hours",
      detailTh: "จันทร์ – เสาร์\n16:30 – 21:30 น.\nวันอาทิตย์ หยุด",
      detailEn: "Mon – Sat\n16:30 – 21:30\nClosed on Sundays",
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012.18 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 8.7a16 16 0 006.29 6.29l1.56-1.56a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
        </svg>
      ),
      titleTh: "ติดต่อ",
      titleEn: "Contact",
      detailTh: `โทร: ${siteInfo.phone}\nLine: ${siteInfo.line}`,
      detailEn: `Tel: ${siteInfo.phone}\nLine: ${siteInfo.line}`,
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8">
          <rect x="1" y="3" width="15" height="13" rx="2" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
      titleTh: "การเดินทาง",
      titleEn: "Getting Here",
      detailTh: "มีที่จอดรถ 2 คัน(มอเตอร์ไซต์)\nสั่งอาหารที่เคาน์เตอร์",
      detailEn: "2 parking spaces (motorcycle)\nOrder at the counter",
    },
  ];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "56px 24px 80px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            background: "linear-gradient(135deg, var(--heroStart), var(--heroMid))",
            margin: "0 auto 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(245,200,66,0.2)",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f5c842" strokeWidth="1.6">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <h2
          style={{
            fontSize: baseFontSize + 18,
            fontWeight: 900,
            color: "var(--text)",
            marginBottom: 8,
            fontFamily: "'Mitr', sans-serif",
          }}
        >
          {lang === "th" ? "เกี่ยวกับร้านติดบ้าน" : "About Tidbaan"}
        </h2>
        <div style={{ width: 48, height: 3, background: "var(--goldBright)", borderRadius: 4, margin: "0 auto 14px" }} />
        <p
          style={{
            color: "var(--text3)",
            fontSize: baseFontSize,
            fontFamily: "'Sarabun', sans-serif",
          }}
        >
          {lang === "th" ? "อาหารบ้านๆ รสชาติดีที่ใกล้บ้านคุณ" : "Home-style flavors, close to your heart."}
        </p>
      </div>

      {/* Story */}
      <div
        style={{
          background: "var(--surface)",
          borderRadius: 24,
          padding: "32px 36px",
          marginBottom: 28,
          border: "1px solid var(--border)",
          boxShadow: "0 2px 20px var(--shadow)",
        }}
      >
        <h3
          style={{
            fontWeight: 800,
            fontSize: baseFontSize + 4,
            marginBottom: 16,
            color: "var(--text)",
            fontFamily: "'Mitr', sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ display: "inline-block", width: 4, height: 22, background: "var(--goldBright)", borderRadius: 4 }} />
          {lang === "th" ? "เรื่องราวของเรา" : "Our Story"}
        </h3>
        <p
          style={{
            lineHeight: 1.9,
            color: "var(--text2)",
            fontFamily: "'Sarabun', sans-serif",
            fontSize: baseFontSize,
          }}
        >
          {t(siteInfo.story)}
        </p>
      </div>

      {/* Info grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {infoCards.map(({ icon, titleTh, titleEn, detailTh, detailEn }) => (
          <div
            key={titleTh}
            style={{
              background: "var(--surface)",
              borderRadius: 20,
              padding: "22px 20px",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 14px var(--shadow)",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div style={{ marginBottom: 12 }}>{icon}</div>
            <div
              style={{
                fontWeight: 800,
                fontSize: baseFontSize,
                marginBottom: 8,
                color: "var(--text)",
                fontFamily: "'Mitr', sans-serif",
              }}
            >
              {lang === "th" ? titleTh : titleEn}
            </div>
            <div
              style={{
                fontSize: baseFontSize - 2,
                color: "var(--text3)",
                lineHeight: 1.8,
                whiteSpace: "pre-line",
                fontFamily: "'Sarabun', sans-serif",
              }}
            >
              {lang === "th" ? detailTh : detailEn}
            </div>
          </div>
        ))}
      </div>

      {/* Review */}
      {/* <div
        style={{
          background: "linear-gradient(135deg, var(--heroStart), var(--heroMid))",
          borderRadius: 24,
          padding: "32px 36px",
          textAlign: "center",
          border: "1px solid rgba(245,200,66,0.15)",
        }}
      >
        <div style={{ color: "#f5c842", fontSize: 22, marginBottom: 14 }}>★★★★★</div>
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontSize: baseFontSize + 2,
            lineHeight: 1.75,
            color: "#f5c842",
            maxWidth: 480,
            margin: "0 auto 14px",
          }}
        >
          {t(siteInfo.review)}
        </p>
        <p style={{ fontSize: baseFontSize - 2, color: "#a07850", fontFamily: "'Sarabun', sans-serif" }}>
          — {t(siteInfo.review.author)}
        </p>
      </div> */}

      {/* Facebook link */}
      <div style={{ textAlign: "center", marginTop: 36 }}>
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
            padding: `${baseFontSize > 18 ? "14px 32px" : "11px 24px"}`,
            textDecoration: "none",
            fontFamily: "'Mitr', sans-serif",
            fontSize: baseFontSize - 1,
            fontWeight: 700,
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
          </svg>
          {lang === "th" ? "ติดตามเราบน Facebook" : "Follow Us on Facebook"}
        </a>
      </div>
    </div>
  );
}
