# ร้านติดบ้าน — Tidbaan Web App

## โครงสร้างไฟล์

```
src/
├── App.jsx                    ← Entry point หลัก + cart logic
├── data/
│   ├── menuData.js            ← ข้อมูลเมนูและข้อมูลร้าน (แก้ที่นี่ที่เดียว)
│   └── theme.js               ← CSS variables สำหรับ light/dark theme
├── hooks/
│   └── useApp.jsx             ← Context: lang, theme, fontSize
└── components/
    ├── Navbar.jsx             ← Sticky navbar + ปุ่มทุกอย่าง
    ├── HomePage.jsx           ← หน้าแรก + hero + featured
    ├── MenuPage.jsx           ← หน้าเมนูทั้งหมด + filter
    ├── AboutPage.jsx          ← เกี่ยวกับเรา + แผนที่/ติดต่อ
    ├── MenuCard.jsx           ← Card เมนูแต่ละรายการ
    ├── ItemModal.jsx          ← Popup รายละเอียดเมนู
    └── CartDrawer.jsx         ← Drawer ตะกร้าสินค้า
```

## ฟีเจอร์ทั้งหมด

| ฟีเจอร์ | รายละเอียด |
|---|---|
| 🌗 Dark / Light Theme | ปุ่มสลับ ☀️/🌙 บน navbar |
| 🌐 ภาษาไทย / English | ปุ่มสลับ ไทย/EN บน navbar |
| 🔠 ขนาดตัวอักษร | 3 ระดับ: A (normal=15px) · A (large=18px) · A (xlarge=22px) |
| 📱 Responsive | Mobile-first, navbar ปรับตามหน้าจอ |
| 🛒 ตะกร้าสินค้า | เพิ่ม/ลด/สั่ง พร้อม drawer |
| 🔍 รายละเอียดเมนู | กด card → modal popup |
| 📘 Facebook Link | ปุ่มกดเปิด Facebook เพจ |
| ♿ HCI ผู้สูงอายุ | font xlarge=22px + target ใหญ่ขึ้น |

## ขนาดตัวอักษรที่แนะนำ

| ระดับ | Base px | เหมาะสำหรับ |
|---|---|---|
| normal | 15px | ผู้ใช้ทั่วไป |
| large | 18px | ผู้สูงอายุ / สายตาไม่ดีนิดหน่อย |
| xlarge | 22px | ผู้สูงอายุ / Low vision / ต้องการอ่านง่ายมาก |

**หลัก HCI สำหรับผู้สูงอายุ (WCAG 2.1 + Nielsen):**
- Base text ≥ 16–18px
- Line height ≥ 1.6
- Touch target ≥ 44×44px (ระดับ large/xlarge ปุ่มขยายอัตโนมัติ)
- Contrast ratio ≥ 4.5:1 (dark/light theme ทั้งคู่ผ่าน)
- อย่าใช้ placeholder แทน label

## วิธีเพิ่มรูปภาพ

ใน `src/data/menuData.js` แก้ `imageSrc` ของแต่ละเมนู:
```js
imageSrc: "/tidbaan/images/kaprao.jpg",  // วางไฟล์ใน public/images/
```
ถ้า `imageSrc: null` จะแสดง gradient placeholder สีสวยแทนอัตโนมัติ

## วิธีแก้ข้อมูลร้าน

แก้ใน `src/data/menuData.js` ที่ `siteInfo`:
- เวลาเปิด-ปิด: `hours`
- ที่อยู่: `address`  
- เบอร์โทร: `phone`
- Facebook URL: `facebook`
- เรื่องราวร้าน: `story`

## วิธีรัน

```bash
npm install
npm run dev
```
