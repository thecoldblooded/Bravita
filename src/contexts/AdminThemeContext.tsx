import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";

interface AdminThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const AdminThemeContext = createContext<AdminThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "bravita_admin_theme";

export function AdminThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        // Check localStorage first
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === "light" || stored === "dark") {
            return stored;
        }
        // Default to light
        return "light";
    });

    useEffect(() => {
        // Save to localStorage
        localStorage.setItem(THEME_STORAGE_KEY, theme);

        // Clean up: always remove admin-dark from documentElement
        // The class is applied locally via AdminLayout, not globally
        document.documentElement.classList.remove("admin-dark");
    }, [theme]);

    const toggleTheme = () => {
        setThemeState(prev => prev === "light" ? "dark" : "light");
    };

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    return (
        <AdminThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </AdminThemeContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminTheme() {
    const context = useContext(AdminThemeContext);
    if (!context) {
        throw new Error("useAdminTheme must be used within AdminThemeProvider");
    }
    return context;
}
