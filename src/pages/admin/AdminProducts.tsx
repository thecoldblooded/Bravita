import React, { useEffect, useCallback, useReducer } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { getProducts, updateProductStock, updateProduct, addProduct, deleteProduct, Product, getSiteSettings, updateSiteSettings, SiteSettings } from "@/lib/admin";
import { ProductGridSkeleton } from "@/components/admin/skeletons";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { ProductModal } from "@/components/admin/ProductModal";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

// Decomposed Components
import { ProductsHeader } from "./components/ProductsHeader";
import { SiteSettingsSection } from "./components/SiteSettingsSection";
import { ProductsSearch } from "./components/ProductsSearch";
import { ProductsTable } from "./components/ProductsTable";

type ProductsState = {
    products: Product[];
    filteredProducts: Product[];
    isLoading: boolean;
    search: string;
    editingStock: string | null;
    stockInput: string;
    highlightedId: string | null;
    isModalOpen: boolean;
    editingProduct: Product | null;
    isSettingsOpen: boolean;
    siteSettings: SiteSettings | null;
    isSavingSettings: boolean;
};

type ProductsAction =
    | { type: 'SET_PRODUCTS'; payload: Product[] }
    | { type: 'SET_FILTERED_PRODUCTS'; payload: Product[] }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_SEARCH'; payload: string }
    | { type: 'SET_EDITING_STOCK'; payload: { id: string | null; input?: string } }
    | { type: 'SET_HIGH_ID'; payload: string | null }
    | { type: 'TOGGLE_MODAL'; payload: { open: boolean; product?: Product | null } }
    | { type: 'TOGGLE_SETTINGS'; payload: boolean }
    | { type: 'SET_SETTINGS'; payload: SiteSettings | null }
    | { type: 'SET_SAVING_SETTINGS'; payload: boolean };

const initialProductsState: ProductsState = {
    products: [],
    filteredProducts: [],
    isLoading: true,
    search: "",
    editingStock: null,
    stockInput: "",
    highlightedId: null,
    isModalOpen: false,
    editingProduct: null,
    isSettingsOpen: false,
    siteSettings: null,
    isSavingSettings: false,
};

function productsReducer(state: ProductsState, action: ProductsAction): ProductsState {
    switch (action.type) {
        case 'SET_PRODUCTS':
            return { ...state, products: action.payload };
        case 'SET_FILTERED_PRODUCTS':
            return { ...state, filteredProducts: action.payload };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_SEARCH':
            return { ...state, search: action.payload };
        case 'SET_EDITING_STOCK':
            return {
                ...state,
                editingStock: action.payload.id,
                stockInput: action.payload.input ?? state.stockInput
            };
        case 'SET_HIGH_ID':
            return { ...state, highlightedId: action.payload };
        case 'TOGGLE_MODAL':
            return {
                ...state,
                isModalOpen: action.payload.open,
                editingProduct: action.payload.product ?? null
            };
        case 'TOGGLE_SETTINGS':
            return { ...state, isSettingsOpen: action.payload };
        case 'SET_SETTINGS':
            return { ...state, siteSettings: action.payload };
        case 'SET_SAVING_SETTINGS':
            return { ...state, isSavingSettings: action.payload };
        default:
            return state;
    }
}

function ProductsContent() {
    const [state, dispatch] = React.useReducer(productsReducer, initialProductsState);
    const {
        products, filteredProducts, isLoading, search,
        editingStock, stockInput, highlightedId,
        isModalOpen, editingProduct, isSettingsOpen,
        siteSettings, isSavingSettings
    } = state;

    const [searchParams, setSearchParams] = useSearchParams();
    const { theme } = useAdminTheme();
    const isDark = theme === "dark";

    // Theme values
    const cardClass = isDark ? "bg-gray-800/40 border-gray-700/50" : "bg-white border-gray-200";
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
    const inputClass = isDark ? "bg-gray-900/50 border-gray-700 text-white focus:border-orange-500/50" : "bg-white border-gray-200 focus:border-orange-500/50";
    const dividerClass = isDark ? "divide-gray-700/50" : "divide-gray-100";
    const tableHeaderClass = isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-100";
    const rowHoverClass = isDark ? "hover:bg-gray-700/30" : "hover:bg-gray-50";

    const loadSettings = useCallback(async () => {
        try {
            const settings = await getSiteSettings();
            dispatch({ type: 'SET_SETTINGS', payload: settings });
        } catch {
            // Ignore settings load failures – default values will be used
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const handleUpdateSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!siteSettings) return;

        dispatch({ type: 'SET_SAVING_SETTINGS', payload: true });
        try {
            await updateSiteSettings(siteSettings);
            toast.success("Ayarlar güncellendi");
            dispatch({ type: 'TOGGLE_SETTINGS', payload: false });
        } catch {
            toast.error("Ayarlar güncellenemedi");
        } finally {
            dispatch({ type: 'SET_SAVING_SETTINGS', payload: false });
        }
    };

    const loadProducts = useCallback(async (manual = false) => {
        if (manual) dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const data = await getProducts();
            dispatch({ type: 'SET_PRODUCTS', payload: data });
            dispatch({ type: 'SET_FILTERED_PRODUCTS', payload: data });

            if (manual) {
                toast.success("Ürün listesi güncellendi");
            }
        } catch (error: unknown) {
            if (error instanceof Error && (error.name === 'AbortError' || error.message?.includes('AbortError'))) {
                setTimeout(() => loadProducts(manual), 1000);
                return;
            }
            toast.error("Ürünler yüklenemedi");
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, []);

    useEffect(() => {
        const urlHighlight = searchParams.get("highlight") || searchParams.get("search");
        if (urlHighlight) {
            dispatch({ type: 'SET_HIGH_ID', payload: urlHighlight });
            setTimeout(() => dispatch({ type: 'SET_HIGH_ID', payload: null }), 5000);
        }
        loadProducts();
    }, [loadProducts, searchParams]);

    useEffect(() => {
        const highlightIdFromUrl = searchParams.get("highlight") || searchParams.get("search");
        if (!search.trim() && !highlightIdFromUrl) {
            dispatch({ type: 'SET_FILTERED_PRODUCTS', payload: products });
        } else {
            const query = search.toLowerCase();
            dispatch({
                type: 'SET_FILTERED_PRODUCTS', payload: products.filter(p => {
                    const matchesSearch = p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query);
                    const matchesHighlight = highlightIdFromUrl ? p.id === highlightIdFromUrl : false;
                    if (highlightIdFromUrl && !search.trim()) return matchesHighlight;
                    return matchesSearch;
                })
            });
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

        const newAvailable = newTotal - reserved;
        try {
            await updateProductStock(product.id, newAvailable);
            dispatch({
                type: 'SET_PRODUCTS', payload: products.map(p =>
                    p.id === product.id ? { ...p, stock: newAvailable } : p
                )
            });
            dispatch({ type: 'SET_EDITING_STOCK', payload: { id: null } });
            toast.success("Stok güncellendi");
        } catch (error) {
            toast.error("Stok güncellenemedi");
        }
    };

    const toggleStatus = async (product: Product) => {
        try {
            await updateProduct(product.id, { is_active: !product.is_active });
            dispatch({
                type: 'SET_PRODUCTS', payload: products.map(p =>
                    p.id === product.id ? { ...p, is_active: !product.is_active } : p
                )
            });
            toast.success(product.is_active ? "Ürün pasife alındı" : "Ürün aktif edildi");
        } catch (error) {
            toast.error("Durum güncellenemedi");
        }
    };

    const handleSaveProduct = async (productData: Partial<Product>) => {
        try {
            if (editingProduct) {
                await updateProduct(editingProduct.id, productData);
                toast.success("Ürün güncellendi");
            } else {
                await addProduct(productData as Omit<Product, "id" | "created_at" | "updated_at" | "reserved_stock">);
                toast.success("Ürün eklendi");
            }
            await loadProducts();
        } catch (error) {
            toast.error("İşlem başarısız oldu");
            throw error;
        }
    };

    const handleDeleteProduct = async (product: Product) => {
        if (!confirm(`${product.name} ürününü silmek istediğinize emin misiniz?`)) return;
        try {
            await deleteProduct(product.id);
            toast.success("Ürün silindi");
            dispatch({ type: 'SET_PRODUCTS', payload: products.filter(p => p.id !== product.id) });
        } catch (error) {
            toast.error("Ürün silinemedi");
        }
    };

    if (isLoading && products.length === 0) {
        return <ProductGridSkeleton count={10} />;
    }

    return (
        <>
            <ProductsHeader
                isLoading={isLoading}
                isSettingsOpen={isSettingsOpen}
                onRefresh={() => loadProducts(true)}
                onToggleSettings={() => dispatch({ type: 'TOGGLE_SETTINGS', payload: !isSettingsOpen })}
                onAddProduct={() => dispatch({ type: 'TOGGLE_MODAL', payload: { open: true, product: null } })}
            />

            <SiteSettingsSection
                isOpen={isSettingsOpen}
                isDark={isDark}
                isSaving={isSavingSettings}
                settings={siteSettings}
                cardClass={cardClass}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                inputClass={inputClass}
                onUpdate={(s) => dispatch({ type: 'SET_SETTINGS', payload: s })}
                onSave={handleUpdateSettings}
                onCancel={() => {
                    dispatch({ type: 'TOGGLE_SETTINGS', payload: false });
                    loadSettings();
                }}
            />

            <ProductsSearch
                search={search}
                isDark={isDark}
                inputClass={inputClass}
                hasHighlight={!!(searchParams.get("highlight") || searchParams.get("search"))}
                onSearchChange={(val) => dispatch({ type: 'SET_SEARCH', payload: val })}
                onClearSearch={() => {
                    dispatch({ type: 'SET_SEARCH', payload: "" });
                    setSearchParams({});
                }}
            />

            <ProductsTable
                products={filteredProducts}
                isDark={isDark}
                isLoading={isLoading}
                editingStock={editingStock}
                stockInput={stockInput}
                highlightedId={highlightedId}
                cardClass={cardClass}
                tableHeaderClass={tableHeaderClass}
                dividerClass={dividerClass}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                rowHoverClass={rowHoverClass}
                onEditStock={(id, input) => dispatch({ type: 'SET_EDITING_STOCK', payload: { id, input } })}
                onUpdateStock={handleStockUpdate}
                onCancelStockEdit={() => dispatch({ type: 'SET_EDITING_STOCK', payload: { id: null } })}
                onSetStockInput={(val) => dispatch({ type: 'SET_EDITING_STOCK', payload: { id: editingStock, input: val } })}
                onToggleStatus={toggleStatus}
                onEdit={(p) => dispatch({ type: 'TOGGLE_MODAL', payload: { open: true, product: p } })}
                onDelete={handleDeleteProduct}
            />

            <ProductModal
                isOpen={isModalOpen}
                onClose={() => dispatch({ type: 'TOGGLE_MODAL', payload: { open: false } })}
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
