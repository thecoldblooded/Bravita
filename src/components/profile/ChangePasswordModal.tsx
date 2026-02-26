import React, { useState, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthOperations } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";

interface ChangePasswordModalProps {
    children?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function ChangePasswordModal({ children, open, onOpenChange }: ChangePasswordModalProps) {
    const { t } = useTranslation();
    const { changePassword, isLoading } = useAuthOperations();
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const captchaRef = useRef<HCaptcha>(null);
    const HCAPTCHA_SITE_KEY = String(import.meta.env.VITE_HCAPTCHA_SITE_KEY ?? "").trim();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error(t("profile.settings.security.password_mismatch"));
            return;
        }

        // Stricter password validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{12,}$/;
        if (!passwordRegex.test(newPassword)) {
            toast.error(t("auth.password_requirements"));
            return;
        }

        try {
            if (!captchaToken) {
                toast.error(t("auth.captcha_required"));
                return;
            }

            await changePassword(oldPassword, newPassword, captchaToken!);
            toast.success(t("profile.settings.security.password_success"));
            if (onOpenChange) onOpenChange(false);
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setCaptchaToken(null);
            captchaRef.current?.resetCaptcha();
        } catch (err) {
            captchaRef.current?.resetCaptcha();
            setCaptchaToken(null);
            const error = err as Error;
            toast.error(error.message || t("profile.settings.security.password_error"));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {children && <DialogTrigger asChild>{children}</DialogTrigger>}
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Lock className="w-5 h-5 text-blue-600" />
                        </div>
                        {t("profile.settings.security.change_password")}
                    </DialogTitle>
                    <DialogDescription>
                        {t("profile.settings.security.password_desc")}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="old-password">{t("profile.settings.security.old_password")}</Label>
                        <div className="relative">
                            <Input
                                id="old-password"
                                type={showOld ? "text" : "password"}
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowOld(!showOld)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="new-password">{t("profile.settings.security.new_password")}</Label>
                        <div className="relative">
                            <Input
                                id="new-password"
                                type={showNew ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {/* Password Strength Indicator */}
                        <PasswordStrengthIndicator password={newPassword} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">{t("profile.settings.security.confirm_password")}</Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div className="flex justify-center py-4">
                        {HCAPTCHA_SITE_KEY ? (
                            <HCaptcha
                                sitekey={HCAPTCHA_SITE_KEY}
                                onVerify={(token) => setCaptchaToken(token)}
                                onError={(err) => console.error("hCaptcha Error:", err)}
                                onExpire={() => setCaptchaToken(null)}
                                ref={captchaRef}
                            />
                        ) : (
                            <div className="w-full rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                hCaptcha yapılandırması eksik (VITE_HCAPTCHA_SITE_KEY).
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => onOpenChange?.(false)}
                            disabled={isLoading}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {t("profile.settings.security.updating")}
                                </>
                            ) : (
                                t("profile.settings.security.update_btn")
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
