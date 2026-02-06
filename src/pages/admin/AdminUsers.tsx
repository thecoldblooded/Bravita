import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Search, Shield, ShieldOff, Plus, X, UserPlus } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { getAdminUsers, searchUsersByEmail, setUserAdmin } from "@/lib/admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface AdminUser {
    id: string;
    email: string;
    full_name: string | null;
}

interface SearchResult {
    id: string;
    email: string;
    full_name: string | null;
    is_admin: boolean;
}

export default function AdminUsers() {
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        loadAdmins();
    }, []);

    async function loadAdmins() {
        try {
            const data = await getAdminUsers();
            setAdmins(data);
        } catch (error) {
            console.error("Failed to load admins:", error);
            toast.error("Admin listesi yüklenemedi");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSearch() {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const results = await searchUsersByEmail(searchQuery);
            setSearchResults(results);
        } catch (error) {
            console.error("Search failed:", error);
            toast.error("Arama başarısız");
        } finally {
            setIsSearching(false);
        }
    }

    async function handleAddAdmin(userId: string) {
        setProcessingId(userId);
        try {
            await setUserAdmin(userId, true);
            await loadAdmins();
            setSearchResults((prev) => prev.map((u) => u.id === userId ? { ...u, is_admin: true } : u));
            toast.success("Admin yetkisi verildi");
        } catch (error) {
            console.error("Failed to add admin:", error);
            toast.error("Admin yetkisi verilemedi");
        } finally {
            setProcessingId(null);
        }
    }

    async function handleRemoveAdmin(userId: string) {
        if (admins.length <= 1) {
            toast.error("En az bir admin olmalı");
            return;
        }
        setProcessingId(userId);
        try {
            await setUserAdmin(userId, false);
            setAdmins((prev) => prev.filter((a) => a.id !== userId));
            setSearchResults((prev) => prev.map((u) => u.id === userId ? { ...u, is_admin: false } : u));
            toast.success("Admin yetkisi kaldırıldı");
        } catch (error) {
            console.error("Failed to remove admin:", error);
            toast.error("Admin yetkisi kaldırılamadı");
        } finally {
            setProcessingId(null);
        }
    }

    return (
        <AdminGuard>
            <AdminLayout>
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Admin Yönetimi</h1>
                            <p className="text-gray-500">Admin kullanıcıları yönetin</p>
                        </div>
                        <Button
                            onClick={() => setShowAddModal(true)}
                            className="bg-orange-500 hover:bg-orange-600"
                        >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Admin Ekle
                        </Button>
                    </div>

                    {/* Admin List */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                    >
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-orange-500" />
                                Mevcut Adminler
                            </h2>
                        </div>

                        {isLoading ? (
                            <div className="divide-y divide-gray-50">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-4">
                                            <Skeleton className="w-12 h-12 rounded-full" />
                                            <div>
                                                <Skeleton className="h-4 w-32 mb-2" />
                                                <Skeleton className="h-3 w-48" />
                                            </div>
                                        </div>
                                        <Skeleton className="h-9 w-28" />
                                    </div>
                                ))}
                            </div>
                        ) : admins.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <Users className="w-12 h-12 text-gray-300 mb-4" />
                                <p className="text-gray-500">Henüz admin yok</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {admins.map((admin) => (
                                    <div
                                        key={admin.id}
                                        className="flex items-center justify-between p-4 hover:bg-gray-50"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                                                <span className="text-orange-600 font-bold text-lg">
                                                    {admin.full_name?.charAt(0) || admin.email.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{admin.full_name || "İsimsiz"}</p>
                                                <p className="text-sm text-gray-500">{admin.email}</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveAdmin(admin.id)}
                                            disabled={processingId === admin.id || admins.length <= 1}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <ShieldOff className="w-4 h-4 mr-1" />
                                            Kaldır
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* Add Admin Modal */}
                    <AnimatePresence>
                        {showAddModal && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                                onClick={() => setShowAddModal(false)}
                            >
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.95, opacity: 0 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
                                >
                                    <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                        <h2 className="text-xl font-bold text-gray-900">Admin Ekle</h2>
                                        <button
                                            onClick={() => setShowAddModal(false)}
                                            className="p-2 hover:bg-gray-100 rounded-lg"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="p-6">
                                        <div className="flex gap-2 mb-6">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <Input
                                                    placeholder="E-posta ile kullanıcı ara..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                                    className="pl-10"
                                                />
                                            </div>
                                            <Button
                                                onClick={handleSearch}
                                                disabled={isSearching || !searchQuery.trim()}
                                                className="bg-orange-500 hover:bg-orange-600"
                                            >
                                                {isSearching ? "Aranıyor..." : "Ara"}
                                            </Button>
                                        </div>

                                        {/* Search Results */}
                                        <div className="max-h-72 overflow-y-auto">
                                            {searchResults.length === 0 ? (
                                                <div className="text-center py-8 text-gray-500">
                                                    <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                                                    <p>Kullanıcı aramak için e-posta girin</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {searchResults.map((user) => (
                                                        <div
                                                            key={user.id}
                                                            className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                                                    <span className="text-gray-600 font-medium">
                                                                        {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-gray-900">{user.full_name || "İsimsiz"}</p>
                                                                    <p className="text-sm text-gray-500">{user.email}</p>
                                                                </div>
                                                            </div>
                                                            {user.is_admin ? (
                                                                <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium">
                                                                    Admin
                                                                </span>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleAddAdmin(user.id)}
                                                                    disabled={processingId === user.id}
                                                                    className="bg-orange-500 hover:bg-orange-600"
                                                                >
                                                                    <Plus className="w-4 h-4 mr-1" />
                                                                    Ekle
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </AdminLayout>
        </AdminGuard>
    );
}
