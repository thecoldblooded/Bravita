import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PromoCode } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
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

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg pointer-events-auto flex flex-col max-h-[90vh]">
                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {promoCode ? "Promosyon Kodunu Düzenle" : "Yeni Promosyon Kodu"}
                                </h2>
                                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Promosyon Kodu</Label>
                                        <Input
                                            {...register("code")}
                                            placeholder="Örn: WELCOME10"
                                            className="uppercase"
                                        />
                                        {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>İndirim Tipi</Label>
                                            <select
                                                {...register("discount_type")}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <option value="percentage">Yüzde (%)</option>
                                                <option value="fixed_amount">Sabit Tutar (₺)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Değer {discountType === "percentage" ? "(%)" : "(₺)"}</Label>
                                            <Input
                                                type="number"
                                                {...register("discount_value")}
                                                step="0.01"
                                            />
                                            {errors.discount_value && <p className="text-xs text-red-500">{errors.discount_value.message}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Minimum Sepet Tutarı (₺)</Label>
                                            <Input
                                                type="number"
                                                {...register("min_order_amount")}
                                                placeholder="Opsiyonel"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Maksimum İndirim (₺)</Label>
                                            <Input
                                                type="number"
                                                {...register("max_discount_amount")}
                                                placeholder="Opsiyonel"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Başlangıç Tarihi</Label>
                                            <Input
                                                type="date"
                                                {...register("start_date")}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Bitiş Tarihi</Label>
                                            <Input
                                                type="date"
                                                {...register("end_date")}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Kullanım Limiti</Label>
                                        <Input
                                            type="number"
                                            {...register("usage_limit")}
                                            placeholder="Sınırsız için boş bırakın"
                                        />
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="is_active"
                                            {...register("is_active")}
                                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                        />
                                        <Label htmlFor="is_active">Aktif</Label>
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <Button type="button" variant="outline" onClick={onClose}>
                                        İptal
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting} className="bg-orange-500 hover:bg-orange-600 text-white">
                                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Kaydet
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
