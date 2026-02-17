
import { useState, useRef, useEffect, lazy, Suspense } from "react";
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
import type HCaptcha from "@hcaptcha/react-hcaptcha";
import Loader from "@/components/ui/Loader";
import { Mail, User, MessageSquare, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const HCaptchaComponent = lazy(() => import("@hcaptcha/react-hcaptcha"));

const HCAPTCHA_SITE_KEY = "203039b0-ee5c-48ba-aa2c-390a43ecaae0";

const supportFormSchema = z.object({
    name: z.string().min(2, { message: "Lütfen adınızı giriniz" }),
    email: z.string().email({ message: "Lütfen geçerli bir e-posta adresi giriniz" }),
    category: z.string().min(1, { message: "Lütfen bir kategori seçiniz" }),
    subject: z.string().min(5, { message: "Lütfen en az 5 karakter uzunluğunda bir konu başlığı giriniz" }),
    message: z.string().min(10, { message: "Lütfen en az 10 karakter uzunluğunda bir mesaj yazınız" }),
});

type SupportFormValues = z.infer<typeof supportFormSchema>;

interface SupportFormProps {
    onSuccess: () => void;
}

export function SupportForm({ onSuccess }: SupportFormProps) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const authUser = user as UserProfile | null;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const captchaRef = useRef<HCaptcha>(null);

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
        if (authUser) {
            form.setValue("name", authUser.full_name || "");
            form.setValue("email", authUser.email || "");
        }
    }, [authUser, form]);

    const onSubmit = async (values: SupportFormValues) => {
        if (!captchaToken) {
            toast.error(t("support.captcha_error") || "Lütfen captcha'yı doğrulayın");
            return;
        }

        setIsSubmitting(true);
        try {
            const { data: result, error: dbError } = await supabase.rpc('create_support_ticket_v1', {
                p_name: authUser ? (authUser.full_name || values.name) : values.name,
                p_email: authUser ? (authUser.email || values.email) : values.email,
                p_category: values.category,
                p_subject: values.subject,
                p_message: values.message,
                p_user_id: authUser?.id || null
            });

            if (dbError) throw dbError;

            const ticket = Array.isArray(result) ? result[0] : result;

            if (!ticket || !ticket.id) {
                throw new Error("Bilet oluşturuldu ancak ID alınamadı.");
            }

            try {
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

            import("canvas-confetti").then((confetti) => {
                confetti.default({
                    particleCount: 150,
                    spread: 100,
                    origin: { x: 0.5, y: 0.8 },
                    zIndex: 99999
                });
            });

            setTimeout(() => {
                form.reset();
                setCaptchaToken(null);
                captchaRef.current?.resetCaptcha();
                onSuccess();
            }, 1800);
        } catch (error: unknown) {
            console.error("Support form error:", error);
            toast.error(t("support.error_message") || "Bir hata oluştu. Lütfen tekrar deneyiniz.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
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

                <div className="grid grid-cols-1 gap-2">
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
                                    className="bg-orange-50/30 border-orange-100 focus:border-orange-500 min-h-12 rounded-lg resize-none text-xs"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                        </FormItem>
                    )}
                />

                <div className="flex flex-col items-center space-y-3 pt-1">
                    <div className="scale-[0.6] origin-center -my-4 min-h-11.5">
                        <Suspense fallback={<div className="h-19.5 w-75 bg-gray-50 animate-pulse rounded-lg border border-gray-100 flex items-center justify-center text-[10px] text-gray-400">Captcha Yükleniyor...</div>}>
                            <HCaptchaComponent
                                sitekey={HCAPTCHA_SITE_KEY}
                                onVerify={(token) => setCaptchaToken(token)}
                                onExpire={() => setCaptchaToken(null)}
                                ref={captchaRef}
                            />
                        </Suspense>
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
    );
}
