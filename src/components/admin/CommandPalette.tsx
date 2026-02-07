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

export const CommandPalette = () => {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

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
                            className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Command className="flex flex-col h-full">
                                <div className="flex items-center border-b border-gray-100 px-4 py-3">
                                    <Search className="w-5 h-5 text-gray-400 mr-3" />
                                    <Command.Input
                                        placeholder="Bir işlem veya sayfa ara..."
                                        className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 focus:ring-0"
                                    />
                                    <div className="flex items-center gap-1 ml-3 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-gray-400">
                                        <span>ESC</span>
                                    </div>
                                </div>

                                <Command.List className="max-h-87.5 overflow-y-auto p-2 pb-4 scrollbar-thin scrollbar-thumb-gray-200">
                                    <Command.Empty className="py-6 text-center text-sm text-gray-500">
                                        Sonuç bulunamadı.
                                    </Command.Empty>

                                    <Command.Group heading="Hızlı Erişim" className="px-2 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        <Item icon={LayoutDashboard} onSelect={() => runCommand(() => navigate("/admin"))}>
                                            Dashboard
                                        </Item>
                                        <Item icon={ShoppingCart} onSelect={() => runCommand(() => navigate("/admin/orders"))}>
                                            Siparişler
                                        </Item>
                                        <Item icon={Package} onSelect={() => runCommand(() => navigate("/admin/products"))}>
                                            Ürünler
                                        </Item>
                                        <Item icon={Tag} onSelect={() => runCommand(() => navigate("/admin/promotions"))}>
                                            Promosyon Kodları
                                        </Item>
                                        <Item icon={Users} onSelect={() => runCommand(() => navigate("/admin/admins"))}>
                                            Yöneticiler
                                        </Item>
                                    </Command.Group>

                                    <Command.Group heading="Aksiyonlar" className="px-2 pt-4 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-t border-gray-50 mt-2">
                                        <Item icon={ArrowRight} onSelect={() => runCommand(() => window.location.href = "/")}>
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
                    className="bg-white/80 backdrop-blur-md border border-gray-200 text-gray-500 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm hover:border-orange-200 hover:text-orange-600 transition-all flex items-center gap-2"
                >
                    <Search className="w-3 h-3" />
                    <span>Ara</span>
                    <div className="flex gap-0.5 opacity-50">
                        <span className="bg-gray-100 px-1 rounded text-[10px]">Ctrl</span>
                        <span className="bg-gray-100 px-1 rounded text-[10px]">K</span>
                    </div>
                </button>
            </div>
        </>
    );
};

const Item = ({ children, icon: Icon, onSelect }: { children: React.ReactNode; icon: React.ElementType; onSelect: () => void }) => {
    return (
        <Command.Item
            onSelect={onSelect}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer aria-selected:bg-orange-50 aria-selected:text-orange-900 group transition-colors"
        >
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-aria-selected:bg-white group-aria-selected:shadow-sm border border-transparent group-aria-selected:border-orange-100 transition-all">
                <Icon className="w-4 h-4 text-gray-500 group-aria-selected:text-orange-600" />
            </div>
            <span className="text-sm font-medium">{children}</span>
        </Command.Item>
    );
};
