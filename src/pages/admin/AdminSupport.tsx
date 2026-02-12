import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LifeBuoy, Search, Filter, RefreshCw, MessageCircle,
    CheckCircle, XCircle, Clock, User, Mail, Send, ChevronRight,
    AlertCircle, X, ArrowUpDown, Tag as TagIcon, Headphones
} from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAdminTheme } from "@/contexts/AdminThemeContext";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Ticket = {
    id: string;
    name: string;
    email: string;
    subject: string;
    category: string;
    message: string;
    status: "open" | "answered" | "closed";
    created_at: string;
    user_id?: string;
    admin_reply?: string;
};

const CATEGORY_LABELS: Record<string, string> = {
    general: "Genel",
    order_issue: "Sipariş",
    product_info: "Ürün",
    delivery: "Teslimat",
    other: "Diğer",
};

export default function AdminSupport() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "open" | "answered" | "closed">("open");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
    const [search, setSearch] = useState("");
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [replyMessage, setReplyMessage] = useState("");
    const [closeReason, setCloseReason] = useState("");
    const [isReplying, setIsReplying] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
    const { theme } = useAdminTheme();
    const isDark = theme === "dark";

    const parseConversation = (rawMessage: string) => {
        if (!rawMessage) return [];
        const parts = rawMessage.split(/\n\n--- (.*?) ---\n/);
        const messages = [];
        if (parts[0]) {
            messages.push({
                text: parts[0],
                isAdmin: false,
                header: "Orijinal Talep"
            });
        }
        for (let i = 1; i < parts.length; i += 2) {
            const header = parts[i];
            const text = parts[i + 1];
            if (header && text) {
                messages.push({
                    text,
                    header,
                    isAdmin: header.includes("(Admin)")
                });
            }
        }
        return messages;
    };

    const fetchTickets = useCallback(async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from("support_tickets")
                .select("*")
                .order("created_at", { ascending: sortOrder === "oldest" });

            if (filter !== "all") {
                query = query.eq("status", filter);
            }

            if (categoryFilter !== "all") {
                query = query.eq("category", categoryFilter);
            }

            if (search) {
                query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,subject.ilike.%${search}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            setTickets(data || []);
        } catch (error: unknown) {
            console.error("Error fetching tickets:", error);
            toast.error("Talepler yüklenirken hata oluştu");
        } finally {
            setIsLoading(false);
        }
    }, [filter, categoryFilter, sortOrder, search]);

    useEffect(() => {
        fetchTickets();

        const channel = supabase
            .channel('admin-support-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
                fetchTickets();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchTickets]);

    const handleReply = async () => {
        if (!selectedTicket || !replyMessage.trim()) return;

        setIsReplying(true);
        try {
            // Veri tutarlılığı için en güncel mesajı çek (Admin açıkken kullanıcı yanıt yazmış olabilir)
            const { data: latestTicket, error: fetchError } = await supabase
                .from("support_tickets")
                .select("message, admin_reply")
                .eq("id", selectedTicket.id)
                .single();

            if (fetchError) throw fetchError;

            // Arşivleme: Eğer zaten bir admin yanıtı varsa, onu mesaj geçmişine ekle
            let newMessage = latestTicket.message;
            if (latestTicket.admin_reply) {
                newMessage += `\n\n--- Yanıtlandı (Admin) ---\n${latestTicket.admin_reply}`;
            }

            const { error } = await supabase
                .from("support_tickets")
                .update({
                    message: newMessage,
                    admin_reply: replyMessage,
                    status: "answered",
                    updated_at: new Date().toISOString()
                })
                .eq("id", selectedTicket.id);

            if (error) throw error;

            // Audit Log: Ticket Replied
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from("admin_audit_log").insert({
                    admin_user_id: user.id,
                    action: "Yanıtlandı",
                    target_table: "Destek Talepleri",
                    target_id: selectedTicket.id,
                    details: {
                        reply: replyMessage,
                        subject: selectedTicket.subject,
                        customer: selectedTicket.name
                    }
                });
            }

            // Invoke edge function for reply email
            try {
                const { data: funcData, error: funcError } = await supabase.functions.invoke("send-support-email", {
                    body: {
                        ticket_id: selectedTicket.id,
                        type: "ticket_replied",
                    },
                });

                if (funcError) {
                    console.error("Reply email Edge Function error:", funcError);
                    try {
                        const errorBody = await funcError.context?.json();
                        console.error("Edge Function error body:", errorBody);
                    } catch (bodyErr) {
                        console.error("Reply email error body parse failed:", bodyErr);
                    }
                } else {
                    console.log("Reply email sent successfully:", funcData);
                }
            } catch (e) {
                console.error("Reply email invocation error:", e);
            }

            toast.success("Yanıt başarıyla gönderildi");
            setSelectedTicket(null);
            setReplyMessage("");
            fetchTickets();
        } catch (error: unknown) {
            console.error("Reply handling error:", error);
            toast.error("Yanıt gönderilirken hata oluştu");
        } finally {
            setIsReplying(false);
        }
    };

    const handleCloseTicket = async (id: string, reason: string) => {
        setIsClosing(true);
        try {
            // Veri tutarlılığı için en güncel mesajı çek
            const { data: latestTicket, error: fetchError } = await supabase
                .from("support_tickets")
                .select("message, admin_reply")
                .eq("id", id)
                .single();

            if (fetchError) throw fetchError;

            // Arşivleme: Eğer zaten bir yanıt varsa geçmişe ekle
            let newMessage = latestTicket?.message || "";
            if (latestTicket?.admin_reply) {
                newMessage += `\n\n--- Yanıtlandı (Admin) ---\n${latestTicket.admin_reply}`;
            }

            const { error } = await supabase
                .from("support_tickets")
                .update({
                    status: "closed",
                    message: newMessage,
                    admin_reply: reason || null,
                    updated_at: new Date().toISOString(),
                    replied_at: new Date().toISOString(),
                    replied_by: (await supabase.auth.getUser()).data.user?.id
                })
                .eq("id", id);

            if (error) throw error;

            // Audit Log: Ticket Closed
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from("admin_audit_log").insert({
                    admin_user_id: user.id,
                    action: "Kapatıldı",
                    target_table: "Destek Talepleri",
                    target_id: id,
                    details: {
                        reason: reason,
                        subject: selectedTicket?.subject,
                        customer: selectedTicket?.name
                    }
                });
            }

            // Send closure email
            try {
                await supabase.functions.invoke("send-support-email", {
                    body: {
                        ticket_id: id,
                        type: "ticket_closed",
                    },
                });
            } catch (e) {
                console.error("Closure email error:", e);
            }

            toast.success("Talep kapatıldı ve üyeye bilgi verildi");
            fetchTickets();
            setCloseReason("");
        } catch (error) {
            toast.error("Güncellenirken hata oluştu");
        } finally {
            setIsClosing(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "open": return <Clock className="w-4 h-4 text-orange-500" />;
            case "answered": return <CheckCircle className="w-4 h-4 text-green-500" />;
            case "closed": return <XCircle className="w-4 h-4 text-gray-400" />;
            default: return null;
        }
    };

    const cardClass = isDark ? "bg-slate-800 border-slate-700 shadow-sm" : "bg-card border-border shadow-sm";
    const textPrimary = isDark ? "text-slate-100" : "text-foreground";
    const textSecondary = isDark ? "text-slate-400" : "text-muted-foreground";
    const rowHover = isDark ? "hover:bg-slate-800/50" : "hover:bg-muted/50";

    return (
        <AdminGuard>
            <AdminLayout>
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className={`text-2xl font-bold ${textPrimary}`}>Destek Talepleri</h1>
                            <p className={textSecondary}>Müşterilerden gelen tüm mesajları yönetin</p>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={fetchTickets}
                            className="bg-background border-border"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>

                    {/* Filters */}
                    <div className={`p-6 rounded-2xl border ${cardClass} space-y-4`}>
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex-1 min-w-75 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="İsim, e-posta veya konu ara..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 bg-background border-input"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                {/* Category Filter */}
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="w-40 bg-background border-input h-9 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <TagIcon className="w-3 h-3 text-muted-foreground" />
                                            <SelectValue placeholder="Kategori" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tüm Kategoriler</SelectItem>
                                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Sort Order */}
                                <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "newest" | "oldest")}>
                                    <SelectTrigger className="w-40 bg-background border-input h-9 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                                            <SelectValue placeholder="Sıralama" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="newest">En Yeni</SelectItem>
                                        <SelectItem value="oldest">En Eski</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Status Filter Tabs */}
                                <div className="flex gap-1 p-1 bg-muted rounded-xl">
                                    {(["all", "open", "answered", "closed"] as const).map((t) => (
                                        <Button
                                            key={t}
                                            variant={filter === t ? "default" : "ghost"}
                                            size="sm"
                                            onClick={() => setFilter(t)}
                                            className={cn(
                                                "rounded-lg capitalize transition-all px-4",
                                                filter === t ? "bg-orange-500 hover:bg-orange-600 text-white shadow-sm" : ""
                                            )}
                                        >
                                            {t === "all" ? "Tümü" : t === "open" ? "Bekleyen" : t === "answered" ? "Yanıtlanan" : "Kapalı"}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
                        <div className={`grid grid-cols-12 gap-4 px-6 py-4 border-b text-xs font-bold uppercase tracking-wider ${isDark ? "bg-slate-800/50 text-slate-400 border-slate-700" : "bg-muted/50 text-muted-foreground"}`}>
                            <div className="col-span-3">Müşteri</div>
                            <div className="col-span-4">Konu / Mesaj</div>
                            <div className="col-span-2">Kategori</div>
                            <div className="col-span-2">Durum</div>
                            <div className="col-span-1"></div>
                        </div>

                        <div className="divide-y divide-border">
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <div key={i} className="px-6 py-6 space-y-2">
                                        <Skeleton className="h-4 w-1/3" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                ))
                            ) : tickets.length > 0 ? (
                                tickets.map((ticket) => (
                                    <div
                                        key={ticket.id}
                                        onClick={() => setSelectedTicket(ticket)}
                                        className={`grid grid-cols-12 gap-4 px-6 py-5 transition-colors cursor-pointer items-center ${rowHover}`}
                                    >
                                        <div className="col-span-3">
                                            <p className={`font-bold ${textPrimary}`}>{ticket.name}</p>
                                            <p className="text-xs text-gray-500">{ticket.email}</p>
                                        </div>
                                        <div className="col-span-4">
                                            <p className={`font-medium line-clamp-1 ${textPrimary}`}>{ticket.subject}</p>
                                            <p className="text-xs text-gray-500 line-clamp-1">{ticket.message}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-muted text-muted-foreground">
                                                {CATEGORY_LABELS[ticket.category] || ticket.category}
                                            </span>
                                        </div>
                                        <div className="col-span-2 flex items-center gap-2">
                                            {getStatusIcon(ticket.status)}
                                            <span className={cn(
                                                "text-xs capitalize",
                                                ticket.status === "open" ? "text-orange-500" :
                                                    ticket.status === "answered" ? "text-green-500" : "text-gray-400"
                                            )}>
                                                {ticket.status === "open" ? "Bekliyor" :
                                                    ticket.status === "answered" ? "Yanıtlandı" : "Kapatıldı"}
                                            </span>
                                        </div>
                                        <div className="col-span-1 flex justify-end">
                                            <ChevronRight className="w-5 h-5 text-gray-300" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center">
                                    <LifeBuoy className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                    <p className={textSecondary}>Talep bulunamadı.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Reply Modal */}
                <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
                    <DialogContent className="max-w-2xl bg-card border-border text-foreground">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-orange-500" />
                                Destek Talebi Detayı
                            </DialogTitle>
                        </DialogHeader>

                        {selectedTicket && (
                            <div className="space-y-6 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 rounded-xl bg-muted/50">
                                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Müşteri</p>
                                        <div className="flex items-center gap-2">
                                            <User className="w-3 h-3 text-orange-500" />
                                            <span className="text-sm font-medium">{selectedTicket.name}</span>
                                        </div>
                                    </div>
                                    {(() => {
                                        const hasIdentityMismatch = parseConversation(selectedTicket.message).some(m =>
                                            !m.isAdmin &&
                                            m.header.includes('@') &&
                                            m.header.split(' ')[0].toLowerCase() !== selectedTicket.email.toLowerCase()
                                        );
                                        return (
                                            <div className={cn(
                                                "p-3 rounded-xl transition-colors",
                                                hasIdentityMismatch ? "bg-red-50 border border-red-100" : "bg-muted/50"
                                            )}>
                                                <div className="flex justify-between items-start">
                                                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">E-posta</p>
                                                    {hasIdentityMismatch && (
                                                        <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded animate-pulse">
                                                            KİMLİK UYUŞMAZLIĞI
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-3 h-3 text-orange-500" />
                                                    <span className="text-sm font-medium">{selectedTicket.email}</span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div className="space-y-4 max-h-100 overflow-y-auto pr-2 custom-scrollbar">
                                    {parseConversation(selectedTicket.message).map((msg, idx) => (
                                        <div key={idx} className={cn("flex gap-3", msg.isAdmin ? "flex-row-reverse" : "flex-row text-left")}>
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm",
                                                msg.isAdmin ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"
                                            )}>
                                                {msg.isAdmin ? <Headphones className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                            </div>
                                            <div className={cn(
                                                "max-w-[85%] space-y-1",
                                                msg.isAdmin ? "items-end flex flex-col" : "items-start"
                                            )}>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                                                    {msg.header}
                                                </span>
                                                <div className={cn(
                                                    "p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
                                                    msg.isAdmin
                                                        ? "bg-primary/10 border border-primary/20 text-foreground rounded-tr-none"
                                                        : "bg-muted border border-border text-foreground rounded-tl-none"
                                                )}>
                                                    {msg.text}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {selectedTicket.admin_reply && (
                                        <div className="flex gap-3 flex-row-reverse">
                                            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0 border border-green-600 shadow-sm animate-pulse-subtle">
                                                <Headphones className="w-4 h-4" />
                                            </div>
                                            <div className="max-w-[85%] space-y-1 items-end flex flex-col">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 px-1">
                                                    Sizin Yanıtınız (Admin)
                                                </span>
                                                <div className="p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm bg-green-500/10 border border-green-500/20 text-foreground rounded-tr-none">
                                                    {selectedTicket.admin_reply}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {selectedTicket.status !== "closed" && (
                                    <div className="space-y-3 pt-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Yanıtınız</Label>
                                        <Textarea
                                            placeholder="Müşteriye iletilecek yanıtı yazın..."
                                            value={replyMessage}
                                            onChange={(e) => setReplyMessage(e.target.value)}
                                            className="min-h-30 rounded-xl bg-background border-input"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <DialogFooter className="flex flex-col sm:flex-row gap-2">
                            <div className="flex-1">
                                {selectedTicket?.status !== "closed" && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => setIsCloseDialogOpen(true)}
                                    >
                                        Talebi Kapat
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setSelectedTicket(null)}>Kapat</Button>
                                {selectedTicket?.status !== "closed" && (
                                    <Button
                                        disabled={isReplying || !replyMessage.trim()}
                                        onClick={handleReply}
                                        className="bg-orange-500 hover:bg-orange-600 text-white min-w-30"
                                    >
                                        {isReplying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Yanıtla</>}
                                    </Button>
                                )}
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
                    <AlertDialogContent className="bg-card border-border z-101 max-w-md">
                        <AlertDialogHeader>
                            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4 mx-auto">
                                <AlertCircle className="w-6 h-6 text-destructive" />
                            </div>
                            <AlertDialogTitle className="text-center text-foreground font-bold">Talebi Kapat</AlertDialogTitle>
                            <AlertDialogDescription className="text-center text-muted-foreground">
                                Bu talebi kapatmak üzeresiniz. Müşteriye bilgi amaçlı bir kapanış notu eklemek ister misiniz?
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <div className="py-4">
                            <Label className="text-xs font-bold uppercase text-gray-400 mb-2 block">Kapatılma Nedeni / Müşteri Notu</Label>
                            <Textarea
                                placeholder="Örn: Sorun çözüldü, iade yapıldı..."
                                value={closeReason}
                                onChange={(e) => setCloseReason(e.target.value)}
                                className="min-h-24 rounded-xl bg-muted/50 border-border focus:ring-orange-500"
                            />
                        </div>

                        <AlertDialogFooter className="sm:justify-center gap-3">
                            <AlertDialogCancel
                                className="bg-background border-border text-foreground hover:bg-muted"
                                onClick={() => setCloseReason("")}
                            >
                                Vazgeç
                            </AlertDialogCancel>
                            <AlertDialogAction
                                disabled={isClosing || !closeReason.trim()}
                                onClick={async (e) => {
                                    e.preventDefault();
                                    if (selectedTicket) {
                                        await handleCloseTicket(selectedTicket.id, closeReason);
                                        setSelectedTicket(null);
                                        setIsCloseDialogOpen(false);
                                    }
                                }}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold min-w-32 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isClosing ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Onayla ve Kapat"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </AdminLayout>
        </AdminGuard>
    );
}
