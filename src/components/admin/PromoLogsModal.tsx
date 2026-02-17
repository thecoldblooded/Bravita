import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { TableSkeleton } from "./skeletons";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

interface PromoLogsModalProps {
    isOpen: boolean;
    onClose: () => void;
    promoId: string | null;
    promoCode: string;
}

interface PromoLog {
    id: string;
    promo_code_id: string;
    user_id: string;
    order_id: string;
    discount_amount: number;
    created_at: string;
    order?: {
        id: string;
        created_at: string;
        status: string;
    };
    user?: {
        id: string;
        full_name: string | null;
        email: string;
    } | null;
}

export function PromoLogsModal({ isOpen, onClose, promoId, promoCode }: PromoLogsModalProps) {
    const [logs, setLogs] = useState<PromoLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { theme } = useAdminTheme();
    const isDark = theme === "dark";

    useEffect(() => {
        if (isOpen && promoId) {
            loadLogs(promoId);
        } else {
            setLogs([]); // Clear logs when closed or no ID
        }
    }, [isOpen, promoId]);

    const loadLogs = async (id: string) => {
        setIsLoading(true);

        try {
            // Join with orders and profiles (via user_id) to get readable info
            // Note: profiles usually share ID with auth.users, but foreign key refers to auth.users.
            // Supabase allows joining if relationship exists. 
            // If relationship is not auto-detected on `user_id`, we might need manual query or verify FK.
            // But we added `user_id uuid references auth.users(id)`. 
            // Postgrest might not join auth.users directly?
            // Usually we join on public.profiles if user_id matches.
            // Let's assume public.profiles is keyed by id (which matches auth.id).
            // FK is pointing to auth.users though.
            // If we want profile info, we should join on profiles.
            // Does promo_logs have FK to profiles? No, to auth.users.
            // But we can typically join tables if they share a PK/FK.
            // However, Supabase API join requires explicit Foreign Key. 
            // `promo_logs.user_id` -> `auth.users.id`.
            // `profiles.id` -> `auth.users.id`.
            // There is no direct FK from `promo_logs` to `profiles`.
            // Workaround: Fetch logs, then fetch profiles.

            // First fetch logs and order details
            const { data: logsData, error } = await supabase
                .from('promo_logs')
                .select(`
                    *,
                    order:orders(id, created_at, status)
                `)
                .eq('promo_code_id', id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (logsData && logsData.length > 0) {
                // Fetch user profiles manually
                const userIds = Array.from(new Set(logsData.map(l => l.user_id).filter(Boolean)));

                const profilesMap: Record<string, { id: string; full_name: string | null; email: string }> = {};
                if (userIds.length > 0) {
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, full_name, email')
                        .in('id', userIds);

                    if (profiles) {
                        profiles.forEach(p => { profilesMap[p.id] = p; });
                    }
                }

                // Merge
                const merged = logsData.map(log => ({
                    ...log,
                    user: log.user_id ? profilesMap[log.user_id] : null
                }));
                setLogs(merged);
            } else {
                setLogs([]);
            }
        } catch (error) {
            console.error("Logs error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Dark mode styles
    const dialogClass = isDark ? "bg-gray-800 border-gray-700 text-white" : "";
    const titleClass = isDark ? "text-white" : "";
    const emptyStateClass = isDark
        ? "text-gray-400 bg-gray-700 border-gray-600"
        : "text-gray-400 bg-gray-50 border-gray-200";
    const tableBorderClass = isDark ? "border-gray-700" : "border-gray-100";
    const theadClass = isDark ? "bg-gray-700 text-gray-400" : "bg-gray-50 text-gray-500";
    const tbodyDividerClass = isDark ? "divide-gray-700" : "divide-gray-100";
    const rowClass = isDark ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-50";
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-600";
    const textMuted = isDark ? "text-gray-500" : "text-gray-500";
    const linkClass = isDark
        ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 hover:text-orange-300"
        : "bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className={`max-w-3xl max-h-[80vh] overflow-y-auto w-full ${dialogClass}`}>
                <DialogHeader>
                    <DialogTitle className={titleClass}>Kullanım Geçmişi: <span className="font-mono text-orange-500">{promoCode}</span></DialogTitle>
                    <DialogDescription className="sr-only">
                        Bu promosyon kodunun kullanım geçmişi detayları.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <TableSkeleton rows={3} columns={4} />
                ) : logs.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center py-12 rounded-xl border border-dashed ${emptyStateClass}`}>
                        <p>Henüz kullanım kaydı yok.</p>
                    </div>
                ) : (
                    <div className={`overflow-hidden rounded-xl border ${tableBorderClass}`}>
                        <table className="w-full text-sm text-left">
                            <thead className={`font-medium ${theadClass}`}>
                                <tr>
                                    <th className="p-4">Tarih</th>
                                    <th className="p-4">Kullanıcı</th>
                                    <th className="p-4">Sipariş</th>
                                    <th className="p-4 text-right">İndirim</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${tbodyDividerClass}`}>
                                {logs.map((log) => (
                                    <tr key={log.id} className={`${rowClass} transition-colors`}>
                                        <td className={`p-4 ${textSecondary}`}>
                                            {formatDateTime(log.created_at)}
                                        </td>
                                        <td className="p-4">
                                            {log.user ? (
                                                <>
                                                    <div className={`font-medium ${textPrimary}`}>{log.user.full_name}</div>
                                                    <div className={`text-xs ${textMuted}`}>{log.user.email}</div>
                                                </>
                                            ) : (
                                                <span className="text-gray-400 italic">Misafir / Bilinmiyor</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <Link
                                                to={`/admin/orders/${log.order_id}`}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${linkClass} transition-colors font-medium font-mono text-xs`}
                                                onClick={onClose}
                                            >
                                                #{log.order?.id?.substring(0, 8).toUpperCase()}
                                                <ExternalLink className="w-3 h-3" />
                                            </Link>
                                        </td>
                                        <td className={`p-4 text-right font-bold ${textPrimary}`}>
                                            ₺{log.discount_amount}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
