import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import transitionGif from "@/assets/Untitled design.gif";

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
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        // Save to localStorage
        localStorage.setItem(THEME_STORAGE_KEY, theme);

        // Clean up: always remove admin-dark from documentElement
        // The class is applied locally via AdminLayout, not globally
        document.documentElement.classList.remove("admin-dark");
    }, [theme]);

    const toggleTheme = () => {
        if (!document.startViewTransition) {
            setThemeState(prev => prev === "light" ? "dark" : "light");
            return;
        }

        setIsTransitioning(true);
        const transition = document.startViewTransition(() => {
            setThemeState(prev => prev === "light" ? "dark" : "light");
        });

        transition.finished.then(() => {
            setIsTransitioning(false);
        }).catch(() => {
            setIsTransitioning(false);
        });
    };

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    return (
        <AdminThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
            {isTransitioning && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/10 backdrop-blur-[2px] pointer-events-none animate-fade-in">
                    <img 
                        src={transitionGif} 
                        className="w-56 h-56 object-contain" 
                        alt="Theme Transition" 
                    />
                </div>
            )}
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
