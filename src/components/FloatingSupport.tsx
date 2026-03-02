
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LifeBuoy, X } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { m } from "framer-motion";
import { cn } from "@/lib/utils";
import { SupportForm } from "./support/SupportForm";

interface FloatingSupportProps {
    className?: string;
}

export default function FloatingSupport({ className }: FloatingSupportProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    const isHCaptchaElement = (target: EventTarget | null) => {
        if (!(target instanceof Element)) return false;

        return Boolean(
            target.closest(
                ".h-captcha, [id*='hcaptcha'], [class*='hcaptcha'], iframe[src*='hcaptcha.com'], iframe[title*='hCaptcha'], iframe[title*='hcaptcha']"
            )
        );
    };

    // Track open state for global UI coordination (e.g. hiding marquee on mobile)
    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.body.dataset.supportOpen = open ? "true" : "false";
        }
        return () => {
            if (typeof document !== 'undefined') {
                document.body.dataset.supportOpen = "false";
            }
        };
    }, [open]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <m.button
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                        "relative overflow-hidden bg-linear-to-r from-orange-500 via-orange-500 to-orange-600 text-white h-12 md:h-14 px-4 md:px-5 rounded-full shadow-[0_14px_30px_rgba(234,88,12,0.35)] hover:shadow-[0_18px_36px_rgba(234,88,12,0.45)] transition-all duration-300 flex items-center gap-2.5 pointer-events-auto group border border-white/35",
                        className
                    )}
                >
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.24)_0%,rgba(255,255,255,0.07)_35%,rgba(255,255,255,0)_65%)]"
                    />
                    <div className="relative z-10">
                        <LifeBuoy className="w-5 h-5 md:w-6 md:h-6 animate-pulse-subtle group-hover:rotate-45 transition-transform duration-500" />
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-orange-500 rounded-full animate-ping" />
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-orange-500 rounded-full" />
                    </div>
                    <span className="hidden md:inline relative z-10 font-extrabold text-xs tracking-[0.08em] uppercase">{t("landing.support_title") || "Bize Ulaşın"}</span>
                </m.button>
            </PopoverTrigger>
            <PopoverContent
                side="top"
                align="end"
                sideOffset={15}
                collisionPadding={{ top: 20, bottom: 120, left: 16, right: 16 }}
                className="w-[calc(100vw-2rem)] sm:w-96 p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-[#FFFBF7] z-10001 animate-in slide-in-from-bottom-2 duration-300 flex flex-col max-h-[72dvh] sm:max-h-[85vh]"
                onPointerDownOutside={(event) => {
                    if (isHCaptchaElement(event.target)) {
                        event.preventDefault();
                    }
                }}
                onFocusOutside={(event) => {
                    if (isHCaptchaElement(event.target)) {
                        event.preventDefault();
                    }
                }}
                onInteractOutside={(event) => {
                    if (isHCaptchaElement(event.target)) {
                        event.preventDefault();
                    }
                }}
            >
                <div className="bg-orange-500 p-5 text-white relative">
                    <div className="space-y-1">
                        <h3 className="text-lg font-black leading-none">{t("landing.support_title") || "Bize Ulaşın"}</h3>
                        <p className="text-orange-100 opacity-90 text-[10px]">
                            {t("landing.support_subtitle") || "Size nasıl yardımcı olabiliriz?"}
                        </p>
                    </div>
                    <div className="absolute top-3 right-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setOpen(false);
                            }}
                            className="text-white hover:bg-white/20 rounded-full h-8 w-8"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="p-4 pb-8 bg-white overflow-y-auto custom-scrollbar flex-1 min-h-0">
                    <SupportForm onSuccess={() => setOpen(false)} />
                </div>
            </PopoverContent>
        </Popover>
    );
}
