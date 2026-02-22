import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { m, AnimatePresence } from "framer-motion";
import { MessageSquare, Plus, Send, History, Clock, CheckCircle2, XCircle, User, Headphones } from "lucide-react";
import Loader from "@/components/ui/Loader";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Ticket = {
    id: string;
    subject: string;
    category: string;
    status: string;
    created_at: string;
    message: string;
    admin_reply?: string;
};

export function SupportCenter() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        category: "general",
        subject: "",
        message: "",
    });
    const [replyingToId, setReplyingToId] = useState<string | null>(null);
    const [replyValue, setReplyValue] = useState("");
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);

    const parseConversation = (rawMessage: string) => {
        if (!rawMessage) return [];
        // Split by the pattern \n\n--- ... ---\n
        const parts = rawMessage.split(/\n\n--- (.*?) ---\n/);
        const messages = [];

        // İlk kısım her zaman orijinal mesajdır (başlıksız)
        if (parts[0]) {
            messages.push({
                text: parts[0],
                isAdmin: false,
                header: t("support.original_message") || "Orijinal Mesaj"
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
        if (!user) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("support_tickets")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setTickets(data || []);
        } catch (error) {
            console.error("Error fetching tickets:", error);
            toast.error(t("support.error_message"));
        } finally {
            setIsLoading(false);
        }
    }, [user, t]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const handleReply = async (ticket: Ticket) => {
        if (!replyValue.trim()) return;
        setIsSubmittingReply(true);
        try {
            // Arşivleme: Mevcut admin yanıtını ve eski mesajı birleştir
            const historyText = ticket.admin_reply
                ? `\n\n--- ${t("support.status_answered")} (Admin) ---\n${ticket.admin_reply}`
                : "";

            const newMessage = `${ticket.message}${historyText}\n\n--- ${user?.email} (${new Date().toLocaleString('tr-TR')}) ---\n${replyValue}`;

            // Mesajı güncelle, admin_reply'ı temizle (yeni bir soru/yanıt gibi), durumu 'open' yap
            const { error } = await supabase
                .from("support_tickets")
                .update({
                    message: newMessage,
                    admin_reply: null,
                    status: "open",
                    updated_at: new Date().toISOString()
                })
                .eq("id", ticket.id);

            if (error) throw error;

            // Admini bilgilendir
            try {
                await supabase.functions.invoke("send-support-email", {
                    body: {
                        ticket_id: ticket.id,
                        type: "user_replied",
                    },
                });
            } catch {
                // Bildirim e-postası başarısız olsa da yanıt akışını bozma
            }

            toast.success(t("support.reply_success"));
            setReplyValue("");
            setReplyingToId(null);
            fetchTickets();
        } catch (error) {
            console.error("Reply error:", error);
            toast.error(t("support.error_message"));
        } finally {
            setIsSubmittingReply(false);
        }
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (formData.subject.trim().length < 5) {
            toast.error(t("support.validation.subject_min"));
            return;
        }
        if (formData.message.trim().length < 10) {
            toast.error(t("support.validation.message_min"));
            return;
        }

        setIsSubmitting(true);
        try {
            const { data: rpcResult, error } = await supabase.rpc("create_support_ticket_v1", {
                p_name: user.full_name || user.email || "Müşteri",
                p_email: user.email || "",
                p_category: formData.category,
                p_subject: formData.subject,
                p_message: formData.message,
                p_user_id: user.id,
            });

            if (error) throw error;
            const ticket = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
            if (!ticket?.id) throw new Error("Ticket ID alınamadı.");

            toast.success(t("support.success_message"));
            setFormData({ category: "general", subject: "", message: "" });
            setShowForm(false);
            fetchTickets();

            try {
                const { error: notifyError } = await supabase.functions.invoke("send-support-email", {
                    body: {
                        ticket_id: ticket.id,
                        type: "ticket_created",
                    },
                });

                if (notifyError) {
                    console.error("Support notify email failed:", notifyError);
                    toast.warning("Talebiniz kaydedildi ancak destek bildirimi gönderilemedi.");
                }
            } catch (notifyUnexpectedError) {
                console.error("Support notify email unexpected failure:", notifyUnexpectedError);
                toast.warning("Talebiniz kaydedildi ancak destek bildirimi gönderilemedi.");
            }
        } catch (error: unknown) {
            console.error("Create ticket error:", error);
            toast.error(t("support.error_message"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "open":
                return (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        <Clock size={12} /> {t("support.status_open")}
                    </span>
                );
            case "answered":
                return (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle2 size={12} /> {t("support.status_answered")}
                    </span>
                );
            case "closed":
                return (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        <XCircle size={12} /> {t("support.status_closed")}
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{t("support.history_title")}</h2>
                    <p className="text-gray-500 text-sm">{t("landing.support_subtitle")}</p>
                </div>
                <Button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 transition-all hover:scale-105"
                >
                    {showForm ? (
                        <History className="w-4 h-4 mr-2" />
                    ) : (
                        <Plus className="w-4 h-4 mr-2" />
                    )}
                    {showForm ? t("common.back") : t("support.submit")}
                </Button>
            </div>

            <AnimatePresence mode="wait">
                {showForm ? (
                    <m.div
                        key="form"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white p-6 md:p-8 rounded-3xl border border-orange-100 shadow-xl shadow-orange-500/5"
                    >
                        <form onSubmit={handleCreateTicket} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>{t("support.category")}</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(val) => setFormData({ ...formData, category: val })}
                                    >
                                        <SelectTrigger className="bg-orange-50/20 border-orange-100 h-11 rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="general">{t("support.category_general")}</SelectItem>
                                            <SelectItem value="order_issue">{t("support.category_order_issue")}</SelectItem>
                                            <SelectItem value="product_info">{t("support.category_product_info")}</SelectItem>
                                            <SelectItem value="delivery">{t("support.category_delivery")}</SelectItem>
                                            <SelectItem value="other">{t("support.category_other")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="subject">{t("support.subject")}</Label>
                                    <Input
                                        id="subject"
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        placeholder={t("support.subject_placeholder")}
                                        className="bg-orange-50/20 border-orange-100 h-11 rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message">{t("support.message")}</Label>
                                <Textarea
                                    id="message"
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    placeholder={t("support.message_placeholder")}
                                    className="bg-orange-50/20 border-orange-100 min-h-37.5 rounded-2xl resize-none"
                                />
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-orange-500 hover:bg-orange-600 text-white min-w-35 h-12 rounded-full font-bold shadow-lg shadow-orange-500/20"
                                >
                                    {isSubmitting ? <Loader size="1.25rem" noMargin className="text-white" /> : <><Send className="w-4 h-4 mr-2" /> {t("support.submit")}</>}
                                </Button>
                            </div>
                        </form>
                    </m.div>
                ) : (
                    <m.div
                        key="list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4"
                    >
                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader />
                            </div>
                        ) : tickets.length > 0 ? (
                            tickets.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                        <div className="space-y-2 grow">
                                            <div className="flex flex-wrap items-center gap-3">
                                                {getStatusBadge(ticket.status)}
                                                <span className="text-xs text-gray-400">
                                                    {format(new Date(ticket.created_at), "dd.MM.yyyy HH:mm")}
                                                </span>
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] uppercase font-bold tracking-wider">
                                                    {t(`support.category_${ticket.category}`)}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-900">{ticket.subject}</h3>

                                            <div className="mt-6 space-y-6">
                                                {parseConversation(ticket.message).map((msg, idx) => (
                                                    <div key={`msg-${ticket.id}-${idx}`} className={cn("flex gap-3", msg.isAdmin ? "flex-row" : "flex-row-reverse")}>
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                                                            msg.isAdmin ? "bg-orange-50 border-orange-200 text-orange-600" : "bg-gray-50 border-gray-200 text-gray-600"
                                                        )}>
                                                            {msg.isAdmin ? <Headphones className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                                        </div>
                                                        <div className={cn(
                                                            "max-w-[85%] space-y-1",
                                                            msg.isAdmin ? "items-start" : "items-end flex flex-col"
                                                        )}>
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1">
                                                                {msg.header}
                                                            </span>
                                                            <div className={cn(
                                                                "p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
                                                                msg.isAdmin
                                                                    ? "bg-white border border-orange-100 text-gray-800 rounded-tl-none"
                                                                    : "bg-orange-600 text-white rounded-tr-none"
                                                            )}>
                                                                {msg.text}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {ticket.admin_reply && (
                                                    <div className="flex gap-3 flex-row">
                                                        <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20 animate-pulse-subtle">
                                                            <Headphones className="w-4 h-4" />
                                                        </div>
                                                        <div className="max-w-[85%] space-y-1">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 px-1">
                                                                {t("support.status_answered")} (Admin)
                                                            </span>
                                                            <div className="p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-md bg-white border-2 border-orange-200 text-gray-900 rounded-tl-none">
                                                                {ticket.admin_reply}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-6 flex flex-col gap-4">
                                                {replyingToId === ticket.id ? (
                                                    <m.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        className="space-y-3"
                                                    >
                                                        <Textarea
                                                            value={replyValue}
                                                            onChange={(e) => setReplyValue(e.target.value)}
                                                            placeholder={t("support.reply_placeholder")}
                                                            className="min-h-25 bg-white border-orange-100 focus:border-orange-500 rounded-xl"
                                                        />
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setReplyingToId(null);
                                                                    setReplyValue("");
                                                                }}
                                                            >
                                                                {t("common.cancel") || "İptal"}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
                                                                onClick={() => handleReply(ticket)}
                                                                disabled={isSubmittingReply || !replyValue.trim()}
                                                            >
                                                                {isSubmittingReply ? (
                                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                ) : (
                                                                    <Send className="w-4 h-4" />
                                                                )}
                                                                {t("support.reply_submit")}
                                                            </Button>
                                                        </div>
                                                    </m.div>
                                                ) : (
                                                    ticket.status !== "closed" && (
                                                        <div className="flex justify-end">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="border-orange-200 text-orange-700 hover:bg-orange-50 gap-2 rounded-lg"
                                                                onClick={() => setReplyingToId(ticket.id)}
                                                            >
                                                                <MessageSquare className="w-4 h-4" />
                                                                {t("support.reply_button")}
                                                            </Button>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-16 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
                                <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                    <MessageSquare className="w-8 h-8 text-gray-300" />
                                </div>
                                <h3 className="text-gray-900 font-bold">{t("support.history_title")}</h3>
                                <p className="text-gray-500 text-sm max-w-xs mx-auto mt-2">
                                    {t("common.note")}: {t("landing.support_subtitle")}
                                </p>
                            </div>
                        )}
                    </m.div>
                )}
            </AnimatePresence>
        </m.div>
    );
}
