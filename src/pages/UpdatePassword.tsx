import { useEffect, useRef, type FormEvent } from "react";
import loginVideo from "@/assets/optimized/login-compressed.mp4";
import logoImg from "@/assets/bravita-logo.webp";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { useAuthOperations } from "@/hooks/useAuth";
import Loader from "@/components/ui/Loader";
import { translateError } from "@/lib/errorTranslator";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";

export default function UpdatePassword() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { updateUserPassword, logout, isLoading } = useAuthOperations();
    const { session } = useAuth();

    // Redirect if no session after timeout (failed recovery link or manual navigation)
    useEffect(() => {
        const timer = setTimeout(() => {
            // If after 3 seconds we still don't have a session AND we don't have access_token in hash
            // then probably user just navigated here manually.
            if (!session && !window.location.hash.includes("access_token")) {
                toast.error(t("auth.session_expired") || "Oturum süresi doldu, lütfen tekrar deneyin.");
                navigate("/");
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [session, navigate, t]);

    const successRef = useRef(false);

    // Logout if user leaves the page without successfully updating password
    useEffect(() => {
        return () => {
            if (!successRef.current) {
                logout();
            }
        };
    }, [logout]);

    const formSchema = z.object({
        password: z.string()
            .min(12, t("auth.validation.password_min_length") || "Şifre en az 12 karakter olmalıdır")
            .regex(/[A-Z]/, t("auth.validation.password_uppercase") || "En az bir büyük harf içermelidir")
            .regex(/[a-z]/, t("auth.validation.password_lowercase") || "En az bir küçük harf içermelidir")
            .regex(/[0-9]/, t("auth.validation.password_number") || "En az bir rakam içermelidir")
            .regex(/[!@#$%^&*]/, t("auth.validation.password_special") || "En az bir özel karakter içermelidir"),
        confirmPassword: z.string()
    }).refine((data) => data.password === data.confirmPassword, {
        message: t("auth.validation.passwords_must_match") || "Şifreler eşleşmiyor",
        path: ["confirmPassword"],
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            await updateUserPassword(values.password);
            successRef.current = true;
            toast.success(t("auth.password_updated") || "Şifreniz başarıyla güncellendi");

            await logout();

            // Delay to show toast
            setTimeout(() => {
                navigate("/");
            }, 1000);
        } catch (error) {
            toast.error(translateError(error, t));
        }
    };

    const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void form.handleSubmit(onSubmit)(event);
    };

    return (
        <div className="min-h-screen bg-[#FFFBF7] flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl grid lg:grid-cols-2 overflow-hidden shadow-xl border-none">
                <div className="p-8 lg:p-12 flex flex-col justify-center bg-white order-2 lg:order-1">
                    <div className="w-full max-w-sm mx-auto space-y-6">
                        <div className="text-center space-y-4 flex flex-col items-center">
                            <img
                                src={logoImg}
                                alt="Bravita"
                                className="h-12 w-auto object-contain mb-2"
                            />
                            <h2 className="text-xl font-semibold tracking-tight text-gray-900">
                                {t("auth.update_password") || "Şifrenizi Güncelleyin"}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {t("auth.enter_new_password") || "Lütfen yeni şifrenizi girin"}
                            </p>
                        </div>

                        <Form {...form}>
                            <form onSubmit={handleFormSubmit} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("auth.new_password") || "Yeni Şifre"}</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="••••••••" {...field} />
                                            </FormControl>
                                            <PasswordStrengthIndicator password={field.value} />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("auth.confirm_password") || "Şifre Tekrar"}</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="••••••••" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white" disabled={isLoading}>
                                    {isLoading ? <Loader size="1.25rem" noMargin /> : (t("auth.update_password_btn") || "Şifreyi Güncelle")}
                                </Button>
                            </form>
                        </Form>
                    </div>
                </div>

                <div className="hidden lg:block relative w-full h-full min-h-150 bg-[#FFF8F0] order-1 lg:order-2">
                    <video
                        src={loginVideo}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                </div>
            </Card>
        </div>
    );
}
