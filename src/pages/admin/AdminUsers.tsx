import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { getAdminUsers, setUserAdmin, searchUsersByEmail } from "@/lib/admin";
import { Search, Shield, ShieldOff, UserPlus, RefreshCw, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAdminTheme } from "@/contexts/AdminThemeContext";
import { useAuth } from "@/contexts/AuthContext";

interface AdminUser {
    id: string;
    email: string;
    full_name: string | null;
    is_admin?: boolean;
    is_superadmin?: boolean;
}

function AddAdminModal({ isOpen, onClose, onAdd }: { isOpen: boolean; onClose: () => void; onAdd: (email: string) => Promise<void> }) {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { theme } = useAdminTheme();
    const isDark = theme === "dark";

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setIsLoading(true);
        try {
            await onAdd(email.trim());
            setEmail("");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className={`w-full max-w-md rounded-2xl p-6 ${isDark ? "bg-gray-800" : "bg-white"}`}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Admin Ekle</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
                </div>
                <form onSubmit={handleSubmit}>
                    <Input
                        type="email"
                        placeholder="E-posta adresi"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={isDark ? "bg-gray-700 border-gray-600 text-white" : ""}
                    />
                    <div className="flex gap-2 mt-4">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1">İptal</Button>
                        <Button type="submit" disabled={isLoading} className="flex-1 bg-orange-500 hover:bg-orange-600">
                            {isLoading ? "Ekleniyor..." : "Ekle"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function UsersContent() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const { theme } = useAdminTheme();
    const { isSuperAdmin } = useAuth();
    const isDark = theme === "dark";

    const loadUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getAdminUsers();
            const usersWithAdmin = data.map(u => ({ ...u, is_admin: true }));
            setUsers(usersWithAdmin);
            setFilteredUsers(usersWithAdmin);
        } catch (error) {
            toast.error("Kullanıcılar yüklenemedi");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    useEffect(() => {
        if (!search.trim()) setFilteredUsers(users);
        else {
            const q = search.toLowerCase();
            setFilteredUsers(users.filter(u => u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q)));
        }
    }, [search, users]);

    const handleRemoveAdmin = async (user: AdminUser) => {
        if (!confirm(`${user.full_name || user.email} admin yetkisini kaldırmak istediğinize emin misiniz?`)) return;
        try {
            await setUserAdmin(user.id, false);
            setUsers(users.filter(u => u.id !== user.id));
            toast.success("Admin yetkisi kaldırıldı");
        } catch (error) {
            toast.error("İşlem başarısız");
        }
    };

    const handleAddAdmin = async (email: string) => {
        try {
            const results = await searchUsersByEmail(email);
            if (results.length === 0) {
                toast.error("Kullanıcı bulunamadı");
                return;
            }
            const user = results[0];
            if (user.is_admin) {
                toast.error("Bu kullanıcı zaten admin");
                return;
            }
            await setUserAdmin(user.id, true);
            toast.success("Admin eklendi");
            setShowAddModal(false);
            await loadUsers();
        } catch (error: unknown) {
            toast.error("Eklenemedi");
            throw error;
        }
    };

    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
    const cardClass = isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100";
    const inputClass = isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white";
    const rowHoverClass = isDark ? "hover:bg-gray-700" : "hover:bg-gray-50";

    return (
        <>
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className={`text-2xl font-bold ${textPrimary}`}>Kullanıcı Yönetimi</h1>
                        <p className={textSecondary}>Admin yetkilerini yönetin.</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" size="icon" onClick={loadUsers} className={isDark ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600" : ""}>
                            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        </Button>
                        {isSuperAdmin && (
                            <Button onClick={() => setShowAddModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                                <UserPlus className="w-4 h-4 mr-2" />Admin Ekle
                            </Button>
                        )}
                    </div>
                </div>

                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input placeholder="Ad veya e-posta ara..." value={search} onChange={(e) => setSearch(e.target.value)} className={`pl-10 ${inputClass}`} />
                </div>

                <div className={`rounded-2xl border overflow-hidden shadow-sm ${cardClass}`}>
                    {isLoading ? (
                        <div className="p-8 text-center"><div className={`animate-pulse ${textSecondary}`}>Yükleniyor...</div></div>
                    ) : filteredUsers.length === 0 ? (
                        <div className={`p-8 text-center ${textSecondary}`}>Admin bulunamadı.</div>
                    ) : (
                        <ul className={isDark ? "divide-y divide-gray-700" : "divide-y divide-gray-100"}>
                            {filteredUsers.map((user) => (
                                <li key={user.id} className={`flex items-center justify-between px-6 py-4 transition-colors ${rowHoverClass}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isDark ? "bg-orange-500/20 text-orange-400" : "bg-orange-100 text-orange-600"}`}>
                                            {user.full_name?.charAt(0) || user.email?.charAt(0) || "?"}
                                        </div>
                                        <div>
                                            <p className={`font-medium ${textPrimary}`}>{user.full_name || "İsimsiz"}</p>
                                            <p className={`text-sm ${textSecondary}`}>{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.is_superadmin ? (isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-600") : (isDark ? "bg-orange-500/20 text-orange-400" : "bg-orange-100 text-orange-600")}`}>
                                            <Shield className="w-3 h-3 inline mr-1" />{user.is_superadmin ? "Super Admin" : "Admin"}
                                        </span>
                                        {isSuperAdmin && !user.is_superadmin && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveAdmin(user)}
                                                className={isDark ? "text-red-400 hover:text-red-300 hover:bg-red-500/20" : "text-red-500 hover:text-red-600 hover:bg-red-50"}
                                                title="Yetkiyi Kaldır"
                                            >
                                                <ShieldOff className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <AddAdminModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onAdd={handleAddAdmin} />
        </>
    );
}

export default function AdminUsers() {
    return (
        <AdminGuard>
            <AdminLayout>
                <UsersContent />
            </AdminLayout>
        </AdminGuard>
    );
}
