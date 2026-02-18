
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { ArrowLeft, Search, RefreshCcw, Eye, Clock, User, ArrowRight, Activity, LogIn, Database, Trash2, Edit3, PlusCircle, ShieldCheck, XCircle, AlertTriangle, LucideIcon, Filter, X, ArrowUpDown, ChevronDown, CalendarDays, ArrowRightLeft, Package, Tag, BadgeCheck, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminTheme } from "@/contexts/AdminThemeContext";
import { getAuditLogs, AuditLogEntry } from "@/lib/admin";
import Loader from "@/components/ui/Loader";
import { toast } from "sonner";
import { m, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Action/Table Translations
const ACTION_MAP: Record<string, { label: string; color: string; icon: LucideIcon }> = {
    "LOGIN": { label: "Sisteme Giriş", color: "bg-blue-100 text-blue-700 border-blue-200", icon: LogIn },
    "CREATE": { label: "Oluşturma", color: "bg-green-100 text-green-700 border-green-200", icon: PlusCircle },
    "INSERT": { label: "Ekleme", color: "bg-green-100 text-green-700 border-green-200", icon: PlusCircle },
    "ADD": { label: "Ekleme", color: "bg-green-100 text-green-700 border-green-200", icon: PlusCircle },
    "APPROVE": { label: "Onaylama", color: "bg-green-100 text-green-700 border-green-200", icon: ShieldCheck },
    "UPDATE": { label: "Güncelleme", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Edit3 },
    "EDIT": { label: "Düzenleme", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Edit3 },
    "STATUS": { label: "Durum Değişikliği", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Activity },
    "DELETE": { label: "Silme", color: "bg-red-100 text-red-700 border-red-200", icon: Trash2 },
    "REMOVE": { label: "Kaldırma", color: "bg-red-100 text-red-700 border-red-200", icon: Trash2 },
    "REJECT": { label: "Reddetme", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
    "CANCEL": { label: "İptal Etme", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
    // Triggers
    "update_order_status": { label: "Sipariş Durumu", color: "bg-orange-100 text-orange-700 border-orange-200", icon: Activity },
};

const TABLE_MAP: Record<string, string> = {
    "orders": "Siparişler",
    "products": "Ürünler",
    "profiles": "Kullanıcılar",
    "users": "Kullanıcılar",
    "auth": "Sistem Girişi",
    "promo_codes": "Promosyon Kodları",
    "categories": "Kategoriler",
};

const getActionInfo = (action: string) => {
    // Try distinct match first
    if (ACTION_MAP[action]) return ACTION_MAP[action];

    // Try substring matching
    const upper = action.toUpperCase();
    if (upper.includes("LOGIN") || upper.includes("AUTH")) return ACTION_MAP["LOGIN"];
    if (upper.includes("CREATE") || upper.includes("INSERT") || upper.includes("ADD")) return ACTION_MAP["CREATE"];
    if (upper.includes("APPROVE")) return ACTION_MAP["APPROVE"];
    if (upper.includes("UPDATE") || upper.includes("EDIT")) return ACTION_MAP["UPDATE"];
    if (upper.includes("STATUS")) return ACTION_MAP["STATUS"];
    if (upper.includes("DELETE") || upper.includes("REMOVE") || upper.includes("REJECT") || upper.includes("CANCEL")) return ACTION_MAP["DELETE"];

    return { label: action, color: "bg-gray-100 text-gray-700 border-gray-200", icon: Activity };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DiffViewer = ({ oldData, newData, isDark }: { oldData: any; newData: any; isDark: boolean }) => {
    if (!newData && !oldData) return null;

    const allKeys = Array.from(new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]));
    const changes = allKeys.filter(key => {
        const oldVal = oldData?.[key];
        const newVal = newData?.[key];
        // Skip metadata keys
        if (["id", "created_at", "updated_at", "user_id", "admin_user_id"].includes(key)) return false;
        return JSON.stringify(oldVal) !== JSON.stringify(newVal);
    });

    if (changes.length === 0) {
        return (
            <div className={`p-4 rounded-xl border border-dashed text-center ${isDark ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-400"}`}>
                Belirgin bir alan değişikliği saptanmadı.
            </div>
        );
    }

    const getFieldIcon = (key: string) => {
        if (key.includes("price")) return <Tag className="w-4 h-4" />;
        if (key.includes("stock")) return <Package className="w-4 h-4" />;
        if (key.includes("is_active") || key.includes("status")) return <BadgeCheck className="w-4 h-4" />;
        return <Edit3 className="w-4 h-4" />;
    };

    const getFieldName = (key: string) => {
        const names: Record<string, string> = {
            name: "Ürün Adı",
            description: "Açıklama",
            price: "Fiyat",
            original_price: "Eski Fiyat",
            stock: "Stok",
            is_active: "Aktiflik",
            image_url: "Görsel",
            slug: "URL Yapısı",
            status: "Sipariş Durumu",
            payment_status: "Ödeme Durumu",
            tracking_number: "Takip No",
            shipping_company: "Kargo Firması"
        };
        return names[key] || key;
    };

    return (
        <div className="space-y-3">
            {changes.map(key => {
                const oldVal = oldData?.[key];
                const newVal = newData?.[key];

                return (
                    <div key={key} className={`flex flex-col gap-2 p-3 rounded-xl border ${isDark ? "bg-gray-800/30 border-gray-700" : "bg-white border-gray-100 shadow-sm"}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
                                    {getFieldIcon(key)}
                                </span>
                                <span className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                                    {getFieldName(key).toUpperCase()}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-[1fr,24px,1fr] items-center gap-3">
                            <div className={`p-2 rounded-lg text-xs font-mono break-all ${isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600 border border-red-100"}`}>
                                {oldVal === null || oldVal === undefined ? "(Yok)" : String(oldVal)}
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                            <div className={`p-2 rounded-lg text-xs font-mono break-all ${isDark ? "bg-green-500/10 text-green-400" : "bg-green-50 text-green-600 border border-green-100"}`}>
                                {newVal === null || newVal === undefined ? "(Silindi)" : String(newVal)}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

function LogsContent() {
    const navigate = useNavigate();
    const { isSuperAdmin } = useAuth();
    const { theme } = useAdminTheme();
    const isDark = theme === "dark";

    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(0);
    const pageRef = useRef(0);
    const [hasMore, setHasMore] = useState(true);
    const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
    const [search, setSearch] = useState("");

    // Filters
    const [actionFilter, setActionFilter] = useState<string>("all");
    const [tableFilter, setTableFilter] = useState<string>("all");
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");
    const [sortField, setSortField] = useState<"created_at" | "action" | "target_table">("created_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [showFilters, setShowFilters] = useState(false);

    const LIMIT = 50;

    const loadLogs = useCallback(async (reset = false) => {
        try {
            const currentPage = reset ? 0 : pageRef.current;
            const offset = reset ? 0 : currentPage * LIMIT;
            const newLogs = await getAuditLogs(LIMIT, offset);

            if (reset) {
                setLogs(newLogs);
                setPage(1);
                pageRef.current = 1;
            } else {
                setLogs(prev => [...prev, ...newLogs]);
                setPage(prev => prev + 1);
                pageRef.current += 1;
            }

            if (newLogs.length < LIMIT) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }
        } catch (error) {
            toast.error("Loglar yüklenirken hata oluştu.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isSuperAdmin) {
            toast.error("Bu sayfaya erişim yetkiniz yok.");
            navigate("/admin");
            return;
        }
        loadLogs(true);
    }, [isSuperAdmin, navigate, loadLogs]);


    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
    };

    // Derive unique action types and tables from loaded logs
    const uniqueActions = useMemo(() => {
        const actions = new Set<string>();
        logs.forEach(log => {
            const info = getActionInfo(log.action);
            actions.add(info.label);
        });
        return Array.from(actions).sort();
    }, [logs]);

    const uniqueTables = useMemo(() => {
        const tables = new Set<string>();
        logs.forEach(log => {
            if (log.target_table) {
                tables.add(log.target_table);
            }
        });
        return Array.from(tables).sort();
    }, [logs]);

    const activeFilterCount = [actionFilter !== "all", tableFilter !== "all", dateFrom, dateTo].filter(Boolean).length;

    const clearAllFilters = () => {
        setActionFilter("all");
        setTableFilter("all");
        setDateFrom("");
        setDateTo("");
        setSearch("");
    };

    const toggleSort = (field: "created_at" | "action" | "target_table") => {
        if (sortField === field) {
            setSortOrder(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortOrder(field === "created_at" ? "desc" : "asc");
        }
    };

    const filteredLogs = useMemo(() => {
        const result = logs.filter(log => {
            // Text search
            const matchesSearch = !search ||
                log.action.toLowerCase().includes(search.toLowerCase()) ||
                log.admin_name?.toLowerCase().includes(search.toLowerCase()) ||
                log.target_table?.toLowerCase().includes(search.toLowerCase());

            // Action filter
            const matchesAction = actionFilter === "all" || getActionInfo(log.action).label === actionFilter;

            // Table filter
            const matchesTable = tableFilter === "all" || log.target_table === tableFilter;

            // Date range
            const logDate = new Date(log.created_at);
            const matchesDateFrom = !dateFrom || logDate >= new Date(dateFrom);
            const matchesDateTo = !dateTo || logDate <= new Date(dateTo + "T23:59:59");

            return matchesSearch && matchesAction && matchesTable && matchesDateFrom && matchesDateTo;
        });

        // Sort
        result.sort((a, b) => {
            let valA: string | number, valB: string | number;
            if (sortField === "created_at") {
                valA = new Date(a.created_at).getTime();
                valB = new Date(b.created_at).getTime();
            } else if (sortField === "action") {
                valA = getActionInfo(a.action).label;
                valB = getActionInfo(b.action).label;
            } else {
                valA = a.target_table || "";
                valB = b.target_table || "";
            }
            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

        return result;
    }, [logs, search, actionFilter, tableFilter, dateFrom, dateTo, sortField, sortOrder]);

    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return "Az önce";
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dakika önce`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} gün önce`;
        return date.toLocaleDateString("tr-TR");
    };

    const formatFullDate = (dateString: string) => {
        return new Date(dateString).toLocaleString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <div className={`min-h-screen p-8 transition-colors duration-300 ${isDark ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"}`}>
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/admin")}
                            className={isDark ? "text-gray-400 hover:text-white hover:bg-gray-800" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className={`text-2xl font-bold flex items-center gap-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                                <ShieldCheck className="w-8 h-8 text-orange-500" />
                                Sistem Denetim Logları
                            </h1>
                            <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                Admin panelindeki tüm işlemlerin detaylı kaydı
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => { setIsLoading(true); loadLogs(true); }}
                        className={isDark ? "bg-gray-800 hover:bg-gray-700 text-white border border-gray-700" : "bg-white border border-gray-200 hover:bg-gray-50 text-gray-700"}
                    >
                        <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                        Yenile
                    </Button>
                </div>

                {/* Filters */}
                <div className={`p-4 rounded-xl border mb-6 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"}`}>
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="İşlem tipi, admin adı veya tablo adı ile arama yapın..."
                                value={search}
                                onChange={handleSearch}
                                className={`pl-10 h-11 ${isDark ? "bg-gray-900 border-gray-700 text-white placeholder:text-gray-500" : "bg-white border-gray-200"}`}
                            />
                        </div>
                        <Button
                            variant={showFilters ? "default" : "outline"}
                            onClick={() => setShowFilters(!showFilters)}
                            className={`h-11 gap-2 ${showFilters ? "bg-orange-500 hover:bg-orange-600 text-white" : isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : ""}`}
                        >
                            <Filter className="w-4 h-4" />
                            Filtrele
                            {activeFilterCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-orange-600">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>
                    </div>

                    {/* Expandable Filter Panel */}
                    <AnimatePresence>
                        {showFilters && (
                            <m.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t ${isDark ? "border-gray-700" : "border-gray-100"}`}>
                                    {/* Action Type */}
                                    <div>
                                        <label className={`text-xs font-medium mb-1.5 block ${isDark ? "text-gray-400" : "text-gray-500"}`}>İşlem Tipi</label>
                                        <Select value={actionFilter} onValueChange={setActionFilter}>
                                            <SelectTrigger className={`h-10 ${isDark ? "bg-gray-900 border-gray-700 text-white" : "bg-white"}`}>
                                                <SelectValue placeholder="Tümü" />
                                            </SelectTrigger>
                                            <SelectContent className={isDark ? "bg-gray-900 border-gray-700 text-white" : ""}>
                                                <SelectItem value="all" className={isDark ? "focus:bg-gray-800 focus:text-white" : ""}>Tümü</SelectItem>
                                                {uniqueActions.map(action => (
                                                    <SelectItem key={action} value={action} className={isDark ? "focus:bg-gray-800 focus:text-white" : ""}>{action}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Target Table */}
                                    <div>
                                        <label className={`text-xs font-medium mb-1.5 block ${isDark ? "text-gray-400" : "text-gray-500"}`}>Hedef Tablo</label>
                                        <Select value={tableFilter} onValueChange={setTableFilter}>
                                            <SelectTrigger className={`h-10 ${isDark ? "bg-gray-900 border-gray-700 text-white" : "bg-white"}`}>
                                                <SelectValue placeholder="Tümü" />
                                            </SelectTrigger>
                                            <SelectContent className={isDark ? "bg-gray-900 border-gray-700 text-white" : ""}>
                                                <SelectItem value="all" className={isDark ? "focus:bg-gray-800 focus:text-white" : ""}>Tümü</SelectItem>
                                                {uniqueTables.map(table => (
                                                    <SelectItem key={table} value={table} className={isDark ? "focus:bg-gray-800 focus:text-white" : ""}>{TABLE_MAP[table] || table}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Date From */}
                                    <div>
                                        <label className={`text-xs font-medium mb-1.5 block ${isDark ? "text-gray-400" : "text-gray-500"}`}>Başlangıç Tarihi</label>
                                        <Input
                                            type="date"
                                            value={dateFrom}
                                            onChange={e => setDateFrom(e.target.value)}
                                            className={`h-10 ${isDark ? "bg-gray-900 border-gray-700 text-white" : "bg-white"}`}
                                        />
                                    </div>

                                    {/* Date To */}
                                    <div>
                                        <label className={`text-xs font-medium mb-1.5 block ${isDark ? "text-gray-400" : "text-gray-500"}`}>Bitiş Tarihi</label>
                                        <Input
                                            type="date"
                                            value={dateTo}
                                            onChange={e => setDateTo(e.target.value)}
                                            className={`h-10 ${isDark ? "bg-gray-900 border-gray-700 text-white" : "bg-white"}`}
                                        />
                                    </div>
                                </div>

                                {activeFilterCount > 0 && (
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-dashed" style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {actionFilter !== "all" && (
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isDark ? "bg-gray-700 text-gray-200" : "bg-orange-50 text-orange-700 border border-orange-200"}`}>
                                                    İşlem: {actionFilter}
                                                    <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setActionFilter("all")} />
                                                </span>
                                            )}
                                            {tableFilter !== "all" && (
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isDark ? "bg-gray-700 text-gray-200" : "bg-orange-50 text-orange-700 border border-orange-200"}`}>
                                                    Tablo: {TABLE_MAP[tableFilter] || tableFilter}
                                                    <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setTableFilter("all")} />
                                                </span>
                                            )}
                                            {dateFrom && (
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isDark ? "bg-gray-700 text-gray-200" : "bg-orange-50 text-orange-700 border border-orange-200"}`}>
                                                    Başlangıç: {dateFrom}
                                                    <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setDateFrom("")} />
                                                </span>
                                            )}
                                            {dateTo && (
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isDark ? "bg-gray-700 text-gray-200" : "bg-orange-50 text-orange-700 border border-orange-200"}`}>
                                                    Bitiş: {dateTo}
                                                    <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setDateTo("")} />
                                                </span>
                                            )}
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50">
                                            Tümünü Temizle
                                        </Button>
                                    </div>
                                )}
                            </m.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Content */}
                {isLoading && page === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader size="40px" />
                        <p className="text-gray-500 text-sm animate-pulse">Loglar yükleniyor...</p>
                    </div>
                ) : (
                    <div className={`rounded-xl border overflow-hidden ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"}`}>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className={isDark ? "bg-gray-900/50" : "bg-gray-50/80"}>
                                    <TableRow className={isDark ? "border-gray-700 hover:bg-transparent" : "border-gray-200 hover:bg-transparent"}>
                                        <TableHead className="w-50">Admin</TableHead>
                                        <TableHead className="cursor-pointer select-none hover:text-orange-500 transition-colors" onClick={() => toggleSort("action")}>
                                            <span className="inline-flex items-center gap-1">
                                                İşlem
                                                <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === "action" ? "text-orange-500" : "opacity-40"}`} />
                                            </span>
                                        </TableHead>
                                        <TableHead className="cursor-pointer select-none hover:text-orange-500 transition-colors" onClick={() => toggleSort("target_table")}>
                                            <span className="inline-flex items-center gap-1">
                                                Hedef & Detay
                                                <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === "target_table" ? "text-orange-500" : "opacity-40"}`} />
                                            </span>
                                        </TableHead>
                                        <TableHead className="w-45 cursor-pointer select-none hover:text-orange-500 transition-colors" onClick={() => toggleSort("created_at")}>
                                            <span className="inline-flex items-center gap-1">
                                                Zaman
                                                <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === "created_at" ? "text-orange-500" : "opacity-40"}`} />
                                            </span>
                                        </TableHead>
                                        <TableHead className="w-20"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-40 text-center">
                                                <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
                                                    <Search className="w-8 h-8 opacity-20" />
                                                    <p>Kayıt bulunamadı</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredLogs.map((log) => {
                                            const actionInfo = getActionInfo(log.action);
                                            const ActionIcon = actionInfo.icon;
                                            const displayTable = TABLE_MAP[log.target_table || ""] || log.target_table || "-";

                                            return (
                                                <TableRow
                                                    key={log.id}
                                                    className={`group transition-all cursor-pointer ${isDark ? "border-gray-700 hover:bg-gray-750" : "border-gray-100 hover:bg-gray-50"}`}
                                                    onClick={() => setSelectedLog(log)}
                                                >
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="w-8 h-8 border">
                                                                <AvatarFallback className={isDark ? "bg-gray-700 text-gray-300" : "bg-orange-50 text-orange-600 font-medium"}>
                                                                    {log.admin_name?.substring(0, 2).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex flex-col">
                                                                <span className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                                                                    {log.admin_name}
                                                                </span>
                                                                <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                                                    {log.admin_email}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium border ${actionInfo.color} whitespace-nowrap`}>
                                                            <ActionIcon className="w-3.5 h-3.5" />
                                                            {actionInfo.label}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className={`text-sm font-medium flex items-center gap-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                                                {displayTable === "Sistem Girişi" ? "Kimlik Doğrulama" : displayTable}
                                                            </span>
                                                            {log.target_id && (
                                                                <span className={`text-xs font-mono mt-0.5 ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                                                                    ID: {log.target_id}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                                                {formatRelativeTime(log.created_at)}
                                                            </span>
                                                            <span className={`text-xs ${isDark ? "text-gray-600" : "text-gray-400"} group-hover:text-gray-500 transition-colors`}>
                                                                {new Date(log.created_at).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className={isDark ? "text-gray-400 hover:text-white hover:bg-gray-700" : "text-gray-400 hover:text-gray-900"}
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        {hasMore && (
                            <div className={`p-4 border-t text-center ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                                <Button
                                    variant="outline"
                                    onClick={() => loadLogs()}
                                    disabled={isLoading}
                                    className={`w-full max-w-xs ${isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : ""}`}
                                >
                                    {isLoading ? <Loader size="16px" noMargin /> : "Daha Fazla Yükle"}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Detail Dialog */}
            <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
                <DialogContent className={`max-w-2xl max-h-[85vh] overflow-y-auto ${isDark ? "bg-gray-900 border-gray-800 text-white" : ""}`}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            {selectedLog && getActionInfo(selectedLog.action).icon && (
                                <div className={`p-2 rounded-lg ${getActionInfo(selectedLog.action).color.split(" ")[0]}`}>
                                    {(() => {
                                        const Icon = getActionInfo(selectedLog.action).icon;
                                        return <Icon className={`w-5 h-5 ${getActionInfo(selectedLog.action).color.split(" ")[1]}`} />;
                                    })()}
                                </div>
                            )}
                            Log Detayı
                        </DialogTitle>
                        <DialogDescription>
                            İşlemin teknik detayları ve değişiklikleri
                        </DialogDescription>
                    </DialogHeader>

                    {selectedLog && (
                        <div className="space-y-6 mt-4">
                            {/* User & Time Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className={`p-4 rounded-xl border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-100"}`}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <User className="w-4 h-4 text-gray-400" />
                                        <h4 className="text-sm font-medium text-gray-500">İşlemi Yapan</h4>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-base">{selectedLog.admin_name}</span>
                                        <span className="text-sm text-gray-400">{selectedLog.admin_email}</span>
                                    </div>
                                </div>
                                <div className={`p-4 rounded-xl border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-100"}`}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        <h4 className="text-sm font-medium text-gray-500">Zaman</h4>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-base">{formatRelativeTime(selectedLog.created_at)}</span>
                                        <span className="text-sm text-gray-400">{formatFullDate(selectedLog.created_at)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Target Info */}
                            <div className={`p-4 rounded-xl border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-100"}`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <Database className="w-4 h-4 text-gray-400" />
                                    <h4 className="text-sm font-medium text-gray-500">Etkilenen Kayıt</h4>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={isDark ? "border-gray-600 text-gray-300" : ""}>
                                        {TABLE_MAP[selectedLog.target_table || ""] || selectedLog.target_table}
                                    </Badge>
                                    <ArrowRight className="w-4 h-4 text-gray-400" />
                                    {(() => {
                                        const table = selectedLog.target_table;
                                        const id = selectedLog.target_id;

                                        let targetPath = "";
                                        if (table === "orders") targetPath = `/admin/orders?highlight=${id}`;
                                        else if (table === "products") targetPath = `/admin/products?highlight=${id}`;
                                        else if (table === "promo_codes") targetPath = `/admin/promotions`;
                                        else if (table === "profiles" || table === "users") targetPath = `/admin/admins`;

                                        if (targetPath && id) {
                                            return (
                                                <button
                                                    onClick={() => {
                                                        setSelectedLog(null);
                                                        navigate(targetPath);
                                                    }}
                                                    className={`group flex items-center gap-2 px-2 py-0.5 rounded text-sm transition-all ${isDark
                                                        ? "bg-gray-800 text-orange-400 hover:bg-orange-500/10"
                                                        : "bg-white border text-orange-600 hover:bg-orange-50 shadow-sm"
                                                        }`}
                                                >
                                                    <code className="font-mono">{id}</code>
                                                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </button>
                                            );
                                        }

                                        return (
                                            <code className={`px-2 py-0.5 rounded text-sm ${isDark ? "bg-gray-800 text-gray-300" : "bg-gray-200 text-gray-700"}`}>
                                                {id || "ID Yok"}
                                            </code>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Visualization of Changes */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-gray-500 ml-1 flex items-center gap-2">
                                    <ArrowRightLeft className="w-4 h-4" />
                                    Yapılan Değişiklikler
                                </h4>
                                <DiffViewer
                                    oldData={selectedLog.details?.old_data}
                                    newData={selectedLog.details?.new_data || selectedLog.details}
                                    isDark={isDark}
                                />
                            </div>

                            {/* JSON Details (Accordion-like or simply at bottom) */}
                            <div className="space-y-2 opacity-50 hover:opacity-100 transition-opacity">
                                <div className="flex items-center justify-between ml-1">
                                    <h4 className="text-xs font-medium text-gray-500">Ham Veri (Teknik)</h4>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-[10px]"
                                        onClick={() => {
                                            navigator.clipboard.writeText(JSON.stringify(selectedLog.details, null, 2));
                                            toast.success("Kopyalandı");
                                        }}
                                    >
                                        <Copy className="w-3 h-3 mr-1" /> Kopyala
                                    </Button>
                                </div>
                                <div className={`rounded-xl border overflow-hidden max-h-40 ${isDark ? "bg-black border-gray-800" : "bg-gray-900 border-gray-800"}`}>
                                    <pre className="p-4 overflow-auto text-[10px] font-mono text-green-400 leading-tight">
                                        {JSON.stringify(selectedLog.details, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

import { Helmet } from "react-helmet-async";

export default function AdminAuditLogs() {
    return (
        <AdminGuard>
            <AdminLayout>
                <Helmet>
                    <title>Admin Audit Logs | Bravita</title>
                    <meta name="description" content="Admin Audit Logs" />
                    <meta name="robots" content="noindex" />
                    <meta property="og:title" content="Admin Audit Logs" />
                    <meta property="og:description" content="Admin Audit Logs" />
                </Helmet>
                <LogsContent />
            </AdminLayout>
        </AdminGuard>
    );
}
