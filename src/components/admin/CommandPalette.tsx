import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import {
    Search,
    Package,
    Users,
    ShoppingCart,
    Tag,
    LayoutDashboard,
    ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

export const CommandPalette = () => {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const { theme } = useAdminTheme();
    const isDark = theme === "dark";

    // Toggle the menu when ⌘K is pressed
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    // Dark mode styles
    const modalBg = isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100";
    const inputBorder = isDark ? "border-gray-700" : "border-gray-100";
    const inputText = isDark ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400";
    const searchIcon = isDark ? "text-gray-500" : "text-gray-400";
    const escBadge = isDark ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-400";
    const groupHeading = isDark ? "text-gray-500" : "text-gray-400";
    const groupBorder = isDark ? "border-gray-700" : "border-gray-50";
    const emptyText = isDark ? "text-gray-400" : "text-gray-500";
    const hintButton = isDark
        ? "bg-gray-800/80 backdrop-blur-md border-gray-700 text-gray-400 hover:border-orange-500/50 hover:text-orange-400"
        : "bg-white/80 backdrop-blur-md border-gray-200 text-gray-500 hover:border-orange-200 hover:text-orange-600";
    const hintBadge = isDark ? "bg-gray-700" : "bg-gray-100";

    return (
        <>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-100 bg-gray-900/50 backdrop-blur-sm p-4 md:p-20"
                        onClick={() => setOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: -20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: -20 }}
                            className={`max-w-2xl mx-auto rounded-2xl shadow-2xl border overflow-hidden ${modalBg}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Command className="flex flex-col h-full">
                                <div className={`flex items-center border-b ${inputBorder} px-4 py-3`}>
                                    <Search className={`w-5 h-5 ${searchIcon} mr-3`} />
                                    <Command.Input
                                        placeholder="Bir işlem veya sayfa ara..."
                                        className={`flex-1 bg-transparent border-none outline-none ${inputText} focus:ring-0`}
                                    />
                                    <div className={`flex items-center gap-1 ml-3 px-1.5 py-0.5 rounded text-[10px] font-bold ${escBadge}`}>
                                        <span>ESC</span>
                                    </div>
                                </div>

                                <Command.List className="max-h-87.5 overflow-y-auto p-2 pb-4 scrollbar-thin scrollbar-thumb-gray-200">
                                    <Command.Empty className={`py-6 text-center text-sm ${emptyText}`}>
                                        Sonuç bulunamadı.
                                    </Command.Empty>

                                    <Command.Group heading="Hızlı Erişim" className={`px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest ${groupHeading}`}>
                                        <Item icon={LayoutDashboard} onSelect={() => runCommand(() => navigate("/admin"))} isDark={isDark}>
                                            Dashboard
                                        </Item>
                                        <Item icon={ShoppingCart} onSelect={() => runCommand(() => navigate("/admin/orders"))} isDark={isDark}>
                                            Siparişler
                                        </Item>
                                        <Item icon={Package} onSelect={() => runCommand(() => navigate("/admin/products"))} isDark={isDark}>
                                            Ürünler
                                        </Item>
                                        <Item icon={Tag} onSelect={() => runCommand(() => navigate("/admin/promotions"))} isDark={isDark}>
                                            Promosyon Kodları
                                        </Item>
                                        <Item icon={Users} onSelect={() => runCommand(() => navigate("/admin/admins"))} isDark={isDark}>
                                            Yöneticiler
                                        </Item>
                                    </Command.Group>

                                    <Command.Group heading="Aksiyonlar" className={`px-2 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest border-t mt-2 ${groupHeading} ${groupBorder}`}>
                                        <Item icon={ArrowRight} onSelect={() => runCommand(() => window.location.href = "/")} isDark={isDark}>
                                            Siteye Geri Dön
                                        </Item>
                                    </Command.Group>
                                </Command.List>
                            </Command>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Shortcut hint for Admin Panel */}
            <div className="fixed bottom-6 right-6 z-40 hidden md:block">
                <button
                    onClick={() => setOpen(true)}
                    className={`${hintButton} px-3 py-1.5 rounded-full text-xs font-medium shadow-sm transition-all flex items-center gap-2`}
                >
                    <Search className="w-3 h-3" />
                    <span>Ara</span>
                    <div className="flex gap-0.5 opacity-50">
                        <span className={`${hintBadge} px-1 rounded text-[10px]`}>Ctrl</span>
                        <span className={`${hintBadge} px-1 rounded text-[10px]`}>K</span>
                    </div>
                </button>
            </div>
        </>
    );
};

const Item = ({ children, icon: Icon, onSelect, isDark }: { children: React.ReactNode; icon: React.ElementType; onSelect: () => void; isDark: boolean }) => {
    const itemBg = isDark
        ? "aria-selected:bg-orange-500/20 aria-selected:text-orange-400"
        : "aria-selected:bg-orange-50 aria-selected:text-orange-900";
    const iconBg = isDark
        ? "bg-gray-700 group-aria-selected:bg-gray-600 group-aria-selected:border-orange-500/30"
        : "bg-gray-50 group-aria-selected:bg-white group-aria-selected:border-orange-100";
    const iconColor = isDark
        ? "text-gray-400 group-aria-selected:text-orange-400"
        : "text-gray-500 group-aria-selected:text-orange-600";
    const textColor = isDark ? "text-gray-200" : "";

    return (
        <Command.Item
            onSelect={onSelect}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer ${itemBg} group transition-colors`}
        >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg} group-aria-selected:shadow-sm border border-transparent transition-all`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <span className={`text-sm font-medium ${textColor}`}>{children}</span>
        </Command.Item>
    );
};
