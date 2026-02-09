import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { getPromoCodes, addPromoCode, updatePromoCode, deletePromoCode, PromoCode } from "@/lib/admin";
import { TableSkeleton } from "@/components/admin/skeletons";
import { Search, Edit2, Trash2, Plus, Percent, Coins, CheckCircle, AlertCircle, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PromoCodeModal } from "@/components/admin/PromoCodeModal";
import { PromoLogsModal } from "@/components/admin/PromoLogsModal";
import { formatDate } from "@/lib/utils";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

function PromoCodesContent() {
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [filteredPromoCodes, setFilteredPromoCodes] = useState<PromoCode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const { theme } = useAdminTheme();
    const isDark = theme === "dark";
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
    const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
    const [viewingLogsPromo, setViewingLogsPromo] = useState<PromoCode | null>(null);

    useEffect(() => { loadPromoCodes(); }, []);

    useEffect(() => {
        if (!search.trim()) setFilteredPromoCodes(promoCodes);
        else setFilteredPromoCodes(promoCodes.filter(p => p.code.toLowerCase().includes(search.toLowerCase())));
    }, [search, promoCodes]);

    async function loadPromoCodes() {
        try {
            const data = await getPromoCodes();
            setPromoCodes(data);
            setFilteredPromoCodes(data);
        } catch (error) {
            toast.error("Promosyon kodları yüklenemedi");
        } finally {
            setIsLoading(false);
        }
    }

    const handleSavePromo = async (promoData: Partial<PromoCode>) => {
        try {
            if (editingPromo) {
                await updatePromoCode(editingPromo.id, promoData);
                toast.success("Promosyon kodu güncellendi");
            } else {
                await addPromoCode(promoData as Omit<PromoCode, 'id' | 'usage_count'>);
                toast.success("Promosyon kodu eklendi");
            }
            await loadPromoCodes();
        } catch (error) {
            toast.error("İşlem başarısız oldu");
            throw error;
        }
    };

    const handleDeletePromo = async (promo: PromoCode) => {
        if (!confirm(`"${promo.code}" kodunu silmek istediğinize emin misiniz?`)) return;
        try {
            await deletePromoCode(promo.id);
            toast.success("Promosyon kodu silindi");
            setPromoCodes(promoCodes.filter(p => p.id !== promo.id));
        } catch (error) {
            toast.error("Silinemedi");
        }
    };

    const toggleStatus = async (promo: PromoCode) => {
        try {
            await updatePromoCode(promo.id, { is_active: !promo.is_active });
            setPromoCodes(promoCodes.map(p => p.id === promo.id ? { ...p, is_active: !promo.is_active } : p));
            toast.success(promo.is_active ? "Kod pasife alındı" : "Kod aktif edildi");
        } catch (error) {
            toast.error("Durum güncellenemedi");
        }
    };

    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
    const cardClass = isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100";
    const inputClass = isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white";
    const tableHeaderClass = isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-100";
    const rowHoverClass = isDark ? "hover:bg-gray-700" : "hover:bg-gray-50";

    if (isLoading) return <div className="max-w-7xl mx-auto"><TableSkeleton rows={5} columns={5} /></div>;

    return (
        <>
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className={`text-2xl font-bold ${textPrimary}`}>Promosyon Kodları</h1>
                        <p className={textSecondary}>İndirim kuponlarını ve kampanyaları yönetin.</p>
                    </div>
                    <Button onClick={() => { setEditingPromo(null); setIsModalOpen(true); }} className="bg-orange-500 hover:bg-orange-600 text-white">
                        <Plus className="w-4 h-4 mr-2" />Yeni Kod Ekle
                    </Button>
                </div>
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input placeholder="Kod Ara..." value={search} onChange={(e) => setSearch(e.target.value)} className={`pl-10 ${inputClass}`} />
                </div>
                <div className={`rounded-2xl border overflow-hidden shadow-sm ${cardClass}`}>
                    <table className="w-full">
                        <thead className={`border-b ${tableHeaderClass}`}>
                            <tr className={`text-left text-xs font-semibold uppercase tracking-wider ${textSecondary}`}>
                                <th className="px-6 py-4">Kod</th><th className="px-6 py-4">İndirim</th><th className="px-6 py-4">Limitler</th><th className="px-6 py-4">Kullanım</th><th className="px-6 py-4">Durum</th><th className="px-6 py-4 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className={isDark ? "divide-y divide-gray-700" : "divide-y divide-gray-100"}>
                            {filteredPromoCodes.map((promo) => (
                                <tr key={promo.id} className={`transition-colors ${rowHoverClass}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? "bg-orange-500/20 text-orange-400" : "bg-orange-50 text-orange-600"}`}>
                                                {promo.discount_type === 'percentage' ? <Percent className="w-5 h-5" /> : <Coins className="w-5 h-5" />}
                                            </div>
                                            <div><p className={`font-bold font-mono ${textPrimary}`}>{promo.code}</p><p className={`text-xs ${textSecondary}`}>{promo.discount_type === 'percentage' ? 'Yüzde' : 'Sabit'}</p></div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><span className={`font-bold text-lg ${textPrimary}`}>{promo.discount_type === 'percentage' ? `%${promo.discount_value}` : `₺${promo.discount_value}`}</span>{promo.max_discount_amount && <div className={`text-xs ${textSecondary}`}>Max: ₺{promo.max_discount_amount}</div>}</td>
                                    <td className={`px-6 py-4 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}><div>Min: {promo.min_order_amount ? `₺${promo.min_order_amount}` : '-'}</div><div className={`text-xs ${textSecondary}`}>{promo.start_date ? formatDate(promo.start_date) : '-'} - {promo.end_date ? formatDate(promo.end_date) : '∞'}</div></td>
                                    <td className="px-6 py-4"><span className={`text-sm font-medium ${textPrimary}`}>{promo.usage_count} / {promo.usage_limit || '∞'}</span>{promo.usage_limit && <div className={`w-24 h-1.5 rounded-full overflow-hidden mt-1 ${isDark ? "bg-gray-600" : "bg-gray-100"}`}><div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, (promo.usage_count / promo.usage_limit) * 100)}%` }} /></div>}</td>
                                    <td className="px-6 py-4"><button onClick={() => toggleStatus(promo)} className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${promo.is_active ? isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-700" : isDark ? "bg-gray-600 text-gray-400" : "bg-gray-100 text-gray-600"}`}>{promo.is_active ? <><CheckCircle className="w-3 h-3" />Aktif</> : <><AlertCircle className="w-3 h-3" />Pasif</>}</button></td>
                                    <td className="px-6 py-4"><div className="flex justify-end gap-2"><Button variant="ghost" size="icon" className={`w-8 h-8 ${isDark ? "text-gray-400 hover:text-orange-400" : "text-gray-400 hover:text-orange-600"}`} onClick={() => { setViewingLogsPromo(promo); setIsLogsModalOpen(true); }}><History className="w-4 h-4" /></Button><Button variant="ghost" size="icon" className={`w-8 h-8 ${isDark ? "text-gray-400 hover:text-blue-400" : "text-gray-400 hover:text-blue-600"}`} onClick={() => { setEditingPromo(promo); setIsModalOpen(true); }}><Edit2 className="w-4 h-4" /></Button><Button variant="ghost" size="icon" className={`w-8 h-8 ${isDark ? "text-gray-400 hover:text-red-400" : "text-gray-400 hover:text-red-600"}`} onClick={() => handleDeletePromo(promo)}><Trash2 className="w-4 h-4" /></Button></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <PromoCodeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSavePromo} promoCode={editingPromo} />
            <PromoLogsModal isOpen={isLogsModalOpen} onClose={() => setIsLogsModalOpen(false)} promoId={viewingLogsPromo?.id || null} promoCode={viewingLogsPromo?.code || ""} />
        </>
    );
}

export default function AdminPromoCodes() {
    return <AdminGuard><AdminLayout><PromoCodesContent /></AdminLayout></AdminGuard>;
}
