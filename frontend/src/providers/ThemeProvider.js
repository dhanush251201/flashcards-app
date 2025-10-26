import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
const ThemeContext = createContext(undefined);
const STORAGE_KEY = "flashdecks-theme";
const getInitialTheme = () => {
    if (typeof window === "undefined") {
        return "light";
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
        return stored;
    }
    return "light";
};
export const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = useState(getInitialTheme);
    useEffect(() => {
        const root = document.documentElement;
        if (theme === "dark") {
            root.classList.add("dark");
        }
        else {
            root.classList.remove("dark");
        }
        window.localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);
    const value = useMemo(() => ({
        theme,
        toggleTheme: () => setThemeState((prev) => (prev === "dark" ? "light" : "dark")),
        setTheme: (value) => setThemeState(value)
    }), [theme]);
    return _jsx(ThemeContext.Provider, { value: value, children: children });
};
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within ThemeProvider");
    }
    return context;
};
