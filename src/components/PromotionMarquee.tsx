import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Tag, Calendar, Info, Copy, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { tr } from "date-fns/locale/tr";
import { enUS } from "date-fns/locale/en-US";
import { toast } from "sonner";

interface PromoCode {
    id: string;
    code: string;
    discount_type: string;
    discount_value: number;
    min_order_amount: number;
    start_date: string;
    end_date: string;
    is_active: boolean;
}

const PromotionMarquee = () => {
    const [promos, setPromos] = useState<PromoCode[]>([]);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const { t, i18n } = useTranslation();

    useEffect(() => {
        fetchActivePromos();
    }, []);

    const fetchActivePromos = async () => {
        try {
            const { data, error } = await supabase
                .from("promo_codes")
                .select("*")
                .eq("is_active", true);

            if (error) {
                console.error("Error fetching promos:", error);
                return;
            }

            if (data) {
                const now = new Date();
                const active = data.filter(promo => {
                    const start = new Date(promo.start_date);
                    const end = new Date(promo.end_date);
                    const isValid = now > start && now < end;
                    return isValid;
                });

                setPromos(active);
            }
        } catch (err) {
            console.error("Unexpected error in fetchActivePromos:", err);
        }
    };

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code).then(() => {
            setCopiedCode(code);
            toast.success(`${t('promo.copied', { defaultValue: 'Kod Kopyalandı' })}: ${code}`);
            setTimeout(() => setCopiedCode(null), 2000);
        });
    };

    if (promos.length === 0) return null;

    // Format the promo message
    const getPromoText = (promo: PromoCode, idx: number) => {
        const discount = promo.discount_type === "percentage"
            ? `%${promo.discount_value}`
            : `${promo.discount_value} TL`;

        const minAmount = promo.min_order_amount > 0
            ? `(${promo.min_order_amount} TL ${t('cart.min_amount')})`
            : "";

        const dateLocale = i18n.language === 'tr' ? tr : enUS;
        const endDate = format(new Date(promo.end_date), "dd MMMM yyyy", {
            locale: dateLocale
        });

        const validUntilBase = t('promo.valid_until');
        const validUntilText = i18n.language === 'tr'
            ? `${endDate} ${validUntilBase}`
            : `${validUntilBase} ${endDate}`;

        return (
            <div key={`${promo.id}-${idx}`} className="flex items-center space-x-6 md:space-x-8 px-6 md:px-8 whitespace-nowrap group">
                <button
                    onClick={() => handleCopyCode(promo.code)}
                    className="flex items-center space-x-2 bg-white/10 hover:bg-orange-500/20 px-3 py-1 rounded-full border border-white/10 hover:border-orange-500/40 transition-all cursor-pointer group-hover:scale-105 active:scale-95"
                    title={t('promo.click_to_copy', { defaultValue: 'Kopyalamak için tıkla' })}
                >
                    <Tag size={12} className="text-orange-400" />
                    <span className="font-bold text-white text-[11px] md:text-xs tracking-widest uppercase">{promo.code}</span>
                    {copiedCode === promo.code ? (
                        <Check size={12} className="text-green-400 animate-in zoom-in duration-300" />
                    ) : (
                        <Copy size={12} className="text-neutral-500 group-hover:text-orange-400 transition-colors" />
                    )}
                </button>

                <div className="flex items-center space-x-2">
                    <Info size={13} className="text-neutral-400" />
                    <span className="text-neutral-300 text-[11px] md:text-xs">{discount} {t('cart.discount')} {minAmount}</span>
                </div>

                <div className="flex items-center space-x-2">
                    <Calendar size={13} className="text-neutral-400" />
                    <span className="text-neutral-300 text-[11px] md:text-xs">{validUntilText}</span>
                </div>

                <div className="h-3 w-px bg-neutral-800 mx-2 md:mx-4" />
            </div>
        );
    };

    // Replicate content to ensure smooth infinite loop
    const marqueeItems = [...promos, ...promos, ...promos, ...promos];

    return (
        <>
            <style>
                {`
          @keyframes marquee-infinite {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .promo-marquee-container {
            display: flex;
            width: max-content;
            animation: marquee-infinite linear infinite;
            will-change: transform;
          }
          .promo-marquee-wrapper:hover .promo-marquee-container {
            animation-play-state: paused;
          }
        `}
            </style>
            <div
                className="promo-marquee-wrapper fixed bottom-0 left-0 right-0 z-999 bg-black/95 backdrop-blur-md border-t border-white/10 py-2 shadow-[0_-8px_30px_rgba(0,0,0,0.8)] overflow-hidden"
            >
                <div
                    className="promo-marquee-container"
                    style={{
                        animationDuration: `${Math.max(15, promos.length * 15)}s`
                    }}
                >
                    {marqueeItems.map((promo, idx) => getPromoText(promo, idx))}
                </div>
            </div>
        </>
    );
};

export default PromotionMarquee;

