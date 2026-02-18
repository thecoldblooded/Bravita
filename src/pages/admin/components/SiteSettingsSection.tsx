import { AnimatePresence, m } from "framer-motion";
import { Truck, Coins, Building2, Save, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SiteSettings } from "@/lib/admin";

interface SiteSettingsSectionProps {
    isOpen: boolean;
    isDark: boolean;
    isSaving: boolean;
    settings: SiteSettings | null;
    cardClass: string;
    textPrimary: string;
    textSecondary: string;
    inputClass: string;
    onUpdate: (settings: SiteSettings) => void;
    onSave: (e: React.FormEvent) => void;
    onCancel: () => void;
}

export function SiteSettingsSection({
    isOpen,
    isDark,
    isSaving,
    settings,
    cardClass,
    textPrimary,
    textSecondary,
    inputClass,
    onUpdate,
    onSave,
    onCancel
}: SiteSettingsSectionProps) {
    if (!settings) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <m.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-8 overflow-hidden"
                >
                    <div className={`p-6 rounded-2xl border ${cardClass}`}>
                        <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${textPrimary}`}>
                            <Truck className="w-5 h-5 text-orange-500" />
                            Site & Kargo Ayarları
                        </h3>
                        <form onSubmit={onSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="settings-shipping-cost" className={`text-sm font-semibold flex items-center gap-2 ${textSecondary}`}>
                                        <Coins className="w-4 h-4" />
                                        Sabit Kargo Ücreti (₺)
                                    </label>
                                    <Input
                                        id="settings-shipping-cost"
                                        type="number"
                                        step="0.01"
                                        value={settings.shipping_cost}
                                        onChange={(e) => onUpdate({ ...settings, shipping_cost: parseFloat(e.target.value) })}
                                        className={inputClass}
                                        placeholder="49.90"
                                    />
                                    <p className="text-[10px] text-gray-400">Sabit kargo gönderim bedeli.</p>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="settings-shipping-threshold" className={`text-sm font-semibold flex items-center gap-2 ${textSecondary}`}>
                                        <Coins className="w-4 h-4" />
                                        Bedava Kargo Alt Limiti (₺)
                                    </label>
                                    <Input
                                        id="settings-shipping-threshold"
                                        type="number"
                                        step="1"
                                        value={settings.free_shipping_threshold}
                                        onChange={(e) => onUpdate({ ...settings, free_shipping_threshold: parseFloat(e.target.value) })}
                                        className={inputClass}
                                        placeholder="1500"
                                    />
                                    <p className="text-[10px] text-gray-400">Bu tutar ve üzeri alışverişlerde kargo ücretsiz olur.</p>
                                </div>
                            </div>

                            <div className="pt-4 mt-4 border-t border-dashed border-gray-700">
                                <h4 className={`text-sm font-bold mb-4 flex items-center gap-2 ${textPrimary}`}>
                                    <Building2 className="w-4 h-4 text-orange-500" />
                                    Banka Hesap Bilgileri (Havale/EFT)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                    <div className="space-y-2">
                                        <label htmlFor="settings-bank-name" className={`text-sm font-semibold ${textSecondary}`}>Banka Adı</label>
                                        <Input
                                            id="settings-bank-name"
                                            value={settings.bank_name}
                                            onChange={(e) => onUpdate({ ...settings, bank_name: e.target.value })}
                                            className={inputClass}
                                            placeholder="Örn: Ziraat Bankası"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="settings-iban" className={`text-sm font-semibold ${textSecondary}`}>IBAN</label>
                                        <Input
                                            id="settings-iban"
                                            value={settings.bank_iban}
                                            onChange={(e) => onUpdate({ ...settings, bank_iban: e.target.value })}
                                            className={inputClass}
                                            placeholder="TR00..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="settings-account-holder" className={`text-sm font-semibold ${textSecondary}`}>Hesap Sahibi</label>
                                        <Input
                                            id="settings-account-holder"
                                            value={settings.bank_account_holder}
                                            onChange={(e) => onUpdate({ ...settings, bank_account_holder: e.target.value })}
                                            className={inputClass}
                                            placeholder="Örn: Bravita Sağlık A.Ş."
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={onCancel}
                                    className={isDark ? "text-gray-400 hover:text-white" : ""}
                                >
                                    İptal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="bg-orange-500 hover:bg-orange-600 text-white min-w-32"
                                >
                                    {isSaving ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4 mr-2" />
                                    )}
                                    Ayarları Kaydet
                                </Button>
                            </div>
                        </form>
                    </div>
                </m.div>
            )}
        </AnimatePresence>
    );
}
