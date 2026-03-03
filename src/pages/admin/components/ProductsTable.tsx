import { Product } from "@/lib/admin";
import { ProductRow } from "./ProductRow";

interface ProductsTableProps {
    products: Product[];
    isDark: boolean;
    isLoading: boolean;
    editingStock: string | null;
    stockInput: string;
    highlightedId: string | null;
    cardClass: string;
    tableHeaderClass: string;
    dividerClass: string;
    textPrimary: string;
    textSecondary: string;
    rowHoverClass: string;
    onEditStock: (id: string, total: string) => void;
    onUpdateStock: (product: Product) => void;
    onCancelStockEdit: () => void;
    onSetStockInput: (val: string) => void;
    onToggleStatus: (product: Product) => void;
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
}

export function ProductsTable({
    products,
    isDark,
    isLoading,
    editingStock,
    stockInput,
    highlightedId,
    cardClass,
    tableHeaderClass,
    dividerClass,
    textPrimary,
    textSecondary,
    rowHoverClass,
    onEditStock,
    onUpdateStock,
    onCancelStockEdit,
    onSetStockInput,
    onToggleStatus,
    onEdit,
    onDelete
}: ProductsTableProps) {
    return (
        <div className={`rounded-2xl border overflow-hidden shadow-sm ${cardClass}`}>
            <div className="overflow-x-auto w-full custom-scrollbar">
                <table className="w-full min-w-200">
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
                        {products.map((product) => (
                            <ProductRow
                                key={product.id}
                                product={product}
                                isDark={isDark}
                                isHighlighted={highlightedId === product.id}
                                editingStock={editingStock}
                                stockInput={stockInput}
                                textPrimary={textPrimary}
                                textSecondary={textSecondary}
                                rowHoverClass={rowHoverClass}
                                dividerClass={dividerClass}
                                onEditStock={onEditStock}
                                onUpdateStock={onUpdateStock}
                                onCancelStockEdit={onCancelStockEdit}
                                onSetStockInput={onSetStockInput}
                                onToggleStatus={onToggleStatus}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {products.length === 0 && !isLoading && (
                <div className={`p-8 text-center ${textSecondary}`}>
                    Ürün bulunamadı.
                </div>
            )}
        </div>
    );
}
