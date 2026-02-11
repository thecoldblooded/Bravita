import { useState, useRef } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import Loader from "@/components/ui/Loader";
import { Mail, User, MessageSquare, Tag } from "lucide-react";

const HCAPTCHA_SITE_KEY = "203039b0-ee5c-48ba-aa2c-390a43ecaae0";

export default function SupportForm() {
    const { t } = useTranslation();
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const captchaRef = useRef<HCaptcha>(null);

    const supportSchema = z.object({
        name: z.string().min(2, t("support.validation.name_min") || "İsim en az 2 karakter olmalıdır"),
        email: z.string().email(t("support.validation.email_invalid") || "Geçerli bir e-posta adresi giriniz"),
        category: z.string().min(1, t("support.validation.category_required") || "Lütfen bir kategori seçiniz"),
        subject: z.string().min(5, t("support.validation.subject_min") || "Konu en az 5 karakter olmalıdır"),
        message: z.string().min(10, t("support.validation.message_min") || "Mesaj en az 10 karakter olmalıdır"),
    });

    type SupportFormValues = z.infer<typeof supportSchema>;

    const form = useForm<SupportFormValues>({
        resolver: zodResolver(supportSchema),
        defaultValues: {
            name: "",
            email: "",
            category: "general",
            subject: "",
            message: "",
        },
    });

    const onSubmit = async (values: SupportFormValues) => {
        const skipCaptcha = import.meta.env.VITE_SKIP_CAPTCHA === "true";
        if (!captchaToken && !skipCaptcha) {
            toast.error(t("auth.captcha_required"));
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Insert into database
            const { data, error: dbError } = await supabase
                .from("support_tickets")
                .insert([
                    {
                        name: values.name,
                        email: values.email,
                        category: values.category,
                        subject: values.subject,
                        message: values.message,
                        status: "open",
                    },
                ])
                .select()
                .single();

            if (dbError) throw dbError;

            // 2. Call Edge Function for email notification (we will implement this next)
            // We don't await this to keep the UI responsive, or we can await it if we want to ensure it sent
            try {
                await supabase.functions.invoke("send-support-email", {
                    body: {
                        ticket_id: data.id,
                        type: "ticket_created",
                        captchaToken: captchaToken,
                    },
                });
            } catch (emailError) {
                console.error("Email notification error:", emailError);
                // Don't fail the whole request if email fails, but log it
            }

            toast.success(t("support.success_message") || "Mesajınız başarıyla iletildi. En kısa sürede size dönüş yapacağız.");
            form.reset();
            captchaRef.current?.resetCaptcha();
            setCaptchaToken(null);
        } catch (error: any) {
            console.error("Support form error:", error);
            toast.error(error.message || t("support.error_message") || "Mesaj gönderilirken bir hata oluştu.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section id="contact" className="py-24 bg-white relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-orange-100/30 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-orange-50/40 rounded-full blur-3xl -z-10" />

            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        {t("landing.support_title") || "Bize Ulaşın"}
                    </h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        {t("landing.support_subtitle") || "Sormak istediğiniz her türlü soru veya yaşadığınız problemler için bize yazabilirsiniz."}
                    </p>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-orange-100 p-8 md:p-12 shadow-xl shadow-orange-500/5">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <User size={16} className="text-orange-500" />
                                                {t("support.name") || "Ad Soyad"}
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={t("support.name_placeholder") || "Adınızı giriniz"}
                                                    className="bg-orange-50/30 border-orange-100 focus:border-orange-500 focus:ring-orange-500 h-12 rounded-xl"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Mail size={16} className="text-orange-500" />
                                                {t("support.email") || "E-posta Adresi"}
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={t("support.email_placeholder") || "e-posta@örnek.com"}
                                                    type="email"
                                                    className="bg-orange-50/30 border-orange-100 focus:border-orange-500 focus:ring-orange-500 h-12 rounded-xl"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Tag size={16} className="text-orange-500" />
                                                {t("support.category") || "Kategori"}
                                            </FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-orange-50/30 border-orange-100 focus:border-orange-500 focus:ring-orange-500 h-12 rounded-xl">
                                                        <SelectValue placeholder={t("support.category_placeholder") || "Bir kategori seçin"} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="general">{t("support.category_general") || "Genel Sorular"}</SelectItem>
                                                    <SelectItem value="order_issue">{t("support.category_order_issue") || "Sipariş Sorunu"}</SelectItem>
                                                    <SelectItem value="product_info">{t("support.category_product_info") || "Ürün Bilgisi"}</SelectItem>
                                                    <SelectItem value="delivery">{t("support.category_delivery") || "Teslimat Hakkında"}</SelectItem>
                                                    <SelectItem value="other">{t("support.category_other") || "Diğer"}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="subject"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <MessageSquare size={16} className="text-orange-500" />
                                                {t("support.subject") || "Konu"}
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={t("support.subject_placeholder") || "Konu başlığı"}
                                                    className="bg-orange-50/30 border-orange-100 focus:border-orange-500 focus:ring-orange-500 h-12 rounded-xl"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="message"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("support.message") || "Mesajınız"}</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder={t("support.message_placeholder") || "Mesajınızı buraya yazınız..."}
                                                className="bg-orange-50/30 border-orange-100 focus:border-orange-500 focus:ring-orange-500 min-h-37.5 rounded-2xl resize-none"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex flex-col items-center space-y-6 pt-4">
                                <HCaptcha
                                    sitekey={HCAPTCHA_SITE_KEY}
                                    onVerify={(token) => setCaptchaToken(token)}
                                    onError={(err) => console.error("hCaptcha Error:", err)}
                                    onExpire={() => setCaptchaToken(null)}
                                    ref={captchaRef}
                                />

                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full md:w-auto md:px-12 h-14 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg shadow-lg shadow-orange-500/20 transition-all hover:scale-105 active:scale-95"
                                >
                                    {isSubmitting ? (
                                        <Loader size="1.5rem" noMargin className="text-white" />
                                    ) : (
                                        t("support.submit") || "Gönder"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </div>
        </section>
    );
}
