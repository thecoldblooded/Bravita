import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ProductsSearchProps {
    search: string;
    isDark: boolean;
    inputClass: string;
    hasHighlight: boolean;
    onSearchChange: (val: string) => void;
    onClearSearch: () => void;
}

export function ProductsSearch({
    search,
    isDark,
    inputClass,
    hasHighlight,
    onSearchChange,
    onClearSearch
}: ProductsSearchProps) {
    return (
        <div className="relative mb-6 flex gap-2">
            <div className="relative flex-1">
                <label htmlFor="product-search" className="sr-only">Ürün Ara</label>
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
                <Input
                    id="product-search"
                    placeholder="Ürün Ara..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className={`pl-10 ${inputClass}`}
                />
            </div>
            {(search || hasHighlight) && (
                <Button
                    variant="ghost"
                    onClick={onClearSearch}
                    className={isDark ? "text-gray-400 hover:text-red-400" : "text-gray-500 hover:text-red-600"}
                >
                    Temizle
                </Button>
            )}
        </div>
    );
}
