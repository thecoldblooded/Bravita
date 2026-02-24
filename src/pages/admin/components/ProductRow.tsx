import { m } from "framer-motion";
import { Package, Edit2, Trash2, CheckCircle, AlertCircle, X } from "lucide-react";
import { Product } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

interface ProductRowProps {
    product: Product;
    isDark: boolean;
    isHighlighted: boolean;
    editingStock: string | null;
    stockInput: string;
    textPrimary: string;
    textSecondary: string;
    rowHoverClass: string;
    dividerClass: string;
    onEditStock: (id: string, total: string) => void;
    onUpdateStock: (product: Product) => void;
    onCancelStockEdit: () => void;
    onSetStockInput: (val: string) => void;
    onToggleStatus: (product: Product) => void;
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
}

export function ProductRow({
    product,
    isDark,
    isHighlighted,
    editingStock,
    stockInput,
    textPrimary,
    textSecondary,
    rowHoverClass,
    dividerClass,
    onEditStock,
    onUpdateStock,
    onCancelStockEdit,
    onSetStockInput,
    onToggleStatus,
    onEdit,
    onDelete
}: ProductRowProps) {
    const { t } = useTranslation();
    return (
        <tr
            className={`transition-all relative ${rowHoverClass} ${isHighlighted
                ? isDark
                    ? "bg-orange-500/5 z-10"
                    : "bg-orange-50/50 z-10 shadow-sm"
                : ""
                }`}
        >
            <td className="px-6 py-4">
                {isHighlighted && (
                    <m.div
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
                                onChange={(e) => onSetStockInput(e.target.value)}
                                className={`h-8 text-sm ${isDark ? "bg-gray-600 border-gray-500 text-white" : ""}`}
                                type="number"
                                min={product.reserved_stock}
                                aria-label={t("admin.products.stock_input_label", "Toplam stok miktarı")}
                            />
                        </div>

                        <div className={`flex items-center justify-between text-[10px] px-1 ${textSecondary}`}>
                            <span>Rezerve: <span className="text-orange-600 font-bold">{product.reserved_stock}</span></span>
                            <span>Yeni Satılabilir: <span className="text-green-600 font-bold">{(parseInt(stockInput) || 0) - (product.reserved_stock || 0)}</span></span>
                        </div>

                        <div className="flex gap-2 mt-1">
                            <Button
                                size="sm"
                                className="h-7 flex-1 bg-green-500 hover:bg-green-600 text-[10px]"
                                onClick={() => onUpdateStock(product)}
                            >
                                Kaydet
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={onCancelStockEdit}
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1.5 w-full max-w-50">
                        <div className="flex items-center justify-between text-xs">
                            <span className={`font-medium ${textSecondary}`}>Toplam Depo:</span>
                            <span className={`font-bold ${textPrimary}`}>
                                {product.stock + (product.reserved_stock || 0)}
                            </span>
                        </div>
                        <div className={`h-px ${isDark ? "bg-gray-600" : "bg-gray-100"}`} />
                        <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded border flex-1 justify-center ${isDark ? "bg-green-500/20 border-green-500/30" : "bg-green-50 border-green-100"}`}>
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                <span className={`text-xs font-bold ${isDark ? "text-green-400" : "text-green-700"}`}>{product.stock}</span>
                                <span className={`text-[10px] uppercase tracking-tight ${isDark ? "text-green-400/80" : "text-green-600/80"}`}>Satılabilir</span>
                            </div>
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded border flex-1 justify-center
                            ${(product.reserved_stock || 0) > 0
                                    ? isDark ? "bg-orange-500/20 border-orange-500/30" : "bg-orange-50 border-orange-100"
                                    : isDark ? "bg-gray-700 border-gray-600 opacity-60" : "bg-gray-50 border-gray-100 opacity-60"
                                }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${(product.reserved_stock || 0) > 0 ? "bg-orange-500" : "bg-gray-400"}`} />
                                <span className={`text-xs font-bold ${(product.reserved_stock || 0) > 0 ? isDark ? "text-orange-400" : "text-orange-700" : isDark ? "text-gray-400" : "text-gray-600"}`}>
                                    {product.reserved_stock || 0}
                                </span>
                                <span className={`text-[10px] uppercase tracking-tight ${(product.reserved_stock || 0) > 0 ? isDark ? "text-orange-400/80" : "text-orange-600/80" : textSecondary}`}>
                                    Rezerve
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => onEditStock(product.id, (product.stock + (product.reserved_stock || 0)).toString())}
                            className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline text-center w-full mt-0.5 font-medium"
                        >
                            Hızlı Stok Düzenle
                        </button>
                    </div>
                )}
            </td>
            <td className="px-6 py-4">
                <button
                    onClick={() => onToggleStatus(product)}
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
                        onClick={() => onEdit(product)}
                        title="Düzenle"
                    >
                        <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`w-8 h-8 ${isDark ? "text-gray-400 hover:text-red-400 hover:bg-red-500/20" : "text-gray-400 hover:text-red-600 hover:bg-red-50"}`}
                        onClick={() => onDelete(product)}
                        title="Sil"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </td>
        </tr>
    );
}
