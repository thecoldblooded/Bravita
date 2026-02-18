
import { useState } from "react";
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

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <m.button
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                        "bg-orange-600 text-white h-14 md:h-16 px-4 md:px-6 rounded-full shadow-2xl hover:bg-orange-700 transition-all flex items-center gap-3 pointer-events-auto group border-2 border-white/20",
                        className
                    )}
                >
                    <div className="relative">
                        <LifeBuoy className="w-6 h-6 md:w-7 md:h-7 animate-pulse-subtle group-hover:rotate-45 transition-transform duration-500" />
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-orange-600 rounded-full animate-ping" />
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-orange-600 rounded-full" />
                    </div>
                    <span className="hidden md:inline font-black text-sm tracking-tight uppercase">{t("landing.support_title") || "Bize Ulaşın"}</span>
                </m.button>
            </PopoverTrigger>
            <PopoverContent
                side="top"
                align="end"
                sideOffset={15}
                collisionPadding={{ top: 20, bottom: 120, left: 16, right: 16 }}
                className="w-[calc(100vw-2rem)] sm:w-96 p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-[#FFFBF7] z-10001 animate-in slide-in-from-bottom-2 duration-300 flex flex-col max-h-[72dvh] sm:max-h-[85vh]"
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
