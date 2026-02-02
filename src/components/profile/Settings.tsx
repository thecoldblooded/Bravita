import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Shield, Lock, Trash2, LogOut } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthOperations } from "@/hooks/useAuth";

import { ChangePasswordModal } from "./ChangePasswordModal";

export function Settings() {
    const { session } = useAuth();
    const { logout } = useAuthOperations();
    const navigate = useNavigate();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    const isOAuthUser = session?.user?.app_metadata?.provider !== "email";
    const providerName = session?.user?.app_metadata?.provider === "google" ? "Google" : "Sosyal";

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/", { replace: true });
            toast.success("Çıkış yapıldı");
        } catch (err) {
            console.error("Logout flow error:", err);
            // Even if there's an error, we navigate to home because the local state 
            // is likely cleared or the session is invalid
            navigate("/", { replace: true });
            toast.error("Oturum kapatılırken bir sorun oluştu ancak ana sayfaya yönlendiriliyorsunuz.");
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
        >
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Ayarlar</h2>
                <p className="text-gray-500 text-sm">Uygulama tercihlerinizi yönetin.</p>
            </div>

            <div className="space-y-6">
                {/* Notifications */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                        <Bell className="w-5 h-5 text-orange-500" />
                        <h3 className="font-semibold text-gray-900">Bildirimler</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-medium">E-posta Bildirimleri</Label>
                                <p className="text-xs text-gray-500">Kampanyalar ve güncellemeler hakkında e-posta alın.</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-medium">Sipariş Durumu</Label>
                                <p className="text-xs text-gray-500">Siparişiniz kargoya verildiğinde bildirim alın.</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </div>
                </section>

                {/* Security */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-5 h-5 text-blue-500" />
                        <h3 className="font-semibold text-gray-900">Güvenlik</h3>
                    </div>
                    <div className="space-y-4">
                        {isOAuthUser ? (
                            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                <p className="text-sm text-blue-800 flex items-center gap-2">
                                    <Lock className="w-4 h-4" />
                                    {providerName} ile giriş yaptınız. Şifre işlemleri {providerName} üzerinden yönetilmektedir.
                                </p>
                            </div>
                        ) : (
                            <ChangePasswordModal open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
                                <Button variant="outline" className="w-full justify-start text-gray-700">
                                    <Lock className="w-4 h-4 mr-2" />
                                    Şifre Değiştir
                                </Button>
                            </ChangePasswordModal>
                        )}
                    </div>
                </section>

                {/* Danger Zone */}
                <section className="bg-red-50 p-6 rounded-2xl border border-red-100">
                    <div className="flex items-center gap-3 mb-4">
                        <Trash2 className="w-5 h-5 text-red-500" />
                        <h3 className="font-semibold text-red-900">Hesap İşlemleri</h3>
                    </div>
                    <div className="space-y-3">
                        <Button
                            variant="outline"
                            className="w-full justify-start text-gray-700 bg-white hover:bg-gray-50 border-gray-200"
                            onClick={handleLogout}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Çıkış Yap
                        </Button>

                    </div>
                </section>
            </div>
        </motion.div>
    );
}
