import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Save } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import Loader from "@/components/ui/Loader";

export function ProfileInfo() {
    const { user, refreshUserProfile } = useAuth();
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
            toast.success("Profil bilgileri güncellendi");
        } catch (error) {
            const err = error as Error;
            const errorMessage = err.message || "Bilinmeyen hata";
            toast.error(`Profil güncellenirken hata: ${errorMessage}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl"
        >
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Profil Bilgileri</h2>
                <p className="text-gray-500 text-sm">Kişisel bilgilerinizi buradan düzenleyebilirsiniz.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-orange-100/50">
                <div className="space-y-2">
                    <Label htmlFor="email">E-posta Adresi</Label>
                    <Input
                        id="email"
                        value={formData.email}
                        disabled
                        className="bg-gray-50 text-gray-500 border-gray-200"
                    />
                    <p className="text-xs text-gray-400">E-posta adresi değiştirilemez.</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="full_name">Ad Soyad</Label>
                    <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="Adınız ve Soyadınız"
                        className="focus-visible:ring-orange-500"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone">Telefon Numarası</Label>
                    <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="05XX XXX XX XX"
                        className="focus-visible:ring-orange-500"
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
                                Kaydet
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </motion.div>
    );
}
