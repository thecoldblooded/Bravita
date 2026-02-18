import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PromoCode } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

const promoSchema = z.object({
    code: z.string().min(3, "En az 3 karakter olmalı"),
    discount_type: z.enum(["percentage", "fixed_amount"]),
    discount_value: z.coerce.number().min(0.01, "0'dan büyük olmalı"),
    min_order_amount: z.coerce.number().optional(),
    max_discount_amount: z.coerce.number().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    usage_limit: z.coerce.number().optional(),
    is_active: z.boolean().default(true),
});

type PromoFormValues = z.infer<typeof promoSchema>;

interface PromoCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<PromoCode>) => Promise<void>;
    promoCode: PromoCode | null;
}

export function PromoCodeModal({ isOpen, onClose, onSave, promoCode }: PromoCodeModalProps) {
    const { theme } = useAdminTheme();
    const isDark = theme === "dark";

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isSubmitting }
    } = useForm<PromoFormValues>({
        resolver: zodResolver(promoSchema),
        defaultValues: {
            is_active: true,
            discount_type: "percentage",
            start_date: new Date().toISOString().split("T")[0], // Default today
        }
    });

    const discountType = watch("discount_type");

    useEffect(() => {
        if (isOpen) {
            if (promoCode) {
                reset({
                    code: promoCode.code,
                    discount_type: promoCode.discount_type,
                    discount_value: promoCode.discount_value,
                    min_order_amount: promoCode.min_order_amount || undefined,
                    max_discount_amount: promoCode.max_discount_amount || undefined,
                    start_date: promoCode.start_date ? promoCode.start_date.split("T")[0] : undefined,
                    end_date: promoCode.end_date ? promoCode.end_date.split("T")[0] : undefined,
                    usage_limit: promoCode.usage_limit || undefined,
                    is_active: promoCode.is_active,
                });
            } else {
                reset({
                    is_active: true,
                    discount_type: "percentage",
                    code: "",
                    discount_value: 0,
                    min_order_amount: 0,
                    start_date: new Date().toISOString().split("T")[0],
                });
            }
        }
    }, [isOpen, promoCode, reset]);

    const onSubmit = async (data: PromoFormValues) => {
        await onSave({
            ...data,
            // Convert empty strings to null for optional dates if needed, or handle in backend
            start_date: data.start_date ? new Date(data.start_date).toISOString() : undefined,
            end_date: data.end_date ? new Date(data.end_date).toISOString() : undefined,
        });
        onClose();
    };

    // Dark mode styles
    const modalBg = isDark ? "bg-gray-800" : "bg-white";
    const headerBorder = isDark ? "border-gray-700" : "border-gray-100";
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-600";
    const inputClass = isDark ? "bg-gray-700 border-gray-600 text-white" : "";
    const selectClass = isDark
        ? "bg-gray-700 border-gray-600 text-white"
        : "bg-background border-input";
    const closeButtonClass = isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-600";

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
                    />
                    <m.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className={`${modalBg} rounded-2xl shadow-xl w-full max-w-lg pointer-events-auto flex flex-col max-h-[90vh]`}>
                            <div className={`flex items-center justify-between p-6 border-b ${headerBorder}`}>
                                <h2 className={`text-xl font-bold ${textPrimary}`}>
                                    {promoCode ? "Promosyon Kodunu Düzenle" : "Yeni Promosyon Kodu"}
                                </h2>
                                <button onClick={onClose} className={closeButtonClass}>
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className={textPrimary}>Promosyon Kodu</Label>
                                        <Input
                                            {...register("code")}
                                            placeholder="Örn: WELCOME10"
                                            className={`uppercase ${inputClass}`}
                                        />
                                        {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className={textPrimary}>İndirim Tipi</Label>
                                            <select
                                                {...register("discount_type")}
                                                className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${selectClass}`}
                                            >
                                                <option value="percentage">Yüzde (%)</option>
                                                <option value="fixed_amount">Sabit Tutar (₺)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className={textPrimary}>Değer {discountType === "percentage" ? "(%)" : "(₺)"}</Label>
                                            <Input
                                                type="number"
                                                {...register("discount_value")}
                                                step="0.01"
                                                className={inputClass}
                                            />
                                            {errors.discount_value && <p className="text-xs text-red-500">{errors.discount_value.message}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className={textPrimary}>Minimum Sepet Tutarı (₺)</Label>
                                            <Input
                                                type="number"
                                                {...register("min_order_amount")}
                                                placeholder="Opsiyonel"
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className={textPrimary}>Maksimum İndirim (₺)</Label>
                                            <Input
                                                type="number"
                                                {...register("max_discount_amount")}
                                                placeholder="Opsiyonel"
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className={textPrimary}>Başlangıç Tarihi</Label>
                                            <Input
                                                type="date"
                                                {...register("start_date")}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className={textPrimary}>Bitiş Tarihi</Label>
                                            <Input
                                                type="date"
                                                {...register("end_date")}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className={textPrimary}>Kullanım Limiti</Label>
                                        <Input
                                            type="number"
                                            {...register("usage_limit")}
                                            placeholder="Sınırsız için boş bırakın"
                                            className={inputClass}
                                        />
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="is_active"
                                            {...register("is_active")}
                                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                        />
                                        <Label htmlFor="is_active" className={textPrimary}>Aktif</Label>
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={onClose}
                                        className={isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : ""}
                                    >
                                        İptal
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting} className="bg-orange-500 hover:bg-orange-600 text-white">
                                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Kaydet
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </m.div>
                </>
            )}
        </AnimatePresence>
    );
}
