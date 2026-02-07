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

export default function AdminProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [editingStock, setEditingStock] = useState<string | null>(null);
    const [stockInput, setStockInput] = useState<string>("");

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

    if (isLoading && products.length === 0) {
        return (
            <AdminGuard>
                <AdminLayout>
                    <div className="max-w-7xl mx-auto">
                        <ProductGridSkeleton count={6} />
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
                            <h1 className="text-2xl font-bold text-gray-900">Ürün Yönetimi</h1>
                            <p className="text-gray-500">Stok durumunu takip edin, fiyatları ve promosyonları yönetin.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => loadProducts(true)}
                                title="Listeyi Yenile"
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
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Ürün Ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 bg-white"
                        />
                    </div>

                    {/* Products Table */}
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-4">Ürün</th>
                                    <th className="px-6 py-4">Fiyat</th>
                                    <th className="px-6 py-4">Stok</th>
                                    <th className="px-6 py-4">Durum</th>
                                    <th className="px-6 py-4 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                                                    {product.image_url ? (
                                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Package className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{product.name}</p>
                                                    <p className="text-xs text-gray-500 font-mono line-clamp-1 max-w-48">{product.slug}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-gray-900 font-medium">₺{product.price}</span>
                                                {product.original_price && product.original_price > product.price && (
                                                    <span className="text-xs text-gray-400 line-through">₺{product.original_price}</span>
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
                                                <div className="flex flex-col gap-2 w-full max-w-50 bg-white p-2 rounded-lg border border-orange-100 shadow-sm z-10 relative">
                                                    <span className="text-[10px] text-gray-400 font-medium uppercase">Toplam Stok Girin</span>
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            value={stockInput}
                                                            onChange={(e) => setStockInput(e.target.value)}
                                                            className="h-8 text-sm"
                                                            type="number"
                                                            min={product.reserved_stock}
                                                            autoFocus
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between text-[10px] text-gray-500 px-1">
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
                                                        <span className="text-gray-500 font-medium">Toplam Depo:</span>
                                                        <span className="font-bold text-gray-900">
                                                            {product.stock + (product.reserved_stock || 0)}
                                                        </span>
                                                    </div>

                                                    <div className="h-px bg-gray-100" />

                                                    {/* Row: Available & Reserved */}
                                                    <div className="flex items-center gap-2">
                                                        {/* Available */}
                                                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded bg-green-50 border border-green-100 flex-1 justify-center`}>
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                            <span className="text-xs font-bold text-green-700">{product.stock}</span>
                                                            <span className="text-[10px] text-green-600/80 uppercase tracking-tight">Satılabilir</span>
                                                        </div>

                                                        {/* Reserved */}
                                                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded border flex-1 justify-center
                                                            ${product.reserved_stock > 0
                                                                ? "bg-orange-50 border-orange-100"
                                                                : "bg-gray-50 border-gray-100 opacity-60"
                                                            }`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${product.reserved_stock > 0 ? "bg-orange-500" : "bg-gray-400"}`} />
                                                            <span className={`text-xs font-bold ${product.reserved_stock > 0 ? "text-orange-700" : "text-gray-600"}`}>
                                                                {product.reserved_stock || 0}
                                                            </span>
                                                            <span className={`text-[10px] uppercase tracking-tight ${product.reserved_stock > 0 ? "text-orange-600/80" : "text-gray-500"}`}>
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
                                                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
                                                    className="w-8 h-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                    onClick={() => openEditModal(product)}
                                                    title="Düzenle"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-8 h-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
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
                            <div className="p-8 text-center text-gray-500">
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
            </AdminLayout>
        </AdminGuard>
    );
}
