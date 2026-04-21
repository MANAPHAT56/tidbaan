import { useState } from "react";

// ── โลโก้ ──────────────────────────────────────────────────────────────
// วิธีที่ 1: import โลโก้จาก src/assets/ (Vite จัดการ hash ให้อัตโนมัติ)
//   import logo from "./assets/logo.png";
//   แล้วส่ง logoSrc={logo} ให้ <Logo> component ด้านล่าง
//
// วิธีที่ 2: วางไฟล์ใน public/logo.png แล้วใช้ logoSrc="/logo.png"
//   (ถ้า deploy GitHub Pages ให้ใช้ "/tidbaan/logo.png" แทน)
//
// วิธีที่ 3: ยังไม่มีรูป → ปล่อยไว้เป็น undefined แล้วจะแสดงชื่อร้านแทน
const LOGO_SRC = "/tidbaan/logo.png"; // ← เปลี่ยนตรงนี้เป็น path โลโก้ของคุณ

function Logo({ onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
    >
      {LOGO_SRC ? (
        <img
          src={LOGO_SRC}
          alt="ติดบ้าน"
          style={{
            height: 40,
            width: "auto",
            objectFit: "contain",
            // ทำให้โลโก้เข้ากับ navbar สีเข้ม
            // ถ้าโลโก้มีพื้นหลังใส (PNG) ไม่ต้องแก้อะไร
            // ถ้าอยากให้สีโลโก้เป็นสีทอง uncomment บรรทัดด้านล่าง:
            // filter: "brightness(0) saturate(100%) invert(83%) sepia(50%) saturate(400%) hue-rotate(5deg)",
          }}
          onError={(e) => {
            // ถ้าโหลดรูปไม่ได้ ให้ fallback เป็น text
            e.target.style.display = "none";
            e.target.nextSibling.style.display = "block";
          }}
        />
      ) : null}
      <span
        style={{
          color: "#f5c842",
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: 1,
          display: LOGO_SRC ? "none" : "block", // ซ่อนถ้ามีรูป, แสดงถ้าไม่มีรูป
        }}
      >
        🍽 ติดบ้าน
      </span>
    </div>
  );
}
// ────────────────────────────────────────────────────────────────────────

const menu = {
  recommended: [
    {
      id: 1,
      name: "ข้าวผัดกะเพราหมูสับ",
      nameEn: "Kaprao Moo Sub",
      price: 45,
      desc: "กะเพราหอมฉุน ไข่ดาวกรอบ เสิร์ฟพร้อมข้าวสวยร้อนๆ",
      emoji: "🌿",
      tag: "ขายดี",
      spicy: 3,
    },
    {
      id: 2,
      name: "ไก่อบซอสเทอริยากิ",
      nameEn: "Teriyaki Chicken",
      price: 45,
      desc: "ไก่อบซอสพิเศษเข้มข้น หอมเครื่องเทศ นุ่มชุ่มฉ่ำ",
      emoji: "🍗",
      tag: "เด็ด",
      spicy: 0,
    },
    {
      id: 3,
      name: "แกงเขียวหวานขนมจีน",
      nameEn: "Green Curry w/ Rice Noodle",
      price: 45,
      desc: "แกงเขียวหวานเครื่องแน่น กะทิสด ราดบนขนมจีนเส้นนุ่ม",
      emoji: "🍜",
      tag: "ซิกเนเจอร์",
      spicy: 2,
    },
    {
      id: 4,
      name: "ยำขนมจีน",
      nameEn: "Spicy Rice Noodle Salad",
      price: 50,
      desc: "ยำรสแซ่บ เปรี้ยวหวานเค็มเผ็ด กับขนมจีนเส้นนุ่ม",
      emoji: "🥗",
      tag: "เผ็ดแซ่บ",
      spicy: 2,
    },
    
  ],
  extras: [
    { id: 5, name: "ข้าวสวย", price: 10, emoji: "🍚", desc: "ข้าวหอมมะลิสวยร้อน" },
    { id: 6, name: "ไข่ดาว", price: 10, emoji: "🍳", desc: "ไข่ดาวกรอบขอบกรอบ" },
    { id: 7, name: "น้ำเปล่า", price: 10, emoji: "💧", desc: "น้ำดื่มเย็น" },
    { id: 8, name: "ไข่ข้น", price: 10, emoji: "🥚", desc: "ไข่ดาวกรอบขอบกรอบ" },
  ],
};

const spicyDots = (level) =>
  Array.from({ length: 4 }, (_, i) => (
    <span key={i} style={{ color: i < level ? "#ef4444" : "#e2d9c9", fontSize: 10 }}>
      🌶
    </span>
  ));

export default function App() {
  const [page, setPage] = useState("home");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [ordered, setOrdered] = useState(false);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === id);
      if (existing.qty === 1) return prev.filter((c) => c.id !== id);
      return prev.map((c) => (c.id === id ? { ...c, qty: c.qty - 1 } : c));
    });
  };

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const styles = {
    root: {
      fontFamily: "'Sarabun', sans-serif",
      background: "#fdf6ec",
      minHeight: "100vh",
      color: "#2d1f0e",
    },
    nav: {
      background: "#1a0a00",
      padding: "0 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: 60,
      position: "sticky",
      top: 0,
      zIndex: 100,
      boxShadow: "0 2px 20px rgba(0,0,0,0.4)",
    },
    logo: {
      color: "#f5c842",
      fontSize: 22,
      fontWeight: 900,
      letterSpacing: 1,
      cursor: "pointer",
    },
    navLinks: { display: "flex", gap: 8, alignItems: "center" },
    navBtn: (active) => ({
      background: active ? "#f5c842" : "transparent",
      color: active ? "#1a0a00" : "#e8d5b0",
      border: "none",
      padding: "8px 18px",
      borderRadius: 100,
      fontFamily: "'Sarabun', sans-serif",
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
      transition: "all 0.2s",
    }),
    cartBtn: {
      background: "#f5c842",
      color: "#1a0a00",
      border: "none",
      padding: "8px 16px",
      borderRadius: 100,
      fontFamily: "'Sarabun', sans-serif",
      fontSize: 14,
      fontWeight: 800,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 6,
    },
  };

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <div style={styles.root}>
        {/* NAV */}
        <nav style={styles.nav}>
          <Logo onClick={() => setPage("home")} />
          <div style={styles.navLinks}>
            <button style={styles.navBtn(page === "home")} onClick={() => setPage("home")}>
              หน้าแรก
            </button>
            <button style={styles.navBtn(page === "menu")} onClick={() => setPage("menu")}>
              เมนู
            </button>
            <button style={styles.navBtn(page === "about")} onClick={() => setPage("about")}>
              เกี่ยวกับเรา
            </button>
            <button style={styles.cartBtn} onClick={() => setCartOpen(true)}>
              🛒 {cartCount > 0 ? `(${cartCount})` : "ตะกร้า"}
            </button>
          </div>
        </nav>

        {/* PAGES */}
        {page === "home" && <HomePage setPage={setPage} menu={menu} addToCart={addToCart} />}
        {page === "menu" && <MenuPage menu={menu} addToCart={addToCart} />}
        {page === "about" && <AboutPage />}

        {/* CART DRAWER */}
        {cartOpen && (
          <CartDrawer
            cart={cart}
            total={total}
            addToCart={addToCart}
            removeFromCart={removeFromCart}
            onClose={() => setCartOpen(false)}
            ordered={ordered}
            setOrdered={setOrdered}
          />
        )}
      </div>
    </>
  );
}

function HomePage({ setPage, menu, addToCart }) {
  return (
    <div>
      {/* HERO */}
      <div
        style={{
          background: "linear-gradient(135deg, #1a0a00 0%, #3d1a00 50%, #1a0a00 100%)",
          padding: "80px 24px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 20% 80%, rgba(245,200,66,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(245,200,66,0.1) 0%, transparent 50%)",
          }}
        />
        <div style={{ position: "relative" }}>
          {/* โลโก้ใน Hero — ถ้ามีรูปจะแสดงรูป ถ้าไม่มีจะแสดง emoji + ชื่อ */}
          {LOGO_SRC ? (
            <div style={{ marginBottom: 20 }}>
              <img
                src={LOGO_SRC}
                alt="ติดบ้าน"
                style={{
                  height: 100,
                  width: "auto",
                  objectFit: "contain",
                  filter: "drop-shadow(0 4px 20px rgba(245,200,66,0.4))",
                }}
                onError={(e) => { e.target.style.display = "none"; }}
              />
            </div>
          ) : (
            <>
              <div style={{ fontSize: 64, marginBottom: 8 }}>🍽</div>
              <h1
                style={{
                  color: "#f5c842",
                  fontSize: 56,
                  fontWeight: 900,
                  margin: "0 0 8px",
                  letterSpacing: 2,
                }}
              >
                ติดบ้าน
              </h1>
            </>
          )}
          <p style={{ color: "#e8d5b0", fontSize: 20, margin: "0 0 8px", fontWeight: 600 }}>
            อาหารตามสั่ง · ข้าวแกง · ขนมจีน
          </p>
          <p style={{ color: "#c9a96e", fontSize: 15, margin: "0 0 32px" }}>
            รสชาติบ้านๆ ที่คุ้นเคย เหมือนกินอาหารที่บ้าน
          </p>
          <button
            onClick={() => setPage("menu")}
            style={{
              background: "#f5c842",
              color: "#1a0a00",
              border: "none",
              padding: "14px 40px",
              borderRadius: 100,
              fontSize: 18,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "'Sarabun', sans-serif",
              boxShadow: "0 4px 24px rgba(245,200,66,0.4)",
            }}
          >
            ดูเมนูทั้งหมด →
          </button>
        </div>
      </div>

      {/* INFO STRIP */}
      <div
        style={{
          background: "#f5c842",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "center",
          gap: 40,
          flexWrap: "wrap",
        }}
      >
        {[
          ["🕐", "เปิด 07:00 – 15:00"],
          ["📍", "ถนนเพชรบุรี ซอย 5"],
          ["📞", "081-234-5678"],
        ].map(([icon, text]) => (
          <span key={text} style={{ fontWeight: 700, fontSize: 14, color: "#1a0a00" }}>
            {icon} {text}
          </span>
        ))}
      </div>

      {/* FEATURED */}
      <div style={{ padding: "48px 24px", maxWidth: 900, margin: "0 auto" }}>
        <h2
          style={{
            fontSize: 28,
            fontWeight: 900,
            marginBottom: 4,
            color: "#1a0a00",
          }}
        >
          เมนูแนะนำ ⭐
        </h2>
        <p style={{ color: "#8b6340", marginBottom: 28, fontWeight: 600 }}>
          เมนูขายดีประจำร้าน ไม่ควรพลาด!
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 20,
          }}
        >
          {menu.recommended.map((item) => (
            <MenuCard key={item.id} item={item} addToCart={addToCart} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MenuPage({ menu, addToCart }) {
  const [filter, setFilter] = useState("all");

  return (
    <div style={{ padding: "40px 24px", maxWidth: 960, margin: "0 auto" }}>
      <h2 style={{ fontSize: 34, fontWeight: 900, marginBottom: 4 }}>เมนูทั้งหมด 📋</h2>
      <p style={{ color: "#8b6340", marginBottom: 28, fontWeight: 600 }}>
        เลือกได้ตามใจ ทำสดทุกจาน
      </p>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
        {[
          ["all", "ทั้งหมด"],
          ["recommended", "เมนูหลัก"],
          ["extras", "เพิ่มเติม"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              background: filter === key ? "#1a0a00" : "#f0e6d3",
              color: filter === key ? "#f5c842" : "#5a3e2b",
              border: "none",
              padding: "10px 24px",
              borderRadius: 100,
              fontFamily: "'Sarabun', sans-serif",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {(filter === "all" || filter === "recommended") && (
        <>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: "#3d1a00" }}>
            🍛 เมนูหลัก
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 20,
              marginBottom: 40,
            }}
          >
            {menu.recommended.map((item) => (
              <MenuCard key={item.id} item={item} addToCart={addToCart} />
            ))}
          </div>
        </>
      )}

      {(filter === "all" || filter === "extras") && (
        <>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: "#3d1a00" }}>
            ➕ เพิ่มเติม
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 16,
            }}
          >
            {menu.extras.map((item) => (
              <MenuCard key={item.id} item={item} addToCart={addToCart} small />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MenuCard({ item, addToCart, small }) {
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 800);
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 2px 16px rgba(61,26,0,0.08)",
        transition: "transform 0.2s, box-shadow 0.2s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(61,26,0,0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 16px rgba(61,26,0,0.08)";
      }}
    >
      {/* Image placeholder */}
      <div
        style={{
          background: "linear-gradient(135deg, #fef3c7, #fde68a)",
          height: small ? 80 : 120,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: small ? 36 : 52,
          position: "relative",
        }}
      >
        {item.emoji}
        {item.tag && (
          <span
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "#ef4444",
              color: "#fff",
              fontSize: 10,
              fontWeight: 800,
              padding: "3px 8px",
              borderRadius: 100,
            }}
          >
            {item.tag}
          </span>
        )}
      </div>

      <div style={{ padding: small ? "12px" : "16px" }}>
        <div style={{ fontWeight: 800, fontSize: small ? 14 : 16, marginBottom: 4, color: "#1a0a00" }}>
          {item.name}
        </div>
        {!small && (
          <div style={{ fontSize: 12, color: "#8b6340", marginBottom: 8, lineHeight: 1.5 }}>
            {item.desc}
          </div>
        )}
        {item.spicy > 0 && (
          <div style={{ marginBottom: 8 }}>
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i} style={{ fontSize: 10 }}>
                {i < item.spicy ? "🌶" : ""}
              </span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: "#c65a00" }}>
            ฿{item.price}
          </span>
          <button
            onClick={handleAdd}
            style={{
              background: added ? "#22c55e" : "#1a0a00",
              color: added ? "#fff" : "#f5c842",
              border: "none",
              padding: "6px 14px",
              borderRadius: 100,
              fontFamily: "'Sarabun', sans-serif",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {added ? "✓ เพิ่มแล้ว" : "+ เพิ่ม"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AboutPage() {
  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "60px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🏠</div>
        <h2 style={{ fontSize: 36, fontWeight: 900, color: "#1a0a00", marginBottom: 8 }}>
          เกี่ยวกับร้านติดบ้าน
        </h2>
        <p style={{ color: "#8b6340", fontSize: 16, fontWeight: 600 }}>
          อาหารบ้านๆ รสชาติดีที่ใกล้บ้านคุณ
        </p>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          padding: 32,
          marginBottom: 24,
          boxShadow: "0 2px 20px rgba(61,26,0,0.08)",
        }}
      >
        <h3 style={{ fontWeight: 800, fontSize: 20, marginBottom: 12, color: "#3d1a00" }}>
          📖 เรื่องราวของเรา
        </h3>
        <p style={{ lineHeight: 1.8, color: "#5a3e2b" }}>
          ร้านติดบ้านเปิดมาแล้วกว่า 10 ปี ด้วยสูตรอาหารที่ถ่ายทอดจากรุ่นสู่รุ่น
          ทำด้วยใจรักและวัตถุดิบสดใหม่ทุกวัน เราเน้นรสชาติที่คุ้นเคยเหมือนอาหารบ้าน
          ราคาไม่แพง แต่อร่อยจนต้องกลับมาซ้ำ
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          ["📍", "ที่อยู่", "123/45 ถนนเพชรบุรี ซอย 5\nแขวงมักกะสัน เขตราษฎร์บูรณะ\nกรุงเทพฯ 10400"],
          ["🕐", "เวลาเปิด-ปิด", "จันทร์ – เสาร์\n07:00 – 15:00 น.\nวันอาทิตย์ หยุด"],
          ["📞", "โทรศัพท์", "081-234-5678\nLine: @tidbaan"],
          ["🚗", "การเดินทาง", "ใกล้ BTS อ่อนนุช\nมีที่จอดรถ 5 คัน\nรับออเดอร์หน้าร้าน"],
        ].map(([icon, title, detail]) => (
          <div
            key={title}
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 20,
              boxShadow: "0 2px 16px rgba(61,26,0,0.06)",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4, color: "#1a0a00" }}>
              {title}
            </div>
            <div style={{ fontSize: 13, color: "#8b6340", lineHeight: 1.7, whiteSpace: "pre-line" }}>
              {detail}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "linear-gradient(135deg, #1a0a00, #3d1a00)",
          borderRadius: 24,
          padding: 28,
          textAlign: "center",
          color: "#e8d5b0",
        }}
      >
        <div style={{ fontSize: 24, marginBottom: 8 }}>⭐⭐⭐⭐⭐</div>
        <p style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.7, color: "#f5c842" }}>
          "อร่อยมาก กะเพราหอมมาก ไก่อบซอสเข้มข้นมาก มาซ้ำทุกอาทิตย์เลยค่ะ"
        </p>
        <p style={{ fontSize: 13, marginTop: 8, color: "#c9a96e" }}>— ลูกค้าประจำ</p>
      </div>
    </div>
  );
}

function CartDrawer({ cart, total, addToCart, removeFromCart, onClose, ordered, setOrdered }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        style={{ flex: 1, background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />
      <div
        style={{
          width: 380,
          maxWidth: "100vw",
          background: "#fdf6ec",
          height: "100%",
          overflow: "auto",
          padding: 24,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>🛒 ตะกร้าของคุณ</h3>
          <button
            onClick={onClose}
            style={{
              background: "#e8d5b0",
              border: "none",
              borderRadius: 100,
              width: 36,
              height: 36,
              cursor: "pointer",
              fontSize: 18,
              fontFamily: "'Sarabun', sans-serif",
            }}
          >
            ✕
          </button>
        </div>

        {ordered ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <h4 style={{ fontWeight: 900, fontSize: 22, color: "#1a0a00" }}>สั่งเรียบร้อยแล้ว!</h4>
            <p style={{ color: "#8b6340" }}>รอรับอาหารได้เลยค่ะ 🍛</p>
            <button
              onClick={() => { setOrdered(false); onClose(); }}
              style={{
                marginTop: 20,
                background: "#1a0a00",
                color: "#f5c842",
                border: "none",
                padding: "12px 32px",
                borderRadius: 100,
                fontFamily: "'Sarabun', sans-serif",
                fontSize: 15,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ปิด
            </button>
          </div>
        ) : cart.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#8b6340" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🍽</div>
            <p style={{ fontWeight: 600 }}>ยังไม่มีรายการในตะกร้า</p>
          </div>
        ) : (
          <>
            <div style={{ flex: 1 }}>
              {cart.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 28 }}>{item.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{item.name}</div>
                    <div style={{ fontSize: 13, color: "#c65a00", fontWeight: 700 }}>
                      ฿{item.price}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      style={{
                        background: "#f0e6d3",
                        border: "none",
                        borderRadius: 100,
                        width: 28,
                        height: 28,
                        cursor: "pointer",
                        fontWeight: 800,
                        fontSize: 16,
                        fontFamily: "'Sarabun', sans-serif",
                      }}
                    >
                      −
                    </button>
                    <span style={{ fontWeight: 800, minWidth: 20, textAlign: "center" }}>
                      {item.qty}
                    </span>
                    <button
                      onClick={() => addToCart(item)}
                      style={{
                        background: "#1a0a00",
                        color: "#f5c842",
                        border: "none",
                        borderRadius: 100,
                        width: 28,
                        height: 28,
                        cursor: "pointer",
                        fontWeight: 800,
                        fontSize: 16,
                        fontFamily: "'Sarabun', sans-serif",
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                borderTop: "2px dashed #e8d5b0",
                paddingTop: 20,
                marginTop: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 900,
                  fontSize: 20,
                  marginBottom: 16,
                }}
              >
                <span>รวมทั้งหมด</span>
                <span style={{ color: "#c65a00" }}>฿{total}</span>
              </div>
              <button
                onClick={() => setOrdered(true)}
                style={{
                  background: "#1a0a00",
                  color: "#f5c842",
                  border: "none",
                  width: "100%",
                  padding: "16px",
                  borderRadius: 16,
                  fontFamily: "'Sarabun', sans-serif",
                  fontSize: 17,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                สั่งอาหาร ฿{total} →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}