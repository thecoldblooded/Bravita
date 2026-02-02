import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Plus, Trash2, Home } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import Loader from "@/components/ui/Loader";

interface Address {
    id: string;
    street: string;
    city: string;
    postal_code: string;
    is_default: boolean;
}

export function AddressBook() {
    const { user } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [newAddress, setNewAddress] = useState({
        street: "",
        city: "",
        postal_code: "",
    });

    const fetchLock = useRef(false);

    const fetchAddresses = useCallback(async () => {
        if (!user || fetchLock.current) return;
        fetchLock.current = true;
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from("addresses")
                .select("*")
                .eq("user_id", user.id)
                .order("is_default", { ascending: false });

            if (fetchError) {
                console.error("Supabase fetch error:", fetchError);
                throw new Error(`${fetchError.code}: ${fetchError.message}`);
            }
            setAddresses(data || []);
        } catch (err) {
            console.error("Error fetching addresses:", err);
            const msg = err instanceof Error ? err.message : "Adresler yüklenemedi";
            setError(msg);
            toast.error(msg);
        } finally {
            setIsLoading(false);
            fetchLock.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]); // Use user.id for rock-stable dependency tracking

    useEffect(() => {
        fetchAddresses();
    }, [fetchAddresses]);

    const handleAddAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const { error: insertError } = await supabase.from("addresses").insert({
                user_id: user.id,
                street: newAddress.street,
                city: newAddress.city,
                postal_code: newAddress.postal_code,
                is_default: addresses.length === 0,
            });

            if (insertError) throw insertError;

            toast.success("Adres eklendi");
            setNewAddress({ street: "", city: "", postal_code: "" });
            setIsAdding(false);
            fetchAddresses();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Adres eklenirken hata oluştu");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (deletingId) return;
        setDeletingId(id);
        try {
            const { error: deleteError } = await supabase.from("addresses").delete().eq("id", id);
            if (deleteError) throw deleteError;
            toast.success("Adres silindi");
            setAddresses(prev => prev.filter((a) => a.id !== id));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Adres silinemedi");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Adreslerim</h2>
                    <p className="text-gray-500 text-sm">Teslimat adreslerinizi yönetin.</p>
                </div>
                <Button
                    onClick={() => setIsAdding(!isAdding)}
                    variant="outline"
                    className="border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Adres Ekle
                </Button>
            </div>

            <AnimatePresence>
                {isAdding && (
                    <motion.form
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-orange-50/50 border border-orange-100 p-4 rounded-xl mb-6 overflow-hidden"
                        onSubmit={handleAddAddress}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="street">Adres Başlığı ve Açık Adres</Label>
                                <Input
                                    id="street"
                                    value={newAddress.street}
                                    onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                                    placeholder="Örn: Evim - Çiçek Mah. Gül Sok. No:1"
                                    required
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">Şehir</Label>
                                <Input
                                    id="city"
                                    value={newAddress.city}
                                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                                    placeholder="İstanbul"
                                    required
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="postal_code">Posta Kodu</Label>
                                <Input
                                    id="postal_code"
                                    value={newAddress.postal_code}
                                    onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                                    placeholder="34000"
                                    required
                                    className="bg-white"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setIsAdding(false)} disabled={isSubmitting}>İptal</Button>
                            <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white min-w-20" disabled={isSubmitting}>
                                {isSubmitting ? <Loader size="1.25rem" noMargin /> : "Kaydet"}
                            </Button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            <div className="grid gap-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader />
                        <p className="text-gray-500 mt-4">Adresler yükleniyor...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-12 bg-red-50 rounded-2xl border border-red-100 p-6">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MapPin className="w-6 h-6 text-red-600" />
                        </div>
                        <p className="text-red-600 font-bold mb-2">Adresler Yüklenirken Hata Oluştu</p>
                        <p className="text-red-500 text-sm font-mono bg-white p-3 rounded-lg border border-red-100 mb-6 wrap-anywhere">
                            {error}
                        </p>
                        <Button
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => fetchAddresses()}
                        >
                            Tekrar Dene
                        </Button>
                        <div className="mt-4 text-xs text-gray-500">
                            Problem devam ederse veritabanı tablolarının oluşturulduğundan emin olun.
                        </div>
                    </div>
                ) : addresses.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Henüz kayıtlı adresiniz yok.</p>
                    </div>
                ) : (
                    addresses.map((address) => (
                        <motion.div
                            layout
                            key={address.id}
                            className={`p-4 rounded-xl border flex items-center justify-between group transition-colors ${address.is_default
                                ? "bg-white border-orange-200 shadow-sm"
                                : "bg-white border-gray-100 hover:border-orange-100"
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-full ${address.is_default ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"}`}>
                                    <Home className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-medium text-gray-900">{address.city}</h3>
                                        {address.is_default && (
                                            <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">Varsayılan</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">{address.street}</p>
                                    <p className="text-xs text-gray-400">{address.postal_code}</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(address.id)}
                                disabled={!!deletingId}
                                className={`group-hover:opacity-100 text-red-400 hover:text-red-500 hover:bg-red-50 transition-opacity ${deletingId === address.id ? 'opacity-100' : 'opacity-0'}`}
                            >
                                {deletingId === address.id ? (
                                    <Loader size="1rem" noMargin />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                            </Button>
                        </motion.div>
                    ))
                )}
            </div>
        </motion.div>
    );
}
