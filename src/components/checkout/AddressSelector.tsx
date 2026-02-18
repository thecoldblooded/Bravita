import { useReducer, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { m } from "framer-motion";
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

interface AddressState {
    addresses: Address[];
    isLoading: boolean;
    showNewForm: boolean;
    isSubmitting: boolean;
    newAddress: {
        street: string;
        city: string;
        district: string;
        postal_code: string;
        address_type: AddressType;
    };
}

type AddressAction =
    | { type: 'SET_ADDRESSES'; payload: Address[] }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_SHOW_NEW_FORM'; payload: boolean }
    | { type: 'SET_SUBMITTING'; payload: boolean }
    | { type: 'UPDATE_NEW_ADDRESS'; payload: Partial<AddressState['newAddress']> }
    | { type: 'RESET_NEW_ADDRESS' };

const initialAddressState: AddressState = {
    addresses: [],
    isLoading: true,
    showNewForm: false,
    isSubmitting: false,
    newAddress: {
        street: "",
        city: "",
        district: "",
        postal_code: "",
        address_type: "home",
    },
};

function addressReducer(state: AddressState, action: AddressAction): AddressState {
    switch (action.type) {
        case 'SET_ADDRESSES':
            return { ...state, addresses: action.payload };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_SHOW_NEW_FORM':
            return { ...state, showNewForm: action.payload };
        case 'SET_SUBMITTING':
            return { ...state, isSubmitting: action.payload };
        case 'UPDATE_NEW_ADDRESS':
            return { ...state, newAddress: { ...state.newAddress, ...action.payload } };
        case 'RESET_NEW_ADDRESS':
            return { ...state, newAddress: initialAddressState.newAddress };
        default:
            return state;
    }
}

interface AddressSelectorProps {
    selectedAddressId: string | null;
    onSelect: (addressId: string) => void;
}

export function AddressSelector({ selectedAddressId, onSelect }: AddressSelectorProps) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [state, dispatch] = useReducer(addressReducer, initialAddressState);
    const { addresses, isLoading, showNewForm, isSubmitting, newAddress } = state;

    const fetchAddresses = useCallback(async () => {
        if (!user) return;
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const { data, error } = await supabase
                .from("addresses")
                .select("*")
                .eq("user_id", user.id)
                .order("is_default", { ascending: false });

            if (error) throw error;
            dispatch({ type: 'SET_ADDRESSES', payload: data || [] });

            // Auto-select default address
            if (data && data.length > 0 && !selectedAddressId) {
                const defaultAddr = data.find(a => a.is_default) || data[0];
                onSelect(defaultAddr.id);
            }
        } catch (err) {
            console.error("Error fetching addresses:", err);
            toast.error(t("profile.addresses.loading_error", "Adresler yüklenirken hata oluştu"));
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, [user, selectedAddressId, onSelect, t]);

    useEffect(() => {
        fetchAddresses();
    }, [fetchAddresses]);

    const handleAddAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || isSubmitting) return;

        dispatch({ type: 'SET_SUBMITTING', payload: true });
        try {
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

            toast.success(t("profile.addresses.add_success", "Adres eklendi"));
            dispatch({ type: 'RESET_NEW_ADDRESS' });
            dispatch({ type: 'SET_SHOW_NEW_FORM', payload: false });
            await fetchAddresses();

            // Select the newly added address
            if (data) {
                onSelect(data.id);
            }
        } catch (err) {
            const error = err as Error;
            console.error("Address add error details:", error);
            const errorMessage = error.message || t("common.unknown", "Bilinmeyen hata");
            toast.error(`${t("profile.addresses.add_error", "Adres eklenirken hata")}: ${errorMessage}`);
        } finally {
            dispatch({ type: 'SET_SUBMITTING', payload: false });
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
                    <p className="text-gray-500 mb-4">{t("profile.addresses.empty_state", "Henüz kayıtlı adresiniz yok.")}</p>
                    <Button
                        onClick={() => dispatch({ type: 'SET_SHOW_NEW_FORM', payload: true })}
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
                            <m.button
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
                            </m.button>
                        ))}
                    </div>

                    {!showNewForm && (
                        <Button
                            variant="outline"
                            onClick={() => dispatch({ type: 'SET_SHOW_NEW_FORM', payload: true })}
                            className="w-full border-dashed border-gray-300 text-gray-600 hover:border-orange-300 hover:text-orange-600"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {t("checkout.address.add_new", "Yeni Adres Ekle")}
                        </Button>
                    )}
                </>
            )}

            {showNewForm && (
                <m.form
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
                                    onClick={() => dispatch({ type: 'UPDATE_NEW_ADDRESS', payload: { address_type: "home" } })}
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
                                    onClick={() => dispatch({ type: 'UPDATE_NEW_ADDRESS', payload: { address_type: "work" } })}
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
                                onChange={(e) => dispatch({ type: 'UPDATE_NEW_ADDRESS', payload: { street: e.target.value } })}
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
                                onChange={(e) => dispatch({ type: 'UPDATE_NEW_ADDRESS', payload: { city: e.target.value } })}
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
                                onChange={(e) => dispatch({ type: 'UPDATE_NEW_ADDRESS', payload: { district: e.target.value } })}
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
                                onChange={(e) => dispatch({ type: 'UPDATE_NEW_ADDRESS', payload: { postal_code: e.target.value } })}
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
                            onClick={() => dispatch({ type: 'SET_SHOW_NEW_FORM', payload: false })}
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
                </m.form>
            )}
        </div>
    );
}
