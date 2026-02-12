import { useState } from "react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import loginVideo from "@/assets/optimized/login-compressed.mp4";
import bravitaLogo from "@/assets/bravita-logo.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "login" | "signup";
}


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
  const [activeTab, setActiveTab] = useState<"login" | "signup">(defaultTab);

  const handleSuccess = () => {
    onOpenChange(false);
    setActiveTab(defaultTab);
  };

  // Ultra-strict scroll lock for mobile and desktop including Lenis
  React.useEffect(() => {
    if (!open) return;

    // 1. Handle Lenis (Smooth Scroll)
    const lenis = (window as unknown as { lenis: { stop: () => void; start: () => void } }).lenis;
    if (lenis) {
      lenis.stop();
    }

    // 2. Standard Scroll Lock
    const scrollY = window.scrollY;
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;

    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    // 3. Final barrier against touch bleed - but allow scrolling inside modal
    const preventDefault = (e: TouchEvent) => {
      if (e.touches.length > 1) return;
      const target = e.target as HTMLElement;
      // Allow scrolling inside elements with overflow-y-auto or inside dialog content
      const isInsideScrollable = target.closest('.overflow-y-auto, [role="dialog"], [data-radix-dialog-content]');
      if (!isInsideScrollable) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventDefault, { passive: false });

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      const isInsideScrollable = target.closest('.overflow-y-auto, [role="dialog"], [data-radix-dialog-content]');
      if (!isInsideScrollable) {
        e.preventDefault();
      } else {
        // Stop propagation to prevent Lenis or other listeners from seeing it
        e.stopPropagation();
      }
    };

    document.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      // Restore Lenis
      if (lenis) {
        lenis.start();
      }

      // Restore standard scroll
      const savedScrollY = parseInt(document.body.style.top || '0') * -1;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      document.body.style.overflow = originalOverflow;

      if (!isNaN(savedScrollY)) {
        window.scrollTo(0, savedScrollY);
      }

      document.removeEventListener('touchmove', preventDefault);
      document.removeEventListener('wheel', handleWheel);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent
        className="max-w-4xl p-0 overflow-hidden h-dvh max-h-dvh md:h-auto md:max-h-150 border-none shadow-2xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          {/* Left Section - Forms */}
          <motion.div
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
              </DialogHeader>
            </div>

            <motion.div
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
            </motion.div>
          </motion.div>

          {/* Right Section - Video (Hidden on mobile) */}
          <motion.div
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
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
