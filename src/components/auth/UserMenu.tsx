import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthOperations } from "@/hooks/useAuth";
import { toast } from "sonner";
import { User, LogOut, MapPin, ShoppingBag, Settings } from "lucide-react";

export function UserMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { logout, isLoading } = useAuthOperations();
  const [isOpen, setIsOpen] = useState(false);

  if (!session?.user || !user) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      toast.success(t("auth.logout_successful"));
      navigate("/");
    } catch (error) {
      toast.error(t("auth.logout_failed"));
    }
  };

  const displayName =
    user.user_type === "individual"
      ? user.full_name || user.email
      : user.company_name || user.email;


  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="ml-2 md:ml-4 focus:outline-none relative"
        >
          <div className="relative w-10 h-10 flex items-center justify-center bg-transparent rounded-full overflow-hidden shadow-sm hover:shadow-orange-200 transition-all duration-300">
            <div
              style={{ width: '32px', height: '32px' }}
              className="flex items-center justify-center p-0"
              dangerouslySetInnerHTML={{
                __html: `
                  <script src="https://cdn.lordicon.com/lordicon.js"></script>
                    <lord-icon
                        src="https://cdn.lordicon.com/hhljfoaj.json"
                        trigger="hover"
                        stroke="bold"
                        state="hover-looking-around"
                        colors="primary:#121331,secondary:#913710,tertiary:#c74b16"
                        style="width:250px;height:250px">
                    </lord-icon>
                `
              }}
            />
          </div>
        </motion.button>
      </DropdownMenuTrigger>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-semibold">{displayName}</span>
                  <span className="text-xs text-gray-500">{user.email}</span>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4" />
                <span>{t("auth.profile")}</span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate("/addresses")}>
                <MapPin className="mr-2 h-4 w-4" />
                <span>{t("auth.addresses")}</span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate("/orders")}>
                <ShoppingBag className="mr-2 h-4 w-4" />
                <span>{t("auth.my_orders")}</span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>{t("auth.settings")}</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={handleLogout} disabled={isLoading}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t("auth.logout")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </motion.div>
        )}
      </AnimatePresence>
    </DropdownMenu>
  );
}
