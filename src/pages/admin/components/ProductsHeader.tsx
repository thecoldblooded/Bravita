import { Plus, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductsHeaderProps {
    isLoading: boolean;
    isSettingsOpen: boolean;
    onRefresh: () => void;
    onToggleSettings: () => void;
    onAddProduct: () => void;
}

export function ProductsHeader({
    isLoading,
    isSettingsOpen,
    onRefresh,
    onToggleSettings,
    onAddProduct
}: ProductsHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
                <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                    <span className="bg-orange-500 w-2 h-8 rounded-full" />
                    Ürün Yönetimi
                </h1>
                <p className="text-gray-500 mt-1">Mağazadaki tüm ürünleri yönetin ve stok takibi yapın.</p>
            </div>
            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="border-gray-200 hover:border-orange-200 hover:text-orange-600 transition-all group"
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
                    Yenile
                </Button>
                <Button
                    variant="outline"
                    onClick={onToggleSettings}
                    className={`border-gray-200 hover:border-orange-200 hover:text-orange-600 transition-all ${isSettingsOpen ? "bg-orange-50 border-orange-200 text-orange-600" : ""}`}
                >
                    <Settings className="w-4 h-4 mr-2" />
                    Site Ayarları
                </Button>
                <Button
                    onClick={onAddProduct}
                    className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 px-6"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Ürün Ekle
                </Button>
            </div>
        </div>
    );
}
