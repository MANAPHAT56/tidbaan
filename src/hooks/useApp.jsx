import { createContext, useContext, useState } from "react";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [lang, setLang] = useState("th"); // "th" | "en"
  const [theme, setTheme] = useState("light"); // "light" | "dark"
  const [fontSize, setFontSize] = useState("normal"); // "normal" | "large" | "xlarge"

  const t = (obj) => (typeof obj === "object" ? obj[lang] ?? obj.th : obj);

  const fontSizeMap = { normal: 15, large: 18, xlarge: 22 };
  const baseFontSize = fontSizeMap[fontSize];

  return (
    <AppContext.Provider
      value={{ lang, setLang, theme, setTheme, fontSize, setFontSize, t, baseFontSize }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
