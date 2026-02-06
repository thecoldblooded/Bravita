import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { getPromoCodes, addPromoCode, updatePromoCode, deletePromoCode, PromoCode } from "@/lib/admin";
import { TableSkeleton } from "@/components/admin/skeletons";
import { Search, Edit2, Trash2, Plus, Percent, Coins, CheckCircle, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PromoCodeModal } from "@/components/admin/PromoCodeModal";

export default function AdminPromoCodes() {
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [filteredPromoCodes, setFilteredPromoCodes] = useState<PromoCode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);

    useEffect(() => {
        loadPromoCodes();
    }, []);

    useEffect(() => {
        if (!search.trim()) {
            setFilteredPromoCodes(promoCodes);
        } else {
            const query = search.toLowerCase();
            setFilteredPromoCodes(promoCodes.filter(p =>
                p.code.toLowerCase().includes(query)
            ));
        }
    }, [search, promoCodes]);

    async function loadPromoCodes() {
        try {
            const data = await getPromoCodes();
            setPromoCodes(data);
            setFilteredPromoCodes(data);
        } catch (error) {
            console.error("Failed to load promo codes:", error);
            toast.error("Promosyon kodları yüklenemedi");
        } finally {
            setIsLoading(false);
        }
    }

    const openAddModal = () => {
        setEditingPromo(null);
        setIsModalOpen(true);
    };

    const openEditModal = (promo: PromoCode) => {
        setEditingPromo(promo);
        setIsModalOpen(true);
    };

    const handleSavePromo = async (promoData: Partial<PromoCode>) => {
        try {
            if (editingPromo) {
                await updatePromoCode(editingPromo.id, promoData);
                toast.success("Promosyon kodu güncellendi");
            } else {
                await addPromoCode(promoData as any);
                toast.success("Promosyon kodu eklendi");
            }
            await loadPromoCodes();
        } catch (error) {
            console.error(error);
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
            console.error(error);
            toast.error("Silinemedi");
        }
    };

    const toggleStatus = async (promo: PromoCode) => {
        try {
            await updatePromoCode(promo.id, { is_active: !promo.is_active });
            setPromoCodes(promoCodes.map(p =>
                p.id === promo.id ? { ...p, is_active: !promo.is_active } : p
            ));
            toast.success(promo.is_active ? "Kod pasife alındı" : "Kod aktif edildi");
        } catch (error) {
            toast.error("Durum güncellenemedi");
        }
    };

    if (isLoading) {
        return (
            <AdminGuard>
                <AdminLayout>
                    <div className="max-w-7xl mx-auto">
                        <TableSkeleton rows={5} columns={5} />
                    </div>
                </AdminLayout>
            </AdminGuard>
        );
    }

    return (
        <AdminGuard>
            <AdminLayout>
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Promosyon Kodları</h1>
                            <p className="text-gray-500">İndirim kuponlarını ve kampanyaları yönetin.</p>
                        </div>
                        <Button
                            onClick={openAddModal}
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Yeni Kod Ekle
                        </Button>
                    </div>

                    {/* Search */}
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Kod Ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 bg-white"
                        />
                    </div>

                    {/* Promo Codes Table */}
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-4">Kod</th>
                                    <th className="px-6 py-4">İndirim</th>
                                    <th className="px-6 py-4">Limitler</th>
                                    <th className="px-6 py-4">Kullanım</th>
                                    <th className="px-6 py-4">Durum</th>
                                    <th className="px-6 py-4 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredPromoCodes.map((promo) => (
                                    <tr key={promo.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center font-bold">
                                                    {promo.discount_type === 'percentage' ? <Percent className="w-5 h-5" /> : <Coins className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 font-mono tracking-wide">{promo.code}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {promo.discount_type === 'percentage' ? 'Yüzde İndirim' : 'Sabit Tutar'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-lg text-gray-900">
                                                {promo.discount_type === 'percentage' ? `%${promo.discount_value}` : `₺${promo.discount_value}`}
                                            </span>
                                            {promo.max_discount_amount && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Max: ₺{promo.max_discount_amount}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div>Min Sepet: {promo.min_order_amount ? `₺${promo.min_order_amount}` : '-'}</div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {promo.start_date ? new Date(promo.start_date).toLocaleDateString() : 'Başlangıç Yok'} - {promo.end_date ? new Date(promo.end_date).toLocaleDateString() : 'Süresiz'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {promo.usage_count} / {promo.usage_limit || '∞'}
                                                </span>
                                                {promo.usage_limit && (
                                                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-orange-500 rounded-full"
                                                            style={{ width: `${Math.min(100, (promo.usage_count / promo.usage_limit) * 100)}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleStatus(promo)}
                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${promo.is_active
                                                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                    }`}
                                            >
                                                {promo.is_active ? (
                                                    <>
                                                        <CheckCircle className="w-3 h-3" />
                                                        Aktif
                                                    </>
                                                ) : (
                                                    <>
                                                        <AlertCircle className="w-3 h-3" />
                                                        Pasif
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-8 h-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                    onClick={() => openEditModal(promo)}
                                                    title="Düzenle"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-8 h-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => handleDeletePromo(promo)}
                                                    title="Sil"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <PromoCodeModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSavePromo}
                    promoCode={editingPromo}
                />
            </AdminLayout>
        </AdminGuard>
    );
}
