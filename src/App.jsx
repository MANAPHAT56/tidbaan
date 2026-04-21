import { useState, useEffect } from "react";
import { AppProvider, useApp } from "./hooks/useApp";
import { getThemeVars } from "./data/theme";
import { menu } from "./data/menuData";
import Navbar from "./components/Navbar";
import HomePage from "./components/HomePage";
import MenuPage from "./components/MenuPage";
import AboutPage from "./components/AboutPage";
import CartDrawer from "./components/CartDrawer";
import ItemModal from "./components/ItemModal";

function AppInner() {
  const { theme, baseFontSize } = useApp();
  const [page, setPage] = useState("home");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Apply CSS variables globally
  useEffect(() => {
    const vars = getThemeVars(theme);
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }, [theme]);

  const addToCart = (item) =>
    setCart((prev) => {
      const ex = prev.find((c) => c.id === item.id);
      return ex ? prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c)) : [...prev, { ...item, qty: 1 }];
    });

  const removeFromCart = (id) =>
    setCart((prev) => {
      const ex = prev.find((c) => c.id === id);
      return ex.qty === 1 ? prev.filter((c) => c.id !== id) : prev.map((c) => (c.id === id ? { ...c, qty: c.qty - 1 } : c));
    });

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  return (
    <>
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Mitr:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,700;1,400;1,700&family=Sarabun:wght@400;600;700&display=swap"
        rel="stylesheet"
      />

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { font-size: ${baseFontSize}px; }
        body { background: var(--bg); color: var(--text); transition: background 0.3s, color 0.3s; }
        
        /* Mobile: hide text nav links, keep icon controls */
        @media (max-width: 680px) {
          .nav-links { display: none !important; }
        }

        /* Mobile menu page responsive */
        @media (max-width: 480px) {
          .menu-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
        }

        /* Smooth scrolling */
        html { scroll-behavior: smooth; }

        /* Button focus outline */
        button:focus-visible, a:focus-visible {
          outline: 3px solid var(--goldBright);
          outline-offset: 3px;
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'Mitr', sans-serif" }}>
        <Navbar
          page={page}
          setPage={setPage}
          cartCount={cartCount}
          onCartOpen={() => setCartOpen(true)}
        />

        {page === "home" && (
          <HomePage
            setPage={setPage}
            menu={menu}
            addToCart={addToCart}
            onItemClick={setSelectedItem}
          />
        )}
        {page === "menu" && (
          <MenuPage
            menu={menu}
            addToCart={addToCart}
            onItemClick={setSelectedItem}
          />
        )}
        {page === "about" && <AboutPage />}

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

        {selectedItem && (
          <ItemModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            addToCart={addToCart}
          />
        )}
      </div>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
