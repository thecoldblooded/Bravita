import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, safeQuery } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Plus, Trash2, Home, Star, Building2 } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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

export function AddressBook() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
    const [newAddress, setNewAddress] = useState({
        street: "",
        city: "",
        district: "",
        postal_code: "",
        address_type: "home" as AddressType,
    });

    const fetchLock = useRef(false);
    const retryCountRef = useRef(0);
    const isMountedRef = useRef(true);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const fetchAddresses = useCallback(async () => {
        if (!user || fetchLock.current || !isMountedRef.current) return;
        fetchLock.current = true;
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await safeQuery<Address[]>(supabase
                .from("addresses")
                .select("*")
                .eq("user_id", user.id)
                .order("is_default", { ascending: false }));

            if (fetchError) {
                if (fetchError.isAborted) {
                    console.debug("Address fetch was aborted (expected on navigation)");
                    return;
                }
                if (!isMountedRef.current) return;
                console.error("Address fetch error:", fetchError);
                const msg = fetchError.message || t("profile.addresses.loading_error");
                setError(msg);
                toast.error(msg);
                return;
            }
            retryCountRef.current = 0; // Reset on success
            if (isMountedRef.current) {
                setAddresses(data || []);
            }
        } catch (err: unknown) {
            if (!isMountedRef.current) return;
            console.error("Unexpected error fetching addresses:", err);
            const msg = err instanceof Error ? err.message : t("profile.addresses.loading_error");
            setError(msg);
            toast.error(msg);
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
            }
            fetchLock.current = false;
        }
    }, [user, t]);

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
                district: newAddress.district,
                postal_code: newAddress.postal_code,
                address_type: newAddress.address_type,
                is_default: addresses.length === 0,
            });

            if (insertError) throw insertError;

            if (!isMountedRef.current) return;
            toast.success(t("profile.addresses.add_success"));
            setNewAddress({ street: "", city: "", district: "", postal_code: "", address_type: "home" });
            setIsAdding(false);
            fetchAddresses();
        } catch (err: unknown) {
            if (!isMountedRef.current) return;
            toast.error(err instanceof Error ? err.message : t("profile.addresses.add_error"));
        } finally {
            if (isMountedRef.current) {
                setIsSubmitting(false);
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (deletingId || !isMountedRef.current) return;

        const addressToDelete = addresses.find(a => a.id === id);
        if (addressToDelete?.is_default) {
            toast.error(t("profile.addresses.delete_default_error"));
            return;
        }

        setDeletingId(id);
        try {
            const { error: deleteError } = await supabase.from("addresses").delete().eq("id", id);

            if (deleteError) {
                // Handle localized error from backend if bypass frontend check
                if (deleteError.message?.includes("ERR_ADDRESS_DELETE_DEFAULT_FORBIDDEN") ||
                    deleteError.message?.includes("Birden fazla adresiniz varken")) {
                    toast.error(t("profile.addresses.delete_default_error"));
                } else {
                    throw deleteError;
                }
                return;
            }

            if (!isMountedRef.current) return;
            toast.success(t("profile.addresses.delete_success"));
            setAddresses(prev => prev.filter((a) => a.id !== id));
        } catch (err: unknown) {
            if (!isMountedRef.current) return;
            const message = err instanceof Error ? err.message : String(err);
            if (message.includes("ERR_ADDRESS_DELETE_DEFAULT_FORBIDDEN") ||
                message.includes("Birden fazla adresiniz varken")) {
                toast.error(t("profile.addresses.delete_default_error"));
            } else {
                toast.error(err instanceof Error ? err.message : t("errors.unknown"));
            }
        } finally {
            if (isMountedRef.current) {
                setDeletingId(null);
            }
        }
    };

    const handleSetDefault = async (id: string) => {
        if (settingDefaultId || !user || !isMountedRef.current) return;
        setSettingDefaultId(id);
        try {
            // First, set all addresses to non-default
            const { error: resetError } = await supabase
                .from("addresses")
                .update({ is_default: false })
                .eq("user_id", user.id);

            if (resetError) throw resetError;

            // Then set the selected address as default
            const { error: updateError } = await supabase
                .from("addresses")
                .update({ is_default: true })
                .eq("id", id);

            if (updateError) throw updateError;

            if (!isMountedRef.current) return;
            toast.success(t("profile.addresses.set_default_success"));

            // Update local state
            setAddresses(prev =>
                prev.map(addr => ({
                    ...addr,
                    is_default: addr.id === id
                })).sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0))
            );
        } catch (err: unknown) {
            if (!isMountedRef.current) return;
            toast.error(err instanceof Error ? err.message : t("errors.unknown"));
        } finally {
            if (isMountedRef.current) {
                setSettingDefaultId(null);
            }
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
                    <h2 className="text-xl font-bold text-gray-900">{t("profile.addresses.title")}</h2>
                    <p className="text-gray-500 text-sm">{t("profile.addresses.description")}</p>
                </div>
                <Button
                    onClick={() => setIsAdding(!isAdding)}
                    variant="outline"
                    className="border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {t("profile.addresses.add_new")}
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
                            {/* Address Type Selector */}
                            <div className="space-y-2 md:col-span-2">
                                <Label>{t("profile.addresses.form.type")}</Label>
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
                                        <span className="font-medium">{t("profile.addresses.form.home")}</span>
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
                                        <span className="font-medium">{t("profile.addresses.form.work")}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="city">{t("profile.addresses.form.city")}</Label>
                                <Input
                                    id="city"
                                    value={newAddress.city}
                                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                                    placeholder={t("profile.addresses.form.city_placeholder")}
                                    required
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="district">{t("profile.addresses.form.district")}</Label>
                                <Input
                                    id="district"
                                    value={newAddress.district}
                                    onChange={(e) => setNewAddress({ ...newAddress, district: e.target.value })}
                                    placeholder={t("profile.addresses.form.district_placeholder")}
                                    required
                                    className="bg-white"
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="street">{t("profile.addresses.form.street_label")}</Label>
                                <Input
                                    id="street"
                                    value={newAddress.street}
                                    onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                                    placeholder={newAddress.address_type === "home" ? t("profile.addresses.form.street_placeholder_home") : t("profile.addresses.form.street_placeholder_work")}
                                    required
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="postal_code">{t("profile.addresses.form.postal_code")}</Label>
                                <Input
                                    id="postal_code"
                                    value={newAddress.postal_code}
                                    onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                                    placeholder={t("profile.addresses.form.postal_code_placeholder")}
                                    required
                                    className="bg-white"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setIsAdding(false)} disabled={isSubmitting}>{t("profile.addresses.form.cancel")}</Button>
                            <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white min-w-20" disabled={isSubmitting}>
                                {isSubmitting ? <Loader size="1.25rem" noMargin /> : t("profile.addresses.form.save")}
                            </Button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            <div className="grid gap-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader />
                        <p className="text-gray-500 mt-4">{t("profile.addresses.loading")}</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-12 bg-red-50 rounded-2xl border border-red-100 p-6">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MapPin className="w-6 h-6 text-red-600" />
                        </div>
                        <p className="text-red-600 font-bold mb-2">{t("profile.addresses.error_title")}</p>
                        <p className="text-red-500 text-sm font-mono bg-white p-3 rounded-lg border border-red-100 mb-6 wrap-anywhere">
                            {error}
                        </p>
                        <Button
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => fetchAddresses()}
                        >
                            {t("profile.addresses.error_retry")}
                        </Button>
                        <div className="mt-4 text-xs text-gray-500">
                            {t("profile.addresses.error_note")}
                        </div>
                    </div>
                ) : addresses.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">{t("profile.addresses.empty_state")}</p>
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
                                    {address.address_type === "work" ? (
                                        <Building2 className="w-5 h-5" />
                                    ) : (
                                        <Home className="w-5 h-5" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-medium text-gray-900">
                                            {address.city}{address.district ? ` / ${address.district}` : ""}
                                        </h3>
                                        {address.is_default && (
                                            <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">{t("profile.addresses.item.default")}</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">{address.street}</p>
                                    <p className="text-xs text-gray-400">{address.postal_code}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {!address.is_default && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSetDefault(address.id)}
                                        disabled={!!settingDefaultId || !!deletingId}
                                        className={`group-hover:opacity-100 text-orange-500 hover:text-orange-600 hover:bg-orange-50 transition-opacity text-xs gap-1 ${settingDefaultId === address.id ? 'opacity-100' : 'opacity-0'}`}
                                    >
                                        {settingDefaultId === address.id ? (
                                            <Loader size="0.875rem" noMargin />
                                        ) : (
                                            <>
                                                <Star className="w-3.5 h-3.5" />
                                                {t("profile.addresses.item.set_default")}
                                            </>
                                        )}
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(address.id)}
                                    disabled={!!deletingId || !!settingDefaultId}
                                    title={address.is_default ? t("profile.addresses.delete_default_error") : ""}
                                    className={`group-hover:opacity-100 transition-opacity ${deletingId === address.id ? 'opacity-100' : 'opacity-0'} ${address.is_default
                                        ? "text-gray-300 cursor-not-allowed"
                                        : "text-red-400 hover:text-red-500 hover:bg-red-50"
                                        }`}
                                >
                                    {deletingId === address.id ? (
                                        <Loader size="1rem" noMargin />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </motion.div>
    );
}
