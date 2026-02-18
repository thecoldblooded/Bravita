import { useState, useEffect } from "react";
import { m } from "framer-motion";
import { Bell, Shield, Lock, Trash2, LogOut } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthOperations } from "@/hooks/useAuth";

import { ChangePasswordModal } from "./ChangePasswordModal";

import { supabase } from "@/lib/supabase";

// ... [existing imports]

export function Settings() {
    const { t } = useTranslation();
    const { session } = useAuth();
    const { logout } = useAuthOperations();
    const navigate = useNavigate();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [preferences, setPreferences] = useState({ email: true, order: true });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function loadPreferences() {
            if (!session?.user?.id) return;
            const { data, error } = await supabase
                .from('profiles')
                .select('email_notifications, order_notifications')
                .eq('id', session.user.id)
                .single();

            if (data && !error) {
                setPreferences({
                    email: data.email_notifications ?? true,
                    order: data.order_notifications ?? true
                });
            }
        }
        loadPreferences();
    }, [session?.user?.id]);

    const handlePreferenceChange = async (key: 'email' | 'order', value: boolean) => {
        if (!session?.user?.id) return;

        // Optimistic update
        setPreferences(prev => ({ ...prev, [key]: value }));

        const updateData = key === 'email'
            ? { email_notifications: value }
            : { order_notifications: value };

        const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', session.user.id);

        if (error) {
            toast.error(t("profile.settings.preferences_failed"));
            // Revert
            setPreferences(prev => ({ ...prev, [key]: !value }));
        } else {
            toast.success(t("profile.settings.preferences_saved"));
        }
    };

    const isOAuthUser = session?.user?.app_metadata?.provider !== "email";
    const providerName = session?.user?.app_metadata?.provider === "google" ? "Google" : t("common.social");

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/", { replace: true });
            toast.success(t("auth.logout_successful"));
        } catch (err) {
            // Even if there's an error, we navigate to home because the local state 
            // is likely cleared or the session is invalid
            navigate("/", { replace: true });
            toast.error(t("auth.logout_failed"));
        }
    };

    return (
        <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
        >
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">{t("profile.settings.title")}</h2>
                <p className="text-gray-500 text-sm">{t("profile.settings.description")}</p>
            </div>

            <div className="space-y-6">
                {/* Notifications */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                        <Bell className="w-5 h-5 text-orange-500" />
                        <h3 className="font-semibold text-gray-900">{t("profile.settings.notifications.title")}</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-medium">{t("profile.settings.notifications.email_title")}</Label>
                                <p className="text-xs text-gray-500">{t("profile.settings.notifications.email_desc")}</p>
                            </div>
                            <Switch
                                checked={preferences.email}
                                onCheckedChange={(val) => handlePreferenceChange('email', val)}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-medium">{t("profile.settings.notifications.order_title")}</Label>
                                <p className="text-xs text-gray-500">{t("profile.settings.notifications.order_desc")}</p>
                            </div>
                            <Switch
                                checked={preferences.order}
                                onCheckedChange={(val) => handlePreferenceChange('order', val)}
                            />
                        </div>
                    </div>
                </section>

                {/* Security */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-5 h-5 text-blue-500" />
                        <h3 className="font-semibold text-gray-900">{t("profile.settings.security.title")}</h3>
                    </div>
                    <div className="space-y-4">
                        {isOAuthUser ? (
                            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                <p className="text-sm text-blue-800 flex items-center gap-2">
                                    <Lock className="w-4 h-4" />
                                    {t("profile.settings.security.oauth_notice", { provider: providerName })}
                                </p>
                            </div>
                        ) : (
                            <ChangePasswordModal open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
                                <Button variant="outline" className="w-full justify-start text-gray-700">
                                    <Lock className="w-4 h-4 mr-2" />
                                    {t("profile.settings.security.change_password")}
                                </Button>
                            </ChangePasswordModal>
                        )}
                    </div>
                </section>

                {/* Danger Zone */}
                <section className="bg-red-50 p-6 rounded-2xl border border-red-100">
                    <div className="flex items-center gap-3 mb-4">
                        <Trash2 className="w-5 h-5 text-red-500" />
                        <h3 className="font-semibold text-red-900">{t("profile.settings.danger_zone.title")}</h3>
                    </div>
                    <div className="space-y-3">
                        <Button
                            variant="outline"
                            className="w-full justify-start text-gray-700 bg-white hover:bg-gray-50 border-gray-200"
                            onClick={handleLogout}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            {t("auth.logout")}
                        </Button>

                    </div>
                </section>
            </div>
        </m.div>
    );
}
