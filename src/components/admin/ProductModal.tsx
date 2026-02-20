import { useState, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Product } from "@/lib/admin";
import Loader from "@/components/ui/Loader";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (product: Partial<Product>) => Promise<void>;
    product?: Product | null;
}

export function ProductModal({ isOpen, onClose, onSave, product }: ProductModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { theme } = useAdminTheme();
    const isDark = theme === "dark";
    const [formData, setFormData] = useState<Partial<Product>>({
        name: "",
        slug: "",
        price: 0,
        original_price: undefined,
        stock: 0,
        max_quantity_per_order: 10,
        description: "",
        image_url: "",
        is_active: true,
    });

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name,
                slug: product.slug,
                price: product.price,
                original_price: product.original_price,
                stock: product.stock,
                max_quantity_per_order: product.max_quantity_per_order,
                description: product.description || "",
                image_url: product.image_url || "",
                is_active: product.is_active,
            });
        } else {
            setFormData({
                name: "",
                slug: "",
                price: 0,
                original_price: undefined,
                stock: 0,
                max_quantity_per_order: 10,
                description: "",
                image_url: "",
                is_active: true,
            });
        }
    }, [product, isOpen]);

    const handleChange = <K extends keyof Product>(field: K, value: Product[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNameChange = (name: string) => {
        // Auto-generate slug if adding new product or if slug matches old name slugified
        const slug = name.toLowerCase()
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');

        setFormData(prev => ({
            ...prev,
            name,
            slug: (!product) ? slug : prev.slug // Only auto-update slug for new products
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onSave(formData);
            onClose();
        } catch {
            // Error is handled upstream or ignored for non-critical failures
        } finally {
            setIsLoading(false);
        }
    };

    // Dark mode styles
    const modalBg = isDark ? "bg-gray-800" : "bg-white";
    const headerBg = isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100";
    const footerBg = isDark ? "bg-gray-700/50 border-gray-700" : "bg-gray-50 border-gray-100";
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
    const inputClass = isDark ? "bg-gray-700 border-gray-600 text-white" : "";
    const pricingBg = isDark ? "bg-orange-500/10 border-orange-500/30" : "bg-orange-50 border-orange-100";
    const closeButtonClass = isDark
        ? "bg-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-600"
        : "bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100";

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />
                    <m.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className={`${modalBg} rounded-2xl shadow-xl w-full max-w-2xl pointer-events-auto max-h-[90vh] overflow-y-auto`}>
                            <form onSubmit={handleSubmit}>
                                <div className={`p-6 border-b ${headerBg} flex items-center justify-between sticky top-0 z-10`}>
                                    <h2 className={`text-xl font-bold ${textPrimary}`}>
                                        {product ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center ${closeButtonClass}`}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Basic Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2 space-y-2">
                                            <Label htmlFor="name" className={textPrimary}>Ürün Adı *</Label>
                                            <Input
                                                id="name"
                                                value={formData.name}
                                                onChange={(e) => handleNameChange(e.target.value)}
                                                required
                                                placeholder="Örn: Bravita Multivitamin"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="slug" className={textPrimary}>URL Slug *</Label>
                                            <Input
                                                id="slug"
                                                value={formData.slug}
                                                onChange={(e) => handleChange("slug", e.target.value)}
                                                required
                                                placeholder="bravita-multivitamin"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="max_qty" className={textPrimary}>Maks. Sipariş Adedi</Label>
                                            <Input
                                                id="max_qty"
                                                type="number"
                                                value={formData.max_quantity_per_order}
                                                onChange={(e) => handleChange("max_quantity_per_order", parseInt(e.target.value))}
                                                required
                                                min={1}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>

                                    {/* Pricing & Stock */}
                                    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border ${pricingBg}`}>
                                        <div className="space-y-2">
                                            <Label htmlFor="price" className={textPrimary}>Satış Fiyatı (₺) *</Label>
                                            <Input
                                                id="price"
                                                type="number"
                                                value={formData.price}
                                                onChange={(e) => handleChange("price", parseFloat(e.target.value))}
                                                required
                                                min={0}
                                                step="0.01"
                                                className={isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white"}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="original_price" className={textPrimary}>Liste Fiyatı (₺)</Label>
                                            <div className="relative">
                                                <Input
                                                    id="original_price"
                                                    type="number"
                                                    value={formData.original_price || ""}
                                                    onChange={(e) => handleChange("original_price", e.target.value ? parseFloat(e.target.value) : undefined)}
                                                    min={0}
                                                    step="0.01"
                                                    placeholder="Opsiyonel"
                                                    className={isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white"}
                                                />
                                                {formData.original_price && formData.original_price > (formData.price || 0) && (
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-green-600">
                                                        %{Math.round(((formData.original_price - (formData.price || 0)) / formData.original_price) * 100)} İndirim
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-[10px] ${textSecondary}`}>İndirimli göstermek için doldurun.</p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="stock" className={textPrimary}>Stok Adedi *</Label>
                                            <Input
                                                id="stock"
                                                type="number"
                                                value={formData.stock}
                                                onChange={(e) => handleChange("stock", parseInt(e.target.value))}
                                                required
                                                min={0}
                                                className={isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white"}
                                            />
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="space-y-2">
                                        <Label htmlFor="description" className={textPrimary}>Açıklama</Label>
                                        <textarea
                                            id="description"
                                            value={formData.description}
                                            onChange={(e) => handleChange("description", e.target.value)}
                                            className={`flex min-h-20 w-full rounded-md border px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-background border-input"}`}
                                            placeholder="Ürün açıklaması..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="image_url" className={textPrimary}>Görsel URL</Label>
                                        <Input
                                            id="image_url"
                                            value={formData.image_url}
                                            onChange={(e) => handleChange("image_url", e.target.value)}
                                            placeholder="https://..."
                                            className={inputClass}
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="is_active"
                                            checked={formData.is_active}
                                            onChange={(e) => handleChange("is_active", e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                        />
                                        <Label htmlFor="is_active" className={`cursor-pointer ${textPrimary}`}>Ürün Satışa Açık (Aktif)</Label>
                                    </div>
                                </div>

                                <div className={`p-6 border-t ${footerBg} flex items-center justify-end gap-3 rounded-b-2xl`}>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={onClose}
                                        disabled={isLoading}
                                        className={isDark ? "text-gray-300 hover:bg-gray-700" : ""}
                                    >
                                        İptal
                                    </Button>
                                    <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white min-w-32" disabled={isLoading}>
                                        {isLoading ? <Loader size="1.25rem" noMargin /> : (
                                            <>
                                                <Save className="w-4 h-4 mr-2" />
                                                Kaydet
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </m.div>
                </>
            )}
        </AnimatePresence>
    );
}
