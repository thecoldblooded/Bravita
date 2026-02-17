import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthOperations } from "@/hooks/useAuth";
import { toast } from "sonner";
import { User, UserRound, LogOut, MapPin, ShoppingBag, Settings, ChevronRight, Shield } from "lucide-react";
import { translateError } from "@/lib/errorTranslator";

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
  delay?: number;
}

const MenuItem = ({ icon, label, onClick, variant = "default", delay = 0 }: MenuItemProps) => (
  <motion.button
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.2 }}
    onClick={onClick}
    className={`
      group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
      transition-all duration-200 cursor-pointer
      ${variant === "danger"
        ? "text-red-600 hover:bg-red-50"
        : "text-gray-700 hover:bg-orange-50 hover:text-orange-600"
      }
    `}
  >
    <span className={`
      flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200
      ${variant === "danger"
        ? "bg-red-100 text-red-500 group-hover:bg-red-200"
        : "bg-gray-100 text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-600"
      }
    `}>
      {icon}
    </span>
    <span className="flex-1 text-sm font-medium text-left">{label}</span>
    <ChevronRight className={`
      w-4 h-4 opacity-0 -translate-x-2 transition-all duration-200
      group-hover:opacity-100 group-hover:translate-x-0
      ${variant === "danger" ? "text-red-400" : "text-orange-400"}
    `} />
  </motion.button>
);

export function UserMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, session, isAdmin } = useAuth();
  const { logout, isLoading } = useAuthOperations();
  const [isOpen, setIsOpen] = useState(false);

  if (!session?.user || !user) {
    return null;
  }

  const handleLogout = async () => {
    // Close menu immediately for instant feedback
    setIsOpen(false);

    try {
      // Start logout process (now optimized to be fast)
      await logout();
      toast.success(t("auth.logout_successful"));
    } catch (error) {
      console.error("Logout flow error:", error);
      toast.error(translateError(error, t));
    }

    // Always navigate to home
    navigate("/", { replace: true });
  };

  const displayName =
    user.user_type === "individual"
      ? user.full_name || user.email
      : user.company_name || user.email;

  const menuItems = [
    // Admin Panel - only visible for admin users
    ...(isAdmin ? [{ icon: <Shield className="w-4 h-4" />, label: t("auth.admin_panel", "Admin Panel"), path: "/admin", isAdmin: true }] : []),
    { icon: <User className="w-4 h-4" />, label: t("auth.profile"), path: "/profile?tab=profile" },
    { icon: <MapPin className="w-4 h-4" />, label: t("auth.addresses"), path: "/profile?tab=addresses" },
    { icon: <ShoppingBag className="w-4 h-4" />, label: t("auth.my_orders"), path: "/profile?tab=orders" },
    { icon: <Settings className="w-4 h-4" />, label: t("auth.settings"), path: "/profile?tab=settings" },
  ];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="ml-2 md:ml-4 focus:outline-none relative"
          aria-label={t("auth.user_menu")}
        >
          <div className="relative w-11 h-11 flex items-center justify-center bg-linear-to-br from-orange-100 to-orange-50 rounded-full overflow-hidden shadow-sm hover:shadow-orange-200 transition-all duration-300 border border-orange-200">
            <UserRound className="w-6 h-6 text-orange-600" />
          </div>
        </motion.button>
      </DropdownMenuTrigger>

      <AnimatePresence>
        {isOpen && (
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-72 p-0 bg-white/95 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden"
          >

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-linear-to-br from-orange-500 via-orange-400 to-amber-400 p-4"
            >
              <div className="flex items-center gap-3">
                {/* Profile Avatar */}
                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center border-2 border-white/50 overflow-hidden">
                  <UserRound className="w-8 h-8 text-orange-600" />
                </div>
                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{displayName}</p>
                  <p className="text-xs text-white/80 truncate">
                    {user.phone || user.email}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Menu Items */}
            <div className="p-2">
              {menuItems.map((item, index) => (
                <MenuItem
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => {
                    navigate(item.path);
                    setIsOpen(false);
                  }}
                  delay={0.05 * (index + 1)}
                />
              ))}
            </div>

            {/* Separator */}
            <div className="mx-3 h-px bg-linear-to-r from-transparent via-gray-200 to-transparent" />

            {/* Logout Section */}
            <div className="p-2">
              <MenuItem
                icon={<LogOut className="w-4 h-4" />}
                label={t("auth.logout")}
                onClick={handleLogout}
                variant="danger"
                delay={0.25}
              />
            </div>
          </DropdownMenuContent>
        )}
      </AnimatePresence>
    </DropdownMenu>
  );
}
