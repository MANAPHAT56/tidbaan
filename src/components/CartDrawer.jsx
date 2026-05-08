import { useState, useEffect, useRef } from "react";
import { useApp } from "../hooks/useApp";

const WORKER_URL = "https://food-order-worker.ttpho5874.workers.dev";

function QRImage({ src, size = 220 }) {
  return (
    <img
      src={src}
      alt="PromptPay QR Code"
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

  const [tableNumber, setTableNumber] = useState(null);
  const [step, setStep] = useState("cart");
  const [checking, setChecking] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [formError, setFormError] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  // "expired" | "failed" | null — ใช้แสดง message ต่างกันใน step fail
  const [failReason, setFailReason] = useState(null);

  const pollingRef = useRef(null);
  const activeOrderRef = useRef(null);
  const expireTimerRef = useRef(null);

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

  const isTakeaway = !tableNumber;

  // ── warn before unload เมื่ออยู่หน้า QR ──────────────────
  useEffect(() => {
    if (step !== "qr") return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [step]);

  // ── cleanup เมื่อ unmount ─────────────────────────────────
  useEffect(() => {
    return () => {
      stopPolling();
      clearExpireTimer();
      activeOrderRef.current = null;
    };
  }, []);

  // ── reset เมื่อ ordered กลับเป็น false (ปิด drawer) ──────
  useEffect(() => {
    if (!ordered) {
      setStep("cart");
      setGeoError(null);
      setPhone("");
      setAddress("");
      setFormError("");
      setQrImageUrl(null);
      setOrderId(null);
      setPaymentIntentId(null);
      setPaymentStatus(null);
      setFailReason(null);
      stopPolling();
      clearExpireTimer();
      activeOrderRef.current = null;
    }
  }, [ordered]);

  function stopPolling() {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = null;
  }

  function clearExpireTimer() {
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    expireTimerRef.current = null;
  }

  // ── cancel order ที่ worker + update UI ──────────────────
  async function handleExpire(oid, piId) {
    // guard: ถ้า order นี้ไม่ใช่ตัว active แล้ว ไม่ทำอะไร
    if (activeOrderRef.current !== oid) return;

    stopPolling();
    activeOrderRef.current = null;

    // เรียก worker ให้ cancel Stripe PI + set KV → expired
    try {
      await fetch(`${WORKER_URL}/cancel-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: oid, paymentIntentId: piId }),
      });
    } catch (e) {
      console.error("cancel-order fetch error:", e);
    }

    setPaymentStatus("expired");
    setFailReason("expired");
    setStep("fail");
  }

  function startPolling(oid, piId) {
    stopPolling();
    clearExpireTimer();
    activeOrderRef.current = oid;

    // ── polling ทุก 3 วิ ──────────────────────────────────
    pollingRef.current = setInterval(async () => {
      if (activeOrderRef.current !== oid) {
        clearInterval(pollingRef.current);
        return;
      }
      try {
        const res = await fetch(`${WORKER_URL}/payment-status?orderId=${oid}`);
        const data = await res.json();
        if (activeOrderRef.current !== oid) return;

        if (data.status === "success") {
          stopPolling();
          clearExpireTimer();
          setPaymentStatus("success");
          setStep("success");
          setOrdered(true);
        } else if (data.status === "fail") {
          stopPolling();
          clearExpireTimer();
          setPaymentStatus("fail");
          setFailReason("failed");
          setStep("fail");
        } else if (data.status === "expired") {
          // worker บอกว่า expired แล้ว (อาจมาจาก webhook canceled)
          stopPolling();
          clearExpireTimer();
          setPaymentStatus("expired");
          setFailReason("expired");
          setStep("fail");
        }
      } catch (_) {}
    }, 3000);

    // ── หมดอายุใน 10 นาที → cancel ────────────────────────
    expireTimerRef.current = setTimeout(() => {
      handleExpire(oid, piId);
    }, 10 * 60 * 1000);
  }

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
            setQrImageUrl(data.qrImageUrl);
            setOrderId(data.orderId);
            setPaymentIntentId(data.paymentIntentId);
            setStep("qr");
            startPolling(data.orderId, data.paymentIntentId);
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
    <div style={{ fontSize: fs - 2, fontWeight: 700, color: "var(--text2)", fontFamily: "'Mitr', sans-serif", marginBottom: 6 }}>
      {text}
    </div>
  );

  // ── fail message ตาม reason ───────────────────────────────
  const failTitle = failReason === "expired"
    ? (lang === "th" ? "QR หมดอายุแล้ว" : "QR Code Expired")
    : (lang === "th" ? "การชำระเงินไม่สำเร็จ" : "Payment Failed");

  const failBody = failReason === "expired"
    ? (lang === "th"
        ? "QR Code หมดอายุหลัง 10 นาที\nกรุณาสั่งใหม่อีกครั้ง"
        : "QR Code expired after 10 minutes.\nPlease place a new order.")
    : (lang === "th"
        ? "ยังไม่ได้รับการยืนยันการโอน\nกรุณาลองใหม่หรือติดต่อพนักงาน"
        : "Payment not confirmed.\nPlease try again or contact staff.");

  const failIcon = failReason === "expired" ? "⏰" : "❌";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ flex: 1, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div style={{ width: 400, maxWidth: "100vw", background: "var(--drawerBg)", height: "100%", overflow: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", borderLeft: "1px solid var(--border)", boxShadow: "-8px 0 48px rgba(0,0,0,0.3)" }}>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h3 style={{ fontSize: fs + 6, fontWeight: 800, margin: 0, color: "var(--text)", fontFamily: "'Mitr', sans-serif" }}>
              {step === "qr" ? (lang === "th" ? "💳 ชำระเงิน" : "💳 Payment") : step === "form" ? (lang === "th" ? "🛵 สั่งกลับบ้าน" : "🛵 Takeaway") : (lang === "th" ? "🛒 ตะกร้า" : "🛒 Your Cart")}
            </h3>
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
            <button onClick={onClose} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "50%", width: 38, height: 38, cursor: "pointer", fontSize: 18, color: "var(--text2)", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          )}
        </div>

        {/* SUCCESS */}
        {step === "success" && (
          <div style={{ textAlign: "center", padding: "60px 0", flex: 1 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <h4 style={{ fontWeight: 800, fontSize: fs + 8, color: "var(--text)", fontFamily: "'Mitr', sans-serif", marginBottom: 8 }}>
              {lang === "th" ? "ชำระเงินสำเร็จ!" : "Payment Successful!"}
            </h4>
            <p style={{ color: "var(--text3)", fontSize: fs, fontFamily: "'Sarabun', sans-serif" }}>
              {isTakeaway ? (lang === "th" ? "เราจะโทรยืนยันนัดรับของค่ะ" : "We'll call to confirm delivery.") : (lang === "th" ? "รอรับอาหารได้เลยค่ะ" : "Your food is being prepared.")}
            </p>
            <button onClick={() => { setOrdered(false); onClose(); }} style={{ ...btn("var(--navBg)", "var(--goldBright)", false), marginTop: 28, width: "auto", padding: "14px 36px" }}>
              {lang === "th" ? "ปิด" : "Close"}
            </button>
          </div>
        )}

        {/* FAIL / EXPIRED */}
        {step === "fail" && (
          <div style={{ textAlign: "center", padding: "60px 0", flex: 1 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>{failIcon}</div>
            <h4 style={{ fontWeight: 800, fontSize: fs + 6, color: failReason === "expired" ? "var(--amber)" : "#ef4444", fontFamily: "'Mitr', sans-serif", marginBottom: 8 }}>
              {failTitle}
            </h4>
            <p style={{ color: "var(--text3)", fontSize: fs, fontFamily: "'Sarabun', sans-serif", marginBottom: 28, whiteSpace: "pre-line" }}>
              {failBody}
            </p>
            <button
              onClick={() => {
                setStep("cart");
                setQrImageUrl(null);
                setOrderId(null);
                setPaymentIntentId(null);
                setPaymentStatus(null);
                setFailReason(null);
              }}
              style={{ ...btn("var(--navBg)", "var(--goldBright)", false), width: "auto", padding: "14px 32px" }}
            >
              {lang === "th" ? "สั่งใหม่" : "New Order"}
            </button>
          </div>
        )}

        {/* QR PAYMENT */}
        {step === "qr" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <div style={{ background: "linear-gradient(135deg,#635bff,#4f46e5)", borderRadius: 16, padding: "12px 24px", textAlign: "center" }}>
              <div style={{ color: "#fff", fontFamily: "'Mitr', sans-serif", fontWeight: 800, fontSize: fs + 2 }}>💳 พร้อมเพย์ · Stripe</div>
              <div style={{ color: "rgba(255,255,255,0.8)", fontSize: fs - 2, fontFamily: "'Sarabun', sans-serif", marginTop: 4 }}>PromptPay via Stripe</div>
            </div>

            <div style={{ background: "#fff", borderRadius: 20, padding: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
              {qrImageUrl ? (
                <QRImage src={qrImageUrl} size={220} />
              ) : (
                <div style={{ width: 220, height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 14, textAlign: "center", padding: 16 }}>
                  ไม่สามารถโหลด QR<br />กรุณาแจ้งพนักงาน
                </div>
              )}
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: fs - 2, color: "var(--text3)", fontFamily: "'Sarabun', sans-serif" }}>
                {lang === "th" ? "ยอดที่ต้องชำระ" : "Amount to pay"}
              </div>
              <div style={{ fontSize: fs + 18, fontWeight: 900, color: "var(--amber)", fontFamily: "'Mitr', sans-serif", lineHeight: 1.1 }}>
                ฿{Number(total).toLocaleString()}
              </div>
              <div style={{ marginTop: 10, fontSize: fs - 2, color: "var(--text2)", fontFamily: "'Sarabun', sans-serif", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)", padding: "8px 14px", borderRadius: 999, display: "inline-block", fontWeight: 600 }}>
                🍳 {lang === "th" ? "อาหารใช้เวลาประมาณ 8–15 นาที" : "Estimated prep time: 8–15 min"}
              </div>
            </div>

            {/* ⚠️ อย่ารีเฟรช */}
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 12, padding: "10px 16px", textAlign: "center", fontSize: fs - 3, color: "#ef4444", fontFamily: "'Sarabun', sans-serif", fontWeight: 600, lineHeight: 1.6 }}>
              ⚠️ {lang === "th"
                ? "กรุณาอย่ารีเฟรชหรือปิดหน้าเว็บ จนกว่าการชำระเงินจะสำเร็จ"
                : "Do not refresh or close this page until payment is confirmed"}
            </div>

            <div style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 12, padding: "12px 20px", textAlign: "center", fontSize: fs - 2, color: "var(--amber)", fontFamily: "'Sarabun', sans-serif" }}>
              ⏳ {lang === "th" ? "รอการยืนยันการโอนเงิน..." : "Waiting for payment confirmation..."}
              <br />
              <span style={{ fontSize: fs - 4, color: "var(--text3)", marginTop: 4, display: "block" }}>
                {lang === "th" ? "หน้านี้จะอัปเดตอัตโนมัติ • QR หมดอายุใน 10 นาที" : "Auto-updates • QR expires in 10 min"}
              </span>
            </div>

            {orderId && (
              <div style={{ fontSize: fs - 4, color: "var(--text3)", fontFamily: "'Sarabun', sans-serif" }}>
                Order ID: {orderId}
              </div>
            )}
          </div>
        )}

        {/* FORM */}
        {step === "form" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "var(--surface)", borderRadius: 14, padding: "14px 16px", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: fs - 1, fontWeight: 700, color: "var(--text2)", fontFamily: "'Mitr', sans-serif", marginBottom: 8 }}>
                {lang === "th" ? "สรุปรายการ" : "Order Summary"}
              </div>
              {cart.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: fs - 2, color: "var(--text)", fontFamily: "'Sarabun', sans-serif", marginBottom: 4 }}>
                  <span>{lang === "th" ? item.name : item.nameEn} x{item.qty}</span>
                  <span style={{ color: "var(--amber)", fontWeight: 700 }}>฿{item.price * item.qty}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px dashed var(--divider)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: fs, color: "var(--amber)", fontFamily: "'Mitr', sans-serif" }}>
                <span>{lang === "th" ? "รวม" : "Total"}</span>
                <span>฿{Number(total).toLocaleString()}</span>
              </div>
            </div>

            <div>
              {label(lang === "th" ? "📱 เบอร์โทรศัพท์ *" : "📱 Phone Number *")}
              <input type="tel" inputMode="numeric" placeholder="0XX-XXX-XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
            </div>

            <div>
              {label(lang === "th" ? "🏠 ที่อยู่จัดส่ง เช่น ตึกอะไร (ไม่บังคับ)" : "🏠 Delivery Address (optional)")}
              <textarea placeholder={lang === "th" ? "ตึก A2..." : "House no., street..."} value={address} onChange={(e) => setAddress(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
              <div style={{ fontSize: fs - 4, color: "var(--text3)", fontFamily: "'Sarabun', sans-serif", marginTop: 6 }}>
                📍 {lang === "th" ? "หากไม่กรอก ระบบจะใช้ตำแหน่ง GPS ของคุณ" : "If blank, GPS location will be used"}
              </div>
            </div>

            {(formError || geoError) && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", fontSize: fs - 2, color: "#ef4444", fontFamily: "'Sarabun', sans-serif" }}>
                {formError || geoError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
              <button onClick={() => { setStep("cart"); setFormError(""); setGeoError(null); }} style={{ ...btn("var(--bg2)", "var(--text2)", false), width: "auto", padding: "14px 20px", fontSize: fs, flex: "0 0 auto" }}>←</button>
              <button onClick={handleFormNext} disabled={checking} style={btn("var(--navBg)", "var(--goldBright)", checking)}>
                {checking ? (lang === "th" ? "⏳ กำลังตรวจสอบ..." : "⏳ Checking...") : (lang === "th" ? `ยืนยัน ฿${Number(total).toLocaleString()}` : `Confirm ฿${Number(total).toLocaleString()}`) + " →"}
              </button>
            </div>
          </div>
        )}

        {/* CART */}
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
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                  {cart.map((item) => (
                    <div key={item.id} style={{ background: "var(--surface)", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, border: "1px solid var(--border)" }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${item.gradientFrom}, ${item.gradientTo})`, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: fs - 1, color: "var(--text)", fontFamily: "'Mitr', sans-serif", lineHeight: 1.3 }}>
                          {lang === "th" ? item.name : item.nameEn}
                        </div>
                        <div style={{ fontSize: fs - 2, color: "var(--amber)", fontWeight: 700, fontFamily: "'Mitr', sans-serif" }}>
                          ฿{item.price} x {item.qty} = ฿{item.price * item.qty}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={() => removeFromCart(item.id)} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontWeight: 800, fontSize: 18, color: "var(--text2)", display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
                        <span style={{ fontWeight: 800, minWidth: 24, textAlign: "center", fontSize: fs, color: "var(--text)", fontFamily: "'Mitr', sans-serif" }}>{item.qty}</span>
                        <button onClick={() => addToCart(item)} style={{ background: "var(--navBg)", color: "var(--goldBright)", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontWeight: 800, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: "2px dashed var(--divider)", paddingTop: 20, marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: fs + 2, color: "var(--text)", fontFamily: "'Mitr', sans-serif" }}>{lang === "th" ? "รวมทั้งหมด" : "Total"}</span>
                    <span style={{ fontWeight: 900, fontSize: fs + 6, color: "var(--amber)", fontFamily: "'Mitr', sans-serif" }}>฿{Number(total).toLocaleString()}</span>
                  </div>

                  {geoError && (
                    <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: fs - 2, color: "#ef4444", fontFamily: "'Sarabun', sans-serif", lineHeight: 1.5, whiteSpace: "pre-line" }}>
                      {geoError}
                    </div>
                  )}

                  {isTakeaway ? (
                    <button onClick={() => { setGeoError(null); setStep("form"); }} style={btn("var(--navBg)", "var(--goldBright)", false)}>
                      {lang === "th" ? "กรอกข้อมูลจัดส่ง →" : "Enter Delivery Info →"}
                    </button>
                  ) : (
                    <button onClick={handleOrder} disabled={checking} style={btn("var(--navBg)", "var(--goldBright)", checking)}>
                      {checking ? (lang === "th" ? "⏳ กำลังตรวจสอบตำแหน่ง..." : "⏳ Checking location...") : (lang === "th" ? `สั่งอาหาร ฿${Number(total).toLocaleString()}` : `Place Order ฿${Number(total).toLocaleString()}`) + " →"}
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