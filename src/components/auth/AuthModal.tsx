import { useState } from "react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { m } from "framer-motion";
import loginVideo from "@/assets/optimized/login-compressed.mp4";
import bravitaLogo from "@/assets/bravita-logo.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
const LoginForm = React.lazy(() => import("./LoginForm").then(module => ({ default: module.LoginForm })));
const SignupForm = React.lazy(() => import("./SignupForm").then(module => ({ default: module.SignupForm })));

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "login" | "signup";
}

export function AuthModal({
  open,
  onOpenChange,
  defaultTab = "login",
}: AuthModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

  // Sync activeTab with defaultTab when modal opens
  React.useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  const handleSuccess = () => {
    onOpenChange(false);
  };

  // Strict scroll lock for Lenis
  React.useEffect(() => {
    if (!open) return;

    // Handle Lenis (Smooth Scroll)
    const lenis = (window as unknown as { lenis: { stop: () => void; start: () => void } }).lenis;
    if (lenis) {
      lenis.stop();
    }

    return () => {
      // Restore Lenis
      if (lenis) {
        lenis.start();
      }
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent
        className="max-w-4xl p-0 overflow-hidden h-dvh max-h-dvh md:h-auto md:max-h-150 border-none shadow-2xl"

      >
        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          {/* Left Section - Forms */}
          <m.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full md:w-1/2 p-6 md:p-8 bg-linear-to-br from-orange-50 to-white overflow-y-auto custom-scrollbar"
            data-lenis-prevent
          >
            <div className="flex flex-col items-center mb-8">
              <img src={bravitaLogo} alt="Bravita" className="h-16 w-auto mb-6" />
              <DialogHeader className="w-full text-center">
                <DialogTitle className="text-2xl font-black text-gray-900 text-center w-full">
                  {activeTab === "login"
                    ? t("auth.login_to_account")
                    : t("auth.create_account")}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Hesabınıza giriş yapın veya yeni bir hesap oluşturun.
                </DialogDescription>
              </DialogHeader>
            </div>

            <React.Suspense fallback={<div className="min-h-75 flex items-center justify-center text-gray-400 capitalize">{t("common.loading") || "Yükleniyor..."}</div>}>
              <m.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === "login" ? (
                  <LoginForm
                    onSuccess={handleSuccess}
                    onSwitchToSignup={() => setActiveTab("signup")}
                  />
                ) : (
                  <SignupForm
                    onSuccess={handleSuccess}
                    onSwitchToLogin={() => setActiveTab("login")}
                  />
                )}
              </m.div>
            </React.Suspense>
          </m.div>

          {/* Right Section - Video (Hidden on mobile) */}
          <m.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="hidden md:flex w-1/2 bg-linear-to-br from-orange-100 to-yellow-50 items-center justify-center p-8 overflow-hidden"
          >
            <video
              key={`${activeTab}-video`}
              src={loginVideo}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="w-full h-full object-cover rounded-lg"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            />
          </m.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
