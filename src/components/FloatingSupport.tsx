import React, { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { supabase, type UserProfile } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import Loader from "@/components/ui/Loader";
import { Mail, User, MessageSquare, Tag, LifeBuoy, X } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Confetti, ConfettiRef } from "@/components/ui/confetti";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const HCAPTCHA_SITE_KEY = "203039b0-ee5c-48ba-aa2c-390a43ecaae0";

const supportFormSchema = z.object({
    name: z.string().min(2, { message: "Lütfen adınızı giriniz" }),
    email: z.string().email({ message: "Lütfen geçerli bir e-posta adresi giriniz" }),
    category: z.string().min(1, { message: "Lütfen bir kategori seçiniz" }),
    subject: z.string().min(5, { message: "Lütfen en az 5 karakter uzunluğunda bir konu başlığı giriniz" }),
    message: z.string().min(10, { message: "Lütfen en az 10 karakter uzunluğunda bir mesaj yazınız" }),
});

type SupportFormValues = z.infer<typeof supportFormSchema>;

interface FloatingSupportProps {
    className?: string;
}

export default function FloatingSupport({ className }: FloatingSupportProps) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const authUser = user as UserProfile | null;
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const captchaRef = useRef<HCaptcha>(null);
    const confettiRef = useRef<ConfettiRef>(null);

    const form = useForm<SupportFormValues>({
        resolver: zodResolver(supportFormSchema),
        defaultValues: {
            name: "",
            email: "",
            category: "general",
            subject: "",
            message: "",
        },
    });

    // Pre-fill form if user is logged in
    useEffect(() => {
        if (open && authUser) {
            form.setValue("name", authUser.full_name || "");
            form.setValue("email", authUser.email || "");
        }
    }, [open, authUser, form]);

    const onSubmit = async (values: SupportFormValues) => {
        if (!captchaToken) {
            toast.error(t("support.captcha_error") || "Lütfen captcha'yı doğrulayın");
            return;
        }

        setIsSubmitting(true);
        try {
            // Use RPC for secure insertion without needing public SELECT policy
            const { data: result, error: dbError } = await supabase.rpc('create_support_ticket_v1', {
                p_name: authUser ? (authUser.full_name || values.name) : values.name,
                p_email: authUser ? (authUser.email || values.email) : values.email,
                p_category: values.category,
                p_subject: values.subject,
                p_message: values.message,
                p_user_id: authUser?.id || null
            });

            if (dbError) {
                console.error("DB Error:", dbError);
                throw dbError;
            }

            // result is now an array from the RPC, take the first item
            const ticket = Array.isArray(result) ? result[0] : result;

            if (!ticket || !ticket.id) {
                console.error("Missing ticket data after RPC:", result);
                throw new Error("Bilet oluşturuldu ancak ID alınamadı.");
            }

            try {
                // Use the anon key for guest requests to Edge Functions
                await supabase.functions.invoke("send-support-email", {
                    body: {
                        ticket_id: ticket.id,
                        type: "ticket_created",
                        captchaToken: captchaToken,
                    },
                });
            } catch (emailError) {
                console.error("Email notification error:", emailError);
            }

            toast.success(t("support.success_message") || "Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.");

            // Direct global confetti explosion (not tied to component lifecycle)
            import("canvas-confetti").then((confetti) => {
                confetti.default({
                    particleCount: 150,
                    spread: 100,
                    origin: { x: 0.5, y: 0.8 },
                    zIndex: 99999
                });
            });

            // Delay closing the form so user can see the success state and confetti
            setTimeout(() => {
                form.reset();
                setCaptchaToken(null);
                captchaRef.current?.resetCaptcha();
                setOpen(false);
            }, 1800);
        } catch (error: unknown) {
            console.error("Support form error:", error);
            toast.error(t("support.error_message") || "Bir hata oluştu. Lütfen tekrar deneyiniz.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <motion.button
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
                </motion.button>
            </PopoverTrigger>
            <PopoverContent
                side="top"
                align="end"
                sideOffset={15}
                className="w-[calc(100vw-2rem)] sm:w-96 p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-[#FFFBF7] z-60 animate-in slide-in-from-bottom-2 duration-300"
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

                <div className="p-5 bg-white max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="flex items-center gap-2 text-gray-700 text-[11px] font-bold">
                                            <User size={12} className="text-orange-500" />
                                            {t("support.name") || "Ad Soyad"}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={t("support.name_placeholder") || "Adınızı giriniz"}
                                                className={cn(
                                                    "bg-orange-50/30 border-orange-100 focus:border-orange-500 h-9 rounded-lg text-xs",
                                                    authUser ? "bg-gray-50 text-gray-400" : ""
                                                )}
                                                {...field}
                                                readOnly={!!authUser}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="flex items-center gap-2 text-gray-700 text-[11px] font-bold">
                                            <Mail size={12} className="text-orange-500" />
                                            {t("support.email") || "E-posta Adresi"}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={t("support.email_placeholder") || "e-posta@örnek.com"}
                                                type="email"
                                                className={cn(
                                                    "bg-orange-50/30 border-orange-100 focus:border-orange-500 h-9 rounded-lg text-xs",
                                                    authUser ? "bg-gray-50 text-gray-400" : ""
                                                )}
                                                {...field}
                                                readOnly={!!authUser}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-2">
                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel className="flex items-center gap-2 text-gray-700 text-[11px] font-bold">
                                                <Tag size={12} className="text-orange-500" />
                                                {t("support.category") || "Kategori"}
                                            </FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-orange-50/30 border-orange-100 focus:border-orange-500 h-9 rounded-lg text-[11px]">
                                                        <SelectValue placeholder={t("support.category_placeholder") || "Seçin"} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="z-70">
                                                    <SelectItem value="general">{t("support.category_general") || "Genel"}</SelectItem>
                                                    <SelectItem value="order_issue">{t("support.category_order_issue") || "Sipariş"}</SelectItem>
                                                    <SelectItem value="product_info">{t("support.category_product_info") || "Ürün"}</SelectItem>
                                                    <SelectItem value="delivery">{t("support.category_delivery") || "Teslimat"}</SelectItem>
                                                    <SelectItem value="other">{t("support.category_other") || "Diğer"}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="subject"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel className="flex items-center gap-2 text-gray-700 text-[11px] font-bold">
                                                <MessageSquare size={12} className="text-orange-500" />
                                                {t("support.subject") || "Konu"}
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={t("support.subject_placeholder") || "Konu..."}
                                                    className="bg-orange-50/30 border-orange-100 focus:border-orange-500 h-9 rounded-lg text-xs"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="message"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-gray-700 text-[11px] font-bold">{t("support.message") || "Mesajınız"}</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder={t("support.message_placeholder") || "Mesajınızı buraya yazınız..."}
                                                className="bg-orange-50/30 border-orange-100 focus:border-orange-500 min-h-16 rounded-lg resize-none text-xs"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <div className="flex flex-col items-center space-y-3 pt-1">
                                <div className="scale-[0.65] origin-center -my-3">
                                    <HCaptcha
                                        sitekey={HCAPTCHA_SITE_KEY}
                                        onVerify={(token) => setCaptchaToken(token)}
                                        onExpire={() => setCaptchaToken(null)}
                                        ref={captchaRef}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isSubmitting || !captchaToken}
                                    className="w-full h-10 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-orange-500/20 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <Loader size="1rem" noMargin className="text-white" />
                                    ) : (
                                        t("support.submit") || "Gönder"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </PopoverContent>
        </Popover>
    );
}
