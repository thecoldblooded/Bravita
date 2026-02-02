import { User, MapPin, ShoppingBag, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ProfileSidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export function ProfileSidebar({ activeTab, setActiveTab }: ProfileSidebarProps) {
    const menuItems = [
        { id: "profile", label: "Profil Bilgilerim", icon: User },
        { id: "addresses", label: "Adreslerim", icon: MapPin },
        { id: "orders", label: "Siparişlerim", icon: ShoppingBag },
        { id: "settings", label: "Ayarlar", icon: Settings },
    ];

    return (
        <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-orange-100/50 p-2 space-y-1">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm relative group",
                            activeTab === item.id
                                ? "text-orange-600 bg-orange-50"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                    >
                        {activeTab === item.id && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute left-0 w-1 h-8 bg-orange-500 rounded-r-full"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            />
                        )}
                        <item.icon
                            size={18}
                            className={cn(
                                "transition-colors",
                                activeTab === item.id ? "text-orange-500" : "text-gray-400 group-hover:text-gray-600"
                            )}
                        />
                        {item.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
