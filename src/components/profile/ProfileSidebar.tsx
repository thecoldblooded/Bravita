import { User, MapPin, ShoppingBag, Settings, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import { m } from "framer-motion";

interface ProfileSidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

import { useTranslation } from "react-i18next";

export function ProfileSidebar({ activeTab, setActiveTab }: ProfileSidebarProps) {
    const { t } = useTranslation();

    const menuItems = [
        { id: "profile", label: t("profile.sidebar.info"), icon: User },
        { id: "addresses", label: t("profile.sidebar.addresses"), icon: MapPin },
        { id: "orders", label: t("profile.sidebar.orders"), icon: ShoppingBag },
        { id: "support", label: t("profile.sidebar.support"), icon: LifeBuoy },
        { id: "settings", label: t("profile.sidebar.settings"), icon: Settings },
    ];

    return (
        <div className="w-full md:w-64 shrink-0">
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
                            <m.div
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
