import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { m } from "framer-motion";
import { Save, Lock } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { updateProfileWithBff } from "@/lib/auth/bffAuth";
import Loader from "@/components/ui/Loader";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { arePhoneNumbersEquivalent, changePhoneWithOtp, exchangeFirebasePhoneToken, verifyOtp } from "@/lib/auth/phoneOtp";
import type { ConfirmationResult } from "firebase/auth";

export function ProfileInfo() {
    const { t } = useTranslation();
    const { user, refreshUserProfile } = useAuth(); // Keep refreshUserProfile as per original code, instruction had updateProfile but it's not used consistently.
    const [formData, setFormData] = useState({
        full_name: "",
        phone: "",
        email: "",
    });
    const [isSaving, setIsSaving] = useState(false);
    const hasInitialized = useRef(false);
    const hasUserEdited = useRef(false);

    const [otpSent, setOtpSent] = useState(false);
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [otpCode, setOtpCode] = useState("");
    const [verificationToken, setVerificationToken] = useState("");
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const verifiedPhoneRef = useRef("");

    const isPhoneChanged = !arePhoneNumbersEquivalent(formData.phone, user?.phone || "");

    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setInterval(() => {
            setCountdown((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [countdown]);

    useEffect(() => {
        if (!verifiedPhoneRef.current) {
            return;
        }

        const shouldResetOtpState =
            (otpSent || phoneVerified || Boolean(confirmationResult)) &&
            !arePhoneNumbersEquivalent(verifiedPhoneRef.current, formData.phone);

        if (!shouldResetOtpState) {
            return;
        }

        setOtpSent(false);
        setPhoneVerified(false);
        setOtpCode("");
        setVerificationToken("");
        setConfirmationResult(null);
        setCountdown(0);
        verifiedPhoneRef.current = "";
    }, [confirmationResult, formData.phone, otpSent, phoneVerified]);

    const handleSendOtp = async () => {
        if (!formData.phone || !isValidPhoneNumber(formData.phone)) {
            toast.error(t("auth.validation.phone_invalid"));
            return;
        }

        setIsSendingOtp(true);
        try {
            const { confirmationResult } = await changePhoneWithOtp(formData.phone);
            setConfirmationResult(confirmationResult);
            verifiedPhoneRef.current = formData.phone;

            setOtpSent(true);
            setCountdown(180);
            toast.success("Doğrulama kodu SMS ile gönderildi.");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Bir hata oluştu.";
            toast.error(message);

        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otpCode || otpCode.length !== 6) {
            toast.error("Lütfen 6 haneli doğrulama kodunu girin.");
            return;
        }

        if (!confirmationResult) {
            toast.error("Lütfen önce doğrulama kodu isteyin.");
            return;
        }

        setIsVerifyingOtp(true);
        try {
            const { idToken } = await verifyOtp(confirmationResult, otpCode);
            const signedVerificationToken = await exchangeFirebasePhoneToken(idToken, formData.phone);
            setPhoneVerified(true);
            setVerificationToken(signedVerificationToken);
            toast.success("Telefon numaranız başarıyla doğrulandı.");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Bir hata oluştu.";
            toast.error(message);
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    useEffect(() => {
        if (!user) return;

        const isStub = !!user.isStub;
        const incomingFullName = user.full_name || "";
        const incomingPhone = user.phone || "";
        const incomingEmail = user.email || "";

        const hasInitializedSnapshot = hasInitialized.current;

        setFormData((prev) => {
            const shouldInitialize =
                !hasInitializedSnapshot ||
                (!isStub && prev.full_name === "" && incomingFullName !== "") ||
                (!isStub && prev.phone === "" && incomingPhone !== "") ||
                (!isStub && prev.email === "" && incomingEmail !== "");

            if (!shouldInitialize) {
                return prev;
            }

            const shouldUseAuthoritativeProfile =
                !isStub &&
                !hasInitializedSnapshot &&
                !hasUserEdited.current;

            return {
                full_name: shouldUseAuthoritativeProfile
                    ? incomingFullName
                    : (prev.full_name || incomingFullName),
                phone: shouldUseAuthoritativeProfile
                    ? incomingPhone
                    : (prev.phone || incomingPhone),
                email: shouldUseAuthoritativeProfile
                    ? incomingEmail
                    : (prev.email || incomingEmail),
            };
        });

        if (!isStub) {
            hasInitialized.current = true;
        }
    }, [user]);

    useEffect(() => {
        void refreshUserProfile();
    }, [refreshUserProfile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        // Validation like in signup
        if (formData.full_name.trim().length < 2) {
            toast.error(t("auth.validation.full_name_required"));
            return;
        }

        if (formData.phone && !isValidPhoneNumber(formData.phone)) {
            toast.error(t("auth.validation.phone_invalid"));
            return;
        }

        if (isPhoneChanged && !phoneVerified) {
            toast.error("Lütfen önce yeni telefon numaranızı SMS ile doğrulayın.");
            return;
        }

            setIsSaving(true);
        try {
            const updatePayload = {
                full_name: formData.full_name,
                phone: formData.phone,
                ...(isPhoneChanged ? { phoneVerificationToken: verificationToken } : {})
            };

            const result = await updateProfileWithBff(updatePayload);
            if (!result?.success) {
                throw new Error("Profil güncellenemedi.");
            }

            await refreshUserProfile();
            toast.success(t("profile.info.save_success"));

            // Reset verification state on success
            setOtpSent(false);
            setPhoneVerified(false);
            setOtpCode("");
            setVerificationToken("");
            setConfirmationResult(null);
            setCountdown(0);
            verifiedPhoneRef.current = "";
        } catch (error) {
            toast.error(t("profile.info.save_error"));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl"
        >
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">{t("profile.info.title")}</h2>
                <p className="text-gray-500 text-sm">{t("profile.info.description")}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-orange-100/50">
                <div className="space-y-2">
                    <Label className="text-gray-700">{t("profile.info.email_label")}</Label>
                    <div className="relative group">
                        <Input
                            value={user?.email || ""}
                            disabled
                            className="bg-gray-50/50 border-gray-200 text-gray-500 cursor-not-allowed"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Lock className="w-4 h-4 text-gray-400" />
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 ml-1">{t("profile.info.email_note")}</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="full_name">{t("profile.info.full_name_label")}</Label>
                    <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => {
                            hasUserEdited.current = true;
                            setFormData({ ...formData, full_name: e.target.value });
                        }}
                        placeholder={t("profile.info.full_name_placeholder")}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone">{t("profile.info.phone_label")}</Label>
                    <div className="flex gap-2">
                        <PhoneInput
                            id="phone"
                            international
                            countryCallingCodeEditable={false}
                            defaultCountry="TR"
                            placeholder={t("profile.info.phone_placeholder")}
                            value={formData.phone}
                            onChange={(value) => {
                                hasUserEdited.current = true;
                                setFormData({ ...formData, phone: value || "" });
                            }}
                            disabled={isSaving || (isPhoneChanged && phoneVerified)}
                            className="flex h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-base ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex-1"
                        />
                        {isPhoneChanged && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleSendOtp}
                                disabled={isSaving || isSendingOtp || phoneVerified || countdown > 0}
                                className="h-10 text-xs px-3 border-orange-200 text-orange-700 hover:bg-orange-50 shrink-0"
                            >
                                {isSendingOtp ? (
                                    <Loader size="1rem" noMargin />
                                ) : countdown > 0 ? (
                                    `${countdown}s`
                                ) : otpSent ? (
                                    "Tekrar Gönder"
                                ) : (
                                    "Yeni Numarayı Doğrula"
                                )}
                            </Button>
                        )}
                    </div>
                </div>

                {isPhoneChanged && otpSent && !phoneVerified && (
                    <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100/50 space-y-3">
                        <Label className="text-sm font-medium text-gray-700">Doğrulama Kodu</Label>
                        <div className="flex gap-2">
                            <Input
                                type="text"
                                maxLength={6}
                                placeholder="6 Haneli Kod"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                                disabled={isSaving || isVerifyingOtp}
                                className="flex-1 text-center font-semibold tracking-widest text-lg"
                            />
                            <Button
                                type="button"
                                onClick={handleVerifyOtp}
                                disabled={isSaving || isVerifyingOtp || otpCode.length !== 6}
                                className="bg-orange-500 hover:bg-orange-600 text-white shrink-0"
                            >
                                {isVerifyingOtp ? <Loader size="1rem" noMargin /> : "Doğrula"}
                            </Button>
                        </div>
                        <p className="text-[11px] text-gray-500">
                            Yeni telefonunuza gönderilen 6 haneli doğrulama kodunu giriniz.
                        </p>
                    </div>
                )}

                {isPhoneChanged && phoneVerified && (
                    <div className="bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between">
                        <span>Yeni Telefon Numarası Doğrulandı ✓</span>
                    </div>
                )}

                <div className="pt-4 flex justify-end">
                    <Button
                        type="submit"
                        disabled={isSaving || (isPhoneChanged && !phoneVerified)}
                        className="bg-orange-500 hover:bg-orange-600 text-white min-w-30"
                    >
                        {isSaving ? (
                            <Loader size="1.25rem" noMargin />
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                {t("common.save")}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </m.div>
    );
}
