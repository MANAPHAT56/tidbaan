import { useState, useEffect, useRef } from "react";
import { useApp } from "../hooks/useApp";

const WORKER_URL = "https://food-order-worker.ttpho5874.workers.dev";

// ── PromptPay QR helpers ──────────────────────────────────────
// สร้าง PromptPay payload (EMVCo QR) สำหรับเลขพร้อมเพย์ (ธนาคารออมสิน)
function crc16(data) {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

function buildPromptPayPayload(promptPayId, amount) {
  // พร้อมเพย์: เบอร์โทร 10 หลัก → 0066XXXXXXXX
  const normalize = (id) => {
    id = id.replace(/-/g, "").trim();
    if (id.startsWith("0") && id.length === 10)
      return "0066" + id.slice(1);
    return id;
  };
  const aid = "A000000677010111";
  const accountId = normalize(promptPayId);
  const merchant = `0016${aid}0213${accountId}`;
  const amountStr = amount.toFixed(2);

  let payload =
    "000201" +
    "010212" +
    `2${String(merchant.length + 4).padStart(2, "0")}${merchant}` +
    "5303764" +
    `54${String(amountStr.length).padStart(2, "0")}${amountStr}` +
    "5802TH" +
    "6304";

  const checksum = crc16(payload);
  return payload + checksum;
}

// ── QR Code renderer (ใช้ qrcode-svg via CDN หรือ canvas) ──
// เราใช้ API qr-server.com เพื่อไม่ต้อง install lib
function QRImage({ text, size = 220 }) {
  const encoded = encodeURIComponent(text);
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&ecc=M`;
  return (
    <img
      src={url}
      alt="QR Code"
      width={size}
      height={size}
      style={{ borderRadius: 12, display: "block" }}
    />
  );
}

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

  // ─── State ────────────────────────────────────────────────
  const [tableNumber, setTableNumber] = useState(null);
  const [step, setStep] = useState("cart"); // cart | form | qr | success | fail
  const [checking, setChecking] = useState(false);
  const [geoError, setGeoError] = useState(null);

  // Takeaway form
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [formError, setFormError] = useState("");

  // QR / payment
  const [qrPayload, setQrPayload] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null); // null | "pending" | "success" | "fail"
  const pollingRef = useRef(null);

  // ─── อ่านเลขโต๊ะจาก URL / localStorage ───────────────────
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const table = urlParams.get("table");
    if (table && !isNaN(table) && table > 0 && table <= 20) {
      setTableNumber(table);
      localStorage.setItem("currentTable", table);
    } else {
      const saved = localStorage.getItem("currentTable");
      if (saved && !isNaN(saved)) setTableNumber(saved);
    }
  }, []);

  const isTakeaway = !tableNumber; // ไม่มีโต๊ะ = สั่งกลับบ้าน

  // ─── reset เมื่อปิด drawer ────────────────────────────────
  useEffect(() => {
    if (!ordered) {
      setStep("cart");
      setGeoError(null);
      setPhone("");
      setAddress("");
      setFormError("");
      setQrPayload(null);
      setOrderId(null);
      setPaymentStatus(null);
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
  }, [ordered]);

  // ─── Polling ตรวจสถานะการโอน ──────────────────────────────
  function startPolling(oid) {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${WORKER_URL}/payment-status?orderId=${oid}`);
        const data = await res.json();
        if (data.status === "success") {
          clearInterval(pollingRef.current);
          setPaymentStatus("success");
          setStep("success");
          setOrdered(true);
        } else if (data.status === "fail" || data.status === "expired") {
          clearInterval(pollingRef.current);
          setPaymentStatus("fail");
          setStep("fail");
        }
      } catch (_) {}
    }, 3000);
    // หยุด polling หลัง 10 นาที
    setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        setPaymentStatus((prev) => (prev === null ? "fail" : prev));
        setStep((prev) => (prev === "qr" ? "fail" : prev));
      }
    }, 10 * 60 * 1000);
  }

  // ─── กด "ยืนยันสั่งอาหาร" (หลัง form) หรือ dine-in กด order ─
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
          const payload = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            cart: cart.map((item) => ({
              id: item.id,
              name: item.name,
              nameEn: item.nameEn,
              price: item.price,
              qty: item.qty,
            })),
            total,
            tableNumber: tableNumber || null,
            isTakeaway,
            phone: isTakeaway ? phone : undefined,
            address: isTakeaway && address ? address : undefined,
          };

          const res = await fetch(`${WORKER_URL}/create-order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const data = await res.json();

          if (res.ok && data.ok) {
            setQrPayload(data.qrPayload);
            setOrderId(data.orderId);
            setStep("qr");
            startPolling(data.orderId);
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

  // ─── validate form takeaway ───────────────────────────────
  function handleFormNext() {
    if (!phone.trim()) {
      setFormError(lang === "th" ? "กรุณากรอกเบอร์โทรศัพท์" : "Please enter phone number");
      return;
    }
    if (!/^[0-9]{9,10}$/.test(phone.replace(/-/g, "").trim())) {
      setFormError(lang === "th" ? "เบอร์โทรไม่ถูกต้อง (9-10 หลัก)" : "Invalid phone number");
      return;
    }
    setFormError("");
    handleOrder();
  }

  // ─── Styles helper ────────────────────────────────────────
  const fs = baseFontSize || 16;
  const btn = (bg, color, disabled) => ({
    background: disabled ? "var(--bg2)" : bg,
    color: disabled ? "var(--text3)" : color,
    border: "none",
    width: "100%",
    padding: fs > 18 ? "18px" : "14px",
    borderRadius: 16,
    fontFamily: "'Mitr', sans-serif",
    fontSize: fs + 2,
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
    transition: "all 0.2s",
    letterSpacing: 0.5,
  });

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1.5px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text)",
    fontFamily: "'Sarabun', sans-serif",
    fontSize: fs,
    outline: "none",
    boxSizing: "border-box",
  };

  const label = (text) => (
    <div
      style={{
        fontSize: fs - 2,
        fontWeight: 700,
        color: "var(--text2)",
        fontFamily: "'Mitr', sans-serif",
        marginBottom: 6,
      }}
    >
      {text}
    </div>
  );

  // ─── Render ───────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
      {/* overlay */}
      <div
        style={{ flex: 1, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />

      {/* drawer */}
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
        {/* ── HEADER ─────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h3
              style={{
                fontSize: fs + 6,
                fontWeight: 800,
                margin: 0,
                color: "var(--text)",
                fontFamily: "'Mitr', sans-serif",
              }}
            >
              {step === "qr"
                ? (lang === "th" ? "💳 ชำระเงิน" : "💳 Payment")
                : step === "form"
                ? (lang === "th" ? "🛵 สั่งกลับบ้าน" : "🛵 Takeaway")
                : (lang === "th" ? "🛒 ตะกร้า" : "🛒 Your Cart")}
            </h3>

            {/* badge โต๊ะ หรือ takeaway */}
            {tableNumber ? (
              <div style={{ fontSize: fs - 2, color: "var(--amber)", fontWeight: 600, marginTop: 4, fontFamily: "'Mitr', sans-serif" }}>
                📍 {lang === "th" ? `โต๊ะ ${tableNumber}` : `Table ${tableNumber}`}
              </div>
            ) : (
              <div style={{ fontSize: fs - 2, color: "#60a5fa", fontWeight: 600, marginTop: 4, fontFamily: "'Mitr', sans-serif" }}>
                🛵 {lang === "th" ? "สั่งกลับบ้าน" : "Takeaway"}
              </div>
            )}
          </div>

          {step !== "qr" && (
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
          )}
        </div>

        {/* ════════════════════════════════════════════════════ */}
        {/* STEP: SUCCESS                                        */}
        {/* ════════════════════════════════════════════════════ */}
        {step === "success" && (
          <div style={{ textAlign: "center", padding: "60px 0", flex: 1 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <h4 style={{ fontWeight: 800, fontSize: fs + 8, color: "var(--text)", fontFamily: "'Mitr', sans-serif", marginBottom: 8 }}>
              {lang === "th" ? "ชำระเงินสำเร็จ!" : "Payment Successful!"}
            </h4>
            <p style={{ color: "var(--text3)", fontSize: fs, fontFamily: "'Sarabun', sans-serif" }}>
              {isTakeaway
                ? (lang === "th" ? "เราจะโทรยืนยันนัดรับของค่ะ" : "We'll call to confirm delivery.")
                : (lang === "th" ? "รอรับอาหารได้เลยค่ะ" : "Your food is being prepared.")}
            </p>
            <button
              onClick={() => { setOrdered(false); onClose(); }}
              style={{ ...btn("var(--navBg)", "var(--goldBright)", false), marginTop: 28, width: "auto", padding: "14px 36px" }}
            >
              {lang === "th" ? "ปิด" : "Close"}
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/* STEP: FAIL                                           */}
        {/* ════════════════════════════════════════════════════ */}
        {step === "fail" && (
          <div style={{ textAlign: "center", padding: "60px 0", flex: 1 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>❌</div>
            <h4 style={{ fontWeight: 800, fontSize: fs + 6, color: "#ef4444", fontFamily: "'Mitr', sans-serif", marginBottom: 8 }}>
              {lang === "th" ? "การชำระเงินไม่สำเร็จ" : "Payment Failed"}
            </h4>
            <p style={{ color: "var(--text3)", fontSize: fs, fontFamily: "'Sarabun', sans-serif", marginBottom: 28 }}>
              {lang === "th" ? "ยังไม่ได้รับการยืนยันการโอน\nกรุณาลองใหม่หรือติดต่อพนักงาน" : "Payment not confirmed.\nPlease try again or contact staff."}
            </p>
            <button
              onClick={() => { setStep("cart"); setQrPayload(null); setOrderId(null); setPaymentStatus(null); }}
              style={{ ...btn("var(--navBg)", "var(--goldBright)", false), width: "auto", padding: "14px 32px" }}
            >
              {lang === "th" ? "ลองใหม่" : "Try Again"}
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/* STEP: QR PAYMENT                                     */}
        {/* ════════════════════════════════════════════════════ */}
        {step === "qr" && qrPayload && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            {/* bank badge */}
            <div
              style={{
                background: "linear-gradient(135deg,#1a6f3c,#2d9e5f)",
                borderRadius: 16,
                padding: "12px 24px",
                textAlign: "center",
              }}
            >
              <div style={{ color: "#fff", fontFamily: "'Mitr', sans-serif", fontWeight: 800, fontSize: fs + 2 }}>
                🏦 พร้อมเพย์ · ออมสิน
              </div>
              <div style={{ color: "rgba(255,255,255,0.8)", fontSize: fs - 2, fontFamily: "'Sarabun', sans-serif", marginTop: 4 }}>
                GSB PromptPay
              </div>
            </div>

            {/* QR */}
            <div
              style={{
                background: "#fff",
                borderRadius: 20,
                padding: 16,
                boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              }}
            >
              <QRImage text={qrPayload} size={220} />
            </div>

            {/* amount */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: fs - 2, color: "var(--text3)", fontFamily: "'Sarabun', sans-serif" }}>
                {lang === "th" ? "ยอดที่ต้องชำระ" : "Amount to pay"}
              </div>
              <div style={{ fontSize: fs + 18, fontWeight: 900, color: "var(--amber)", fontFamily: "'Mitr', sans-serif", lineHeight: 1.1 }}>
                ฿{total}
              </div>
            </div>

            {/* status */}
            <div
              style={{
                background: "rgba(251,191,36,0.1)",
                border: "1px solid rgba(251,191,36,0.3)",
                borderRadius: 12,
                padding: "12px 20px",
                textAlign: "center",
                fontSize: fs - 2,
                color: "var(--amber)",
                fontFamily: "'Sarabun', sans-serif",
              }}
            >
              ⏳ {lang === "th" ? "รอการยืนยันการโอนเงิน..." : "Waiting for payment confirmation..."}
              <br />
              <span style={{ fontSize: fs - 4, color: "var(--text3)", marginTop: 4, display: "block" }}>
                {lang === "th" ? "หน้านี้จะอัปเดตอัตโนมัติ" : "This page updates automatically"}
              </span>
            </div>

            {/* order id */}
            {orderId && (
              <div style={{ fontSize: fs - 4, color: "var(--text3)", fontFamily: "'Sarabun', sans-serif" }}>
                Order ID: {orderId}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/* STEP: FORM (Takeaway only)                           */}
        {/* ════════════════════════════════════════════════════ */}
       {step === "form" && !isTakeaway && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
            {/* order summary */}
            <div
              style={{
                background: "var(--surface)",
                borderRadius: 14,
                padding: "14px 16px",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ fontSize: fs - 1, fontWeight: 700, color: "var(--text2)", fontFamily: "'Mitr', sans-serif", marginBottom: 8 }}>
                {lang === "th" ? "สรุปรายการ" : "Order Summary"}
              </div>
              {cart.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: fs - 2, color: "var(--text)", fontFamily: "'Sarabun', sans-serif", marginBottom: 4 }}>
                  <span>{lang === "th" ? item.name : item.nameEn} ×{item.qty}</span>
                  <span style={{ color: "var(--amber)", fontWeight: 700 }}>฿{item.price * item.qty}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px dashed var(--divider)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: fs, color: "var(--amber)", fontFamily: "'Mitr', sans-serif" }}>
                <span>{lang === "th" ? "รวม" : "Total"}</span>
                <span>฿{total}</span>
              </div>
            </div>

            {/* phone */}
            <div>
              {label(lang === "th" ? "📱 เบอร์โทรศัพท์ *" : "📱 Phone Number *")}
              <input
                type="tel"
                inputMode="numeric"
                placeholder={lang === "th" ? "0XX-XXX-XXXX" : "0XX-XXX-XXXX"}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* address */}
            <div>
              {label(lang === "th" ? "🏠 ที่อยู่จัดส่ง (ไม่บังคับ)" : "🏠 Delivery Address (optional)")}
              <textarea
                placeholder={lang === "th" ? "บ้านเลขที่ ถนน ตำบล อำเภอ..." : "House no., street, sub-district..."}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              />
              <div style={{ fontSize: fs - 4, color: "var(--text3)", fontFamily: "'Sarabun', sans-serif", marginTop: 6 }}>
                📍 {lang === "th" ? "หากไม่กรอก ระบบจะใช้ตำแหน่ง GPS ของคุณ" : "If blank, your GPS location will be used"}
              </div>
            </div>

            {/* error */}
            {(formError || geoError) && (
              <div
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: fs - 2,
                  color: "#ef4444",
                  fontFamily: "'Sarabun', sans-serif",
                }}
              >
                {formError || geoError}
              </div>
            )}

            {/* back + confirm */}
            <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
              <button
                onClick={() => { setStep("cart"); setFormError(""); setGeoError(null); }}
                style={{
                  ...btn("var(--bg2)", "var(--text2)", false),
                  width: "auto",
                  padding: "14px 20px",
                  fontSize: fs,
                  flex: "0 0 auto",
                }}
              >
                ←
              </button>
              <button
                onClick={handleFormNext}
                disabled={checking}
                style={btn("var(--navBg)", "var(--goldBright)", checking)}
              >
                {checking
                  ? (lang === "th" ? "⏳ กำลังตรวจสอบ..." : "⏳ Checking...")
                  : (lang === "th" ? `ยืนยัน ฿${total}` : `Confirm ฿${total}`) + " →"}
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/* STEP: CART                                           */}
        {/* ════════════════════════════════════════════════════ */}
        {step === "cart" && (
          <>
            {cart.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", flex: 1, color: "var(--text3)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 64, margin: "0 auto 16px", display: "block", opacity: 0.4 }}>
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 01-8 0" />
                </svg>
                <p style={{ fontWeight: 600, fontSize: fs, fontFamily: "'Mitr', sans-serif" }}>
                  {lang === "th" ? "ยังไม่มีรายการในตะกร้า" : "Your cart is empty"}
                </p>
              </div>
            ) : (
              <>
                {/* cart items */}
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
                        <div style={{ fontWeight: 700, fontSize: fs - 1, color: "var(--text)", fontFamily: "'Mitr', sans-serif", lineHeight: 1.3 }}>
                          {lang === "th" ? item.name : item.nameEn}
                        </div>
                        <div style={{ fontSize: fs - 2, color: "var(--amber)", fontWeight: 700, fontFamily: "'Mitr', sans-serif" }}>
                          ฿{item.price} × {item.qty} = ฿{item.price * item.qty}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          style={{
                            background: "var(--bg2)", border: "1px solid var(--border)",
                            borderRadius: 8, width: 30, height: 30, cursor: "pointer",
                            fontWeight: 800, fontSize: 18, color: "var(--text2)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >−</button>
                        <span style={{ fontWeight: 800, minWidth: 24, textAlign: "center", fontSize: fs, color: "var(--text)", fontFamily: "'Mitr', sans-serif" }}>
                          {item.qty}
                        </span>
                        <button
                          onClick={() => addToCart(item)}
                          style={{
                            background: "var(--navBg)", color: "var(--goldBright)", border: "none",
                            borderRadius: 8, width: 30, height: 30, cursor: "pointer",
                            fontWeight: 800, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >+</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* total + order button */}
                <div style={{ borderTop: "2px dashed var(--divider)", paddingTop: 20, marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: fs + 2, color: "var(--text)", fontFamily: "'Mitr', sans-serif" }}>
                      {lang === "th" ? "รวมทั้งหมด" : "Total"}
                    </span>
                    <span style={{ fontWeight: 900, fontSize: fs + 6, color: "var(--amber)", fontFamily: "'Mitr', sans-serif" }}>
                      ฿{total}
                    </span>
                  </div>

                  {geoError && (
                    <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: fs - 2, color: "#ef4444", fontFamily: "'Sarabun', sans-serif", lineHeight: 1.5, whiteSpace: "pre-line" }}>
                      {geoError}
                    </div>
                  )}

                  {/* dine-in: order ตรงเลย | takeaway: ไปกรอก form ก่อน */}
                {isTakeaway ? (
  <>
    <button
      disabled
      style={btn("var(--navBg)", "var(--goldBright)", true)}
    >
      {lang === "th" ? "🛵 สั่งกลับบ้าน — เร็วๆ นี้" : "🛵 Takeaway — Coming Soon"}
    </button>
    <div
      style={{
        background: "rgba(96,165,250,0.1)",
        border: "1px solid rgba(96,165,250,0.3)",
        borderRadius: 12,
        padding: "10px 14px",
        marginTop: 10,
        fontSize: fs - 2,
        color: "#60a5fa",
        fontFamily: "'Sarabun', sans-serif",
        textAlign: "center",
        lineHeight: 1.6,
      }}
    >
      {lang === "th"
        ? "⏳ ระบบสั่งกลับบ้านยังไม่เปิดใช้งาน\nจะเปิดให้บริการเร็วๆ นี้ค่ะ"
        : "⏳ Takeaway ordering is not available yet.\nComing soon!"}
    </div>
  </>
) : (
                    <button
                      onClick={handleOrder}
                      disabled={checking}
                      style={btn("var(--navBg)", "var(--goldBright)", checking)}
                    >
                      {checking
                        ? (lang === "th" ? "⏳ กำลังตรวจสอบตำแหน่ง..." : "⏳ Checking location...")
                        : (lang === "th" ? `สั่งอาหาร ฿${total}` : `Place Order ฿${total}`) + " →"}
                    </button>
                  )}

                  <p style={{ textAlign: "center", fontSize: fs - 3, color: "var(--text3)", marginTop: 10, fontFamily: "'Sarabun', sans-serif" }}>
                    📍 {lang === "th" ? "ต้องอยู่ในบริเวณร้านเพื่อสั่งอาหาร" : "Must be at the restaurant to order"}
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}