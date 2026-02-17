import React, { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { getProducts, updateProductStock, updateProduct, addProduct, deleteProduct, Product, getSiteSettings, updateSiteSettings, SiteSettings } from "@/lib/admin";
import { ProductGridSkeleton } from "@/components/admin/skeletons";
import { Package, Search, Edit2, Save, X, Plus, AlertCircle, CheckCircle, Trash2, RefreshCw, Settings, Truck, Percent, Coins, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
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
    const [searchParams, setSearchParams] = useSearchParams();
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const { theme } = useAdminTheme();
    const isDark = theme === "dark";

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Site Settings State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    const loadSettings = useCallback(async () => {
        try {
            const settings = await getSiteSettings();
            setSiteSettings(settings);
        } catch (error) {
            console.error("Failed to load settings:", error);
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const handleUpdateSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!siteSettings) return;

        setIsSavingSettings(true);
        try {
            await updateSiteSettings(siteSettings);
            toast.success("Ayarlar güncellendi");
            setIsSettingsOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Ayarlar güncellenemedi");
        } finally {
            setIsSavingSettings(false);
        }
    };

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
        const urlHighlight = searchParams.get("highlight") || searchParams.get("search");
        if (urlHighlight) {
            setHighlightedId(urlHighlight);
            setTimeout(() => setHighlightedId(null), 5000);
        }
        loadProducts();
    }, [loadProducts, searchParams]);

    useEffect(() => {
        const highlightIdFromUrl = searchParams.get("highlight") || searchParams.get("search");

        if (!search.trim() && !highlightIdFromUrl) {
            setFilteredProducts(products);
        } else {
            const query = search.toLowerCase();
            setFilteredProducts(products.filter(p => {
                const matchesSearch = p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query);
                const matchesHighlight = highlightIdFromUrl ? p.id === highlightIdFromUrl : false;

                if (highlightIdFromUrl && !search.trim()) return matchesHighlight;
                return matchesSearch;
            }));
        }
    }, [search, products, searchParams]);

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
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            className={isDark ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600" : ""}
                        >
                            <Settings className={`w-4 h-4 mr-2 ${isSettingsOpen ? "rotate-90" : ""} transition-transform`} />
                            Genel Ayarlar
                        </Button>
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

                <AnimatePresence>
                    {isSettingsOpen && siteSettings && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mb-6"
                        >
                            <div className={`p-6 rounded-2xl border shadow-sm ${cardClass}`}>
                                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${textPrimary}`}>
                                    <Settings className="w-5 h-5 text-orange-500" />
                                    Site Genel Ayarları
                                </h3>
                                <form onSubmit={handleUpdateSettings}>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                        <div className="space-y-2">
                                            <label htmlFor="settings-vat-rate" className={`text-sm font-semibold flex items-center gap-2 ${textSecondary}`}>
                                                <Percent className="w-4 h-4" />
                                                KDV Oranı (%)
                                            </label>
                                            <Input
                                                id="settings-vat-rate"
                                                type="number"
                                                step="0.01"
                                                value={siteSettings.vat_rate * 100}
                                                onChange={(e) => setSiteSettings({ ...siteSettings, vat_rate: parseFloat(e.target.value) / 100 })}
                                                className={inputClass}
                                                placeholder="20"
                                            />
                                            <p className="text-[10px] text-gray-400">Ürün fiyatlarına uygulanacak KDV oranı.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="settings-shipping-cost" className={`text-sm font-semibold flex items-center gap-2 ${textSecondary}`}>
                                                <Truck className="w-4 h-4" />
                                                Kargo Ücreti (₺)
                                            </label>
                                            <Input
                                                id="settings-shipping-cost"
                                                type="number"
                                                step="0.01"
                                                value={siteSettings.shipping_cost}
                                                onChange={(e) => setSiteSettings({ ...siteSettings, shipping_cost: parseFloat(e.target.value) })}
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
                                                value={siteSettings.free_shipping_threshold}
                                                onChange={(e) => setSiteSettings({ ...siteSettings, free_shipping_threshold: parseFloat(e.target.value) })}
                                                className={inputClass}
                                                placeholder="1500"
                                            />
                                            <p className="text-[10px] text-gray-400">Bu tutar ve üzeri alışverişlerde kargo ücretsiz olur.</p>
                                        </div>
                                    </div>

                                    {/* Bank Details section */}
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
                                                    value={siteSettings.bank_name}
                                                    onChange={(e) => setSiteSettings({ ...siteSettings, bank_name: e.target.value })}
                                                    className={inputClass}
                                                    placeholder="Örn: Ziraat Bankası"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label htmlFor="settings-iban" className={`text-sm font-semibold ${textSecondary}`}>IBAN</label>
                                                <Input
                                                    id="settings-iban"
                                                    value={siteSettings.bank_iban}
                                                    onChange={(e) => setSiteSettings({ ...siteSettings, bank_iban: e.target.value })}
                                                    className={inputClass}
                                                    placeholder="TR00..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label htmlFor="settings-account-holder" className={`text-sm font-semibold ${textSecondary}`}>Hesap Sahibi</label>
                                                <Input
                                                    id="settings-account-holder"
                                                    value={siteSettings.bank_account_holder}
                                                    onChange={(e) => setSiteSettings({ ...siteSettings, bank_account_holder: e.target.value })}
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
                                            onClick={() => {
                                                setIsSettingsOpen(false);
                                                loadSettings();
                                            }}
                                            className={isDark ? "text-gray-400 hover:text-white" : ""}
                                        >
                                            İptal
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isSavingSettings}
                                            className="bg-orange-500 hover:bg-orange-600 text-white min-w-32"
                                        >
                                            {isSavingSettings ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4 mr-2" />
                                            )}
                                            Ayarları Kaydet
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Search */}
                <div className="relative mb-6 flex gap-2">
                    <div className="relative flex-1">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-400"}`} />
                        <Input
                            placeholder="Ürün Ara..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                if (searchParams.get("highlight") || searchParams.get("search")) {
                                    const newParams = new URLSearchParams(searchParams);
                                    newParams.delete("highlight");
                                    newParams.delete("search");
                                    setSearchParams(newParams);
                                }
                            }}
                            className={`pl-10 ${inputClass}`}
                        />
                    </div>
                    {(search || searchParams.get("highlight") || searchParams.get("search")) && (
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setSearch("");
                                setSearchParams({});
                            }}
                            className={isDark ? "text-gray-400 hover:text-red-400" : "text-gray-500 hover:text-red-600"}
                        >
                            Temizle
                        </Button>
                    )}
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
                            {filteredProducts.map((product) => {
                                const isHighlighted = highlightedId === product.id;
                                return (
                                    <tr
                                        key={product.id}
                                        className={`transition-all relative ${rowHoverClass} ${isHighlighted
                                            ? isDark
                                                ? "bg-orange-500/5 z-10"
                                                : "bg-orange-50/50 z-10 shadow-sm"
                                            : ""
                                            }`}
                                    >
                                        <td className="px-6 py-4">
                                            {isHighlighted && (
                                                <motion.div
                                                    className="absolute inset-0 border-2 border-orange-500 z-20 pointer-events-none rounded-none"
                                                    initial={{ boxShadow: "0 0 0 0px rgba(249, 115, 22, 0.4)", borderColor: "rgba(249, 115, 22, 0.8)" }}
                                                    animate={{
                                                        boxShadow: [
                                                            "0 0 0 0px rgba(249, 115, 22, 0.4)",
                                                            "0 0 0 10px rgba(249, 115, 22, 0)"
                                                        ],
                                                        borderColor: [
                                                            "rgba(249, 115, 22, 0.8)",
                                                            "rgba(249, 115, 22, 0.2)"
                                                        ],
                                                    }}
                                                    transition={{
                                                        duration: 1.5,
                                                        repeat: Infinity,
                                                        ease: "easeOut",
                                                        repeatDelay: 0.1
                                                    }}
                                                    style={{ willChange: "box-shadow, border-color" }}
                                                />
                                            )}
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
                                );
                            })}
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
