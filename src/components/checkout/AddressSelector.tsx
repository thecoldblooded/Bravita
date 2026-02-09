import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { MapPin, Plus, Check, Home, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Loader from "@/components/ui/Loader";

type AddressType = 'home' | 'work';

interface Address {
    id: string;
    street: string;
    city: string;
    district?: string;
    postal_code: string;
    is_default: boolean;
    address_type: AddressType;
}

interface AddressSelectorProps {
    selectedAddressId: string | null;
    onSelect: (addressId: string) => void;
}

export function AddressSelector({ selectedAddressId, onSelect }: AddressSelectorProps) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showNewForm, setShowNewForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newAddress, setNewAddress] = useState({
        street: "",
        city: "",
        district: "",
        postal_code: "",
        address_type: "home" as AddressType,
    });

    const fetchAddresses = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // TEST USER BYPASS - Use localStorage for test user
            if (user.id === "test-user-id-12345") {
                const savedAddresses = localStorage.getItem("test_user_addresses");
                const addresses = savedAddresses ? JSON.parse(savedAddresses) : [];
                setAddresses(addresses);
                if (addresses.length > 0 && !selectedAddressId) {
                    const defaultAddr = addresses.find((a: Address) => a.is_default) || addresses[0];
                    onSelect(defaultAddr.id);
                }
                setIsLoading(false);
                return;
            }
            // END TEST USER BYPASS

            const { data, error } = await supabase
                .from("addresses")
                .select("*")
                .eq("user_id", user.id)
                .order("is_default", { ascending: false });

            if (error) throw error;
            setAddresses(data || []);

            // Auto-select default address
            if (data && data.length > 0 && !selectedAddressId) {
                const defaultAddr = data.find(a => a.is_default) || data[0];
                onSelect(defaultAddr.id);
            }
        } catch (err) {
            console.error("Error fetching addresses:", err);
            toast.error("Adresler yüklenirken hata oluştu");
        } finally {
            setIsLoading(false);
        }
    }, [user, selectedAddressId, onSelect]);

    useEffect(() => {
        fetchAddresses();
    }, [fetchAddresses]);

    const handleAddAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || isSubmitting) return;

        setIsSubmitting(true);
        try {
            // TEST USER BYPASS - Store in localStorage for test user
            if (user.id === "test-user-id-12345") {
                const newAddr: Address = {
                    id: `addr-${Date.now()}`,
                    street: newAddress.street,
                    city: newAddress.city,
                    district: newAddress.district,
                    postal_code: newAddress.postal_code,
                    address_type: newAddress.address_type,
                    is_default: addresses.length === 0,
                };
                const savedAddresses = localStorage.getItem("test_user_addresses");
                const existingAddresses = savedAddresses ? JSON.parse(savedAddresses) : [];
                const updatedAddresses = [...existingAddresses, newAddr];
                localStorage.setItem("test_user_addresses", JSON.stringify(updatedAddresses));

                toast.success("Adres eklendi");
                setNewAddress({ street: "", city: "", district: "", postal_code: "", address_type: "home" });
                setShowNewForm(false);
                setAddresses(updatedAddresses);
                onSelect(newAddr.id);
                setIsSubmitting(false);
                return;
            }
            // END TEST USER BYPASS

            // console.log("Adding address for user:", user.id);
            const { data, error } = await supabase
                .from("addresses")
                .insert({
                    user_id: user.id,
                    street: newAddress.street,
                    city: newAddress.city,
                    district: newAddress.district,
                    postal_code: newAddress.postal_code,
                    address_type: newAddress.address_type,
                    is_default: addresses.length === 0,
                })
                .select()
                .single();

            if (error) {
                console.error("Supabase address insert error:", error);
                throw error;
            }

            toast.success("Adres eklendi");
            setNewAddress({ street: "", city: "", district: "", postal_code: "", address_type: "home" });
            setShowNewForm(false);
            await fetchAddresses();

            // Select the newly added address
            if (data) {
                onSelect(data.id);
            }
        } catch (err) {
            const error = err as Error;
            console.error("Address add error details:", error);
            const errorMessage = error.message || "Bilinmeyen hata";
            toast.error(`Adres eklenirken hata: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Loader />
                <p className="text-gray-500 mt-4">{t("checkout.address.loading", "Adresler yükleniyor...")}</p>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t("checkout.delivery_title", "Teslimat Adresi")}</h2>
            <p className="text-gray-500 text-sm mb-6">{t("checkout.delivery_desc", "Siparişinizin gönderileceği adresi seçin.")}</p>

            {addresses.length === 0 && !showNewForm ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">Henüz kayıtlı adresiniz yok.</p>
                    <Button
                        onClick={() => setShowNewForm(true)}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        {t("checkout.address.add_new", "Yeni Adres Ekle")}
                    </Button>
                </div>
            ) : (
                <>
                    <div className="grid gap-3 mb-4">
                        {addresses.map((address) => (
                            <motion.button
                                key={address.id}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => onSelect(address.id)}
                                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedAddressId === address.id
                                    ? "border-orange-500 bg-orange-50"
                                    : "border-gray-100 bg-white hover:border-orange-200"
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-full ${selectedAddressId === address.id
                                        ? "bg-orange-500 text-white"
                                        : "bg-gray-100 text-gray-500"
                                        }`}>
                                        {address.address_type === "work" ? (
                                            <Building2 className="w-5 h-5" />
                                        ) : (
                                            <Home className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium text-gray-900">{address.city}</h3>
                                            {address.is_default && (
                                                <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                                                    {t("profile.addresses.item.default", "Varsayılan")}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">{address.street}</p>
                                        <p className="text-xs text-gray-400">{address.postal_code}</p>
                                    </div>
                                    {selectedAddressId === address.id && (
                                        <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                                            <Check className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </div>
                            </motion.button>
                        ))}
                    </div>

                    {!showNewForm && (
                        <Button
                            variant="outline"
                            onClick={() => setShowNewForm(true)}
                            className="w-full border-dashed border-gray-300 text-gray-600 hover:border-orange-300 hover:text-orange-600"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {t("checkout.address.add_new", "Yeni Adres Ekle")}
                        </Button>
                    )}
                </>
            )}

            {showNewForm && (
                <motion.form
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="bg-orange-50/50 border border-orange-100 p-4 rounded-xl mt-4 overflow-hidden"
                    onSubmit={handleAddAddress}
                >
                    <h3 className="font-medium text-gray-900 mb-4">{t("checkout.address.add_new_title", "Yeni Adres Ekle")}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* Address Type Selector */}
                        <div className="space-y-2 md:col-span-2">
                            <Label>{t("checkout.address.type", "Adres Tipi")}</Label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setNewAddress({ ...newAddress, address_type: "home" })}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${newAddress.address_type === "home"
                                        ? "border-orange-500 bg-orange-50 text-orange-700"
                                        : "border-gray-200 bg-white text-gray-600 hover:border-orange-200"
                                        }`}
                                >
                                    <Home className="w-4 h-4" />
                                    <span className="font-medium">{t("checkout.address.home", "Ev")}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewAddress({ ...newAddress, address_type: "work" })}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${newAddress.address_type === "work"
                                        ? "border-orange-500 bg-orange-50 text-orange-700"
                                        : "border-gray-200 bg-white text-gray-600 hover:border-orange-200"
                                        }`}
                                >
                                    <Building2 className="w-4 h-4" />
                                    <span className="font-medium">{t("checkout.address.work", "İşyeri")}</span>
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="street">{t("checkout.address.street_label", "Adres Başlığı ve Açık Adres")}</Label>
                            <Input
                                id="street"
                                value={newAddress.street}
                                onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                                placeholder={newAddress.address_type === "home" ? t("checkout.address.home_placeholder", "Örn: Evim - Çiçek Mah. Gül Sok. No:1") : t("checkout.address.work_placeholder", "Örn: Ofisim - Levent Plaza Kat:5")}
                                required
                                className="bg-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="city">{t("checkout.address.city", "Şehir")}</Label>
                            <Input
                                id="city"
                                value={newAddress.city}
                                onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                                placeholder={t("checkout.address.city_placeholder", "İstanbul")}
                                required
                                className="bg-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="district">{t("checkout.address.district", "İlçe")}</Label>
                            <Input
                                id="district"
                                value={newAddress.district}
                                onChange={(e) => setNewAddress({ ...newAddress, district: e.target.value })}
                                placeholder={t("checkout.address.district_placeholder", "Kadıköy")}
                                required
                                className="bg-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="postal_code">{t("checkout.address.postal_code", "Posta Kodu")}</Label>
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
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setShowNewForm(false)}
                            disabled={isSubmitting}
                        >
                            {t("common.cancel", "İptal")}
                        </Button>
                        <Button
                            type="submit"
                            className="bg-orange-500 hover:bg-orange-600 text-white min-w-20"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader size="1.25rem" noMargin /> : t("common.save", "Kaydet")}
                        </Button>
                    </div>
                </motion.form>
            )}
        </div>
    );
}
