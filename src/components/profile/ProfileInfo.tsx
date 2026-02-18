import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { m } from "framer-motion";
import { Save, Lock } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import Loader from "@/components/ui/Loader";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

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

    // Initialize form data when user is loaded or changed from stub
    useEffect(() => {
        if (user) {
            const isStub = user.isStub;

            // If we're not initialized yet, OR if we're currently a stub and new data is NOT a stub
            // OR if the form is empty but the user object has data
            const shouldInitialize = !hasInitialized.current ||
                (hasInitialized.current && !isStub && formData.full_name === "" && user.full_name);

            if (shouldInitialize) {
                setFormData({
                    full_name: user.full_name || "",
                    phone: user.phone || "",
                    email: user.email || "",
                });

                // Only mark as fully initialized and locked if it's NOT a stub
                if (!isStub) {
                    hasInitialized.current = true;
                }
            }
        }
    }, [user, formData.full_name]); // Re-run when user object changes

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

        setIsSaving(true);
        try {
            const { data, error } = await supabase
                .from("profiles")
                .update({
                    full_name: formData.full_name,
                    phone: formData.phone,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", user.id)
                .select();

            if (error) {
                console.error("Supabase error details:", {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint,
                });
                throw error;
            }

            await refreshUserProfile();
            toast.success(t("profile.info.save_success"));
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
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder={t("profile.info.full_name_placeholder")}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone">{t("profile.info.phone_label")}</Label>
                    <PhoneInput
                        international
                        countryCallingCodeEditable={false}
                        defaultCountry="TR"
                        placeholder={t("profile.info.phone_placeholder")}
                        value={formData.phone}
                        onChange={(value) => setFormData({ ...formData, phone: value || "" })}
                        disabled={isSaving}
                        className="flex h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-base ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>

                <div className="pt-4 flex justify-end">
                    <Button
                        type="submit"
                        disabled={isSaving}
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
