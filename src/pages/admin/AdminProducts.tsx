import React, { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { getProducts, updateProductStock, updateProduct, addProduct, deleteProduct, Product } from "@/lib/admin";
import { ProductGridSkeleton } from "@/components/admin/skeletons";
import { Package, Search, Edit2, Save, X, Plus, AlertCircle, CheckCircle, Trash2, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ProductModal } from "@/components/admin/ProductModal";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

function ProductsContent() {
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [editingStock, setEditingStock] = useState<string | null>(null);
    const [stockInput, setStockInput] = useState<string>("");
    const { theme } = useAdminTheme();
    const isDark = theme === "dark";

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const loadProducts = useCallback(async (manual = false) => {
        if (manual) setIsLoading(true);
        try {
            // Minimum loading time for visual feedback
            const minLoadTime = manual ? 800 : 0;
            const start = Date.now();

            const data = await getProducts();

            const elapsed = Date.now() - start;
            if (manual && elapsed < minLoadTime) {
                await new Promise(resolve => setTimeout(resolve, minLoadTime - elapsed));
            }

            setProducts(data);
            setFilteredProducts(data);

            if (manual) {
                toast.success("Ürün listesi güncellendi");
            }
        } catch (error: unknown) {
            if (error instanceof Error && (error.name === 'AbortError' || error.message?.includes('AbortError'))) {
                console.warn("Product fetch aborted. Retrying...");
                setTimeout(() => loadProducts(manual), 1000);
                return;
            }
            console.error("Failed to load products:", error);
            toast.error("Ürünler yüklenemedi");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    useEffect(() => {
        if (!search.trim()) {
            setFilteredProducts(products);
        } else {
            const query = search.toLowerCase();
            setFilteredProducts(products.filter(p =>
                p.name.toLowerCase().includes(query)
            ));
        }
    }, [search, products]);

    const handleStockUpdate = async (product: Product) => {
        const newTotal = parseInt(stockInput);
        if (isNaN(newTotal) || newTotal < 0) {
            toast.error("Geçersiz stok miktarı");
            return;
        }

        const reserved = product.reserved_stock || 0;
        if (newTotal < reserved) {
            toast.error(`Stok miktarı rezerve edilen miktardan (${reserved}) az olamaz.`);
            return;
        }

        // Available = Total - Reserved
        const newAvailable = newTotal - reserved;

        try {
            await updateProductStock(product.id, newAvailable);

            // Optimistic update
            setProducts(products.map(p =>
                p.id === product.id ? { ...p, stock: newAvailable } : p
            ));

            setEditingStock(null);
            toast.success("Stok güncellendi");
        } catch (error) {
            console.error("Failed to update stock:", error);
            toast.error("Stok güncellenemedi");
        }
    };

    const toggleStatus = async (product: Product) => {
        try {
            await updateProduct(product.id, { is_active: !product.is_active });
            setProducts(products.map(p =>
                p.id === product.id ? { ...p, is_active: !product.is_active } : p
            ));
            toast.success(product.is_active ? "Ürün pasife alındı" : "Ürün aktif edildi");
        } catch (error) {
            toast.error("Durum güncellenemedi");
        }
    };

    const handleSaveProduct = async (productData: Partial<Product>) => {
        try {
            if (editingProduct) {
                // Update
                await updateProduct(editingProduct.id, productData);
                toast.success("Ürün güncellendi");
            } else {
                // Add
                await addProduct(productData as Omit<Product, "id" | "created_at" | "updated_at" | "reserved_stock">);
                toast.success("Ürün eklendi");
            }
            await loadProducts(); // Reload to get fresh data
        } catch (error) {
            console.error(error);
            toast.error("İşlem başarısız oldu");
            throw error; // Re-throw to let modal handle loading state if needed
        }
    };

    const handleDeleteProduct = async (product: Product) => {
        if (!confirm(`${product.name} ürününü silmek istediğinize emin misiniz?`)) return;

        try {
            await deleteProduct(product.id);
            toast.success("Ürün silindi");
            // Optimistic remove
            setProducts(products.filter(p => p.id !== product.id));
        } catch (error) {
            console.error(error);
            toast.error("Ürün silinemedi (Siparişlerde kullanılıyor olabilir). Pasife almayı deneyin.");
        }
    };

    const openAddModal = () => {
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    // Dark mode styles
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
    const cardClass = isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100";
    const inputClass = isDark ? "bg-gray-700 border-gray-600 text-white placeholder:text-gray-400" : "bg-white";
    const tableHeaderClass = isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-100";
    const rowHoverClass = isDark ? "hover:bg-gray-700" : "hover:bg-gray-50";
    const dividerClass = isDark ? "divide-gray-700" : "divide-gray-100";

    if (isLoading && products.length === 0) {
        return (
            <div className="max-w-7xl mx-auto">
                <ProductGridSkeleton count={6} />
            </div>
        );
    }

    return (
        <>
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className={`text-2xl font-bold ${textPrimary}`}>Ürün Yönetimi</h1>
                        <p className={textSecondary}>Stok durumunu takip edin, fiyatları ve promosyonları yönetin.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => loadProducts(true)}
                            title="Listeyi Yenile"
                            className={isDark ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600" : ""}
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        </Button>
                        <Button
                            onClick={openAddModal}
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Yeni Ürün Ekle
                        </Button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-400"}`} />
                    <Input
                        placeholder="Ürün Ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={`pl-10 ${inputClass}`}
                    />
                </div>

                {/* Products Table */}
                <div className={`rounded-2xl border overflow-hidden shadow-sm ${cardClass}`}>
                    <table className="w-full">
                        <thead className={`border-b ${tableHeaderClass}`}>
                            <tr className={`text-left text-xs font-semibold uppercase tracking-wider ${textSecondary}`}>
                                <th className="px-6 py-4">Ürün</th>
                                <th className="px-6 py-4">Fiyat</th>
                                <th className="px-6 py-4">Stok</th>
                                <th className="px-6 py-4">Durum</th>
                                <th className="px-6 py-4 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${dividerClass}`}>
                            {filteredProducts.map((product) => (
                                <tr key={product.id} className={`transition-colors ${rowHoverClass}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                                                {product.image_url ? (
                                                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Package className={`w-5 h-5 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                                                )}
                                            </div>
                                            <div>
                                                <p className={`font-medium ${textPrimary}`}>{product.name}</p>
                                                <p className={`text-xs font-mono line-clamp-1 max-w-48 ${textSecondary}`}>{product.slug}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className={`font-medium ${textPrimary}`}>₺{product.price}</span>
                                            {product.original_price && product.original_price > product.price && (
                                                <span className={`text-xs line-through ${isDark ? "text-gray-500" : "text-gray-400"}`}>₺{product.original_price}</span>
                                            )}
                                            {product.original_price && product.original_price > product.price && (
                                                <span className="text-[10px] text-green-600 font-bold">
                                                    %{Math.round(((product.original_price - product.price) / product.original_price) * 100)} İndirim
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingStock === product.id ? (
                                            <div className={`flex flex-col gap-2 w-full max-w-50 p-2 rounded-lg border shadow-sm z-10 relative ${isDark ? "bg-gray-700 border-orange-500/30" : "bg-white border-orange-100"}`}>
                                                <span className={`text-[10px] font-medium uppercase ${textSecondary}`}>Toplam Stok Girin</span>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        value={stockInput}
                                                        onChange={(e) => setStockInput(e.target.value)}
                                                        className={`h-8 text-sm ${isDark ? "bg-gray-600 border-gray-500 text-white" : ""}`}
                                                        type="number"
                                                        min={product.reserved_stock}
                                                        autoFocus
                                                    />
                                                </div>

                                                <div className={`flex items-center justify-between text-[10px] px-1 ${textSecondary}`}>
                                                    <span>Rezerve: <span className="text-orange-600 font-bold">{product.reserved_stock}</span></span>
                                                    <span>Yeni Satılabilir: <span className="text-green-600 font-bold">{(parseInt(stockInput) || 0) - product.reserved_stock}</span></span>
                                                </div>

                                                <div className="flex gap-2 mt-1">
                                                    <Button
                                                        size="sm"
                                                        className="h-7 flex-1 bg-green-500 hover:bg-green-600 text-[10px]"
                                                        onClick={() => handleStockUpdate(product)}
                                                    >
                                                        Kaydet
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0"
                                                        onClick={() => setEditingStock(null)}
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-1.5 w-full max-w-50">
                                                {/* Total Physical Stock */}
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className={`font-medium ${textSecondary}`}>Toplam Depo:</span>
                                                    <span className={`font-bold ${textPrimary}`}>
                                                        {product.stock + (product.reserved_stock || 0)}
                                                    </span>
                                                </div>

                                                <div className={`h-px ${isDark ? "bg-gray-600" : "bg-gray-100"}`} />

                                                {/* Row: Available & Reserved */}
                                                <div className="flex items-center gap-2">
                                                    {/* Available */}
                                                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded border flex-1 justify-center ${isDark ? "bg-green-500/20 border-green-500/30" : "bg-green-50 border-green-100"}`}>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                        <span className={`text-xs font-bold ${isDark ? "text-green-400" : "text-green-700"}`}>{product.stock}</span>
                                                        <span className={`text-[10px] uppercase tracking-tight ${isDark ? "text-green-400/80" : "text-green-600/80"}`}>Satılabilir</span>
                                                    </div>

                                                    {/* Reserved */}
                                                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded border flex-1 justify-center
                                                        ${product.reserved_stock > 0
                                                            ? isDark ? "bg-orange-500/20 border-orange-500/30" : "bg-orange-50 border-orange-100"
                                                            : isDark ? "bg-gray-700 border-gray-600 opacity-60" : "bg-gray-50 border-gray-100 opacity-60"
                                                        }`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${product.reserved_stock > 0 ? "bg-orange-500" : "bg-gray-400"}`} />
                                                        <span className={`text-xs font-bold ${product.reserved_stock > 0 ? isDark ? "text-orange-400" : "text-orange-700" : isDark ? "text-gray-400" : "text-gray-600"}`}>
                                                            {product.reserved_stock || 0}
                                                        </span>
                                                        <span className={`text-[10px] uppercase tracking-tight ${product.reserved_stock > 0 ? isDark ? "text-orange-400/80" : "text-orange-600/80" : textSecondary}`}>
                                                            Rezerve
                                                        </span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        const total = product.stock + (product.reserved_stock || 0);
                                                        setEditingStock(product.id);
                                                        setStockInput(total.toString());
                                                    }}
                                                    className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline text-center w-full mt-0.5"
                                                >
                                                    Hızlı Stok Düzenle
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggleStatus(product)}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${product.is_active
                                                ? isDark ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                                : isDark ? "bg-gray-600 text-gray-400 hover:bg-gray-500" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                }`}
                                        >
                                            {product.is_active ? (
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
                                                className={`w-8 h-8 ${isDark ? "text-gray-400 hover:text-blue-400 hover:bg-blue-500/20" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"}`}
                                                onClick={() => openEditModal(product)}
                                                title="Düzenle"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={`w-8 h-8 ${isDark ? "text-gray-400 hover:text-red-400 hover:bg-red-500/20" : "text-gray-400 hover:text-red-600 hover:bg-red-50"}`}
                                                onClick={() => handleDeleteProduct(product)}
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

                    {filteredProducts.length === 0 && (
                        <div className={`p-8 text-center ${textSecondary}`}>
                            Ürün bulunamadı.
                        </div>
                    )}
                </div>
            </div>

            <ProductModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveProduct}
                product={editingProduct}
            />
        </>
    );
}

export default function AdminProducts() {
    return (
        <AdminGuard>
            <AdminLayout>
                <ProductsContent />
            </AdminLayout>
        </AdminGuard>
    );
}
