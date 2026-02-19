import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { supabase } from "@/lib/supabase";
import { getFunctionAuthHeaders } from "@/lib/functionAuth";
import {
    Mail,
    Settings,
    History,
    Plus,
    Search,
    Filter,
    Eye,
    Edit,
    Send,
    CheckCircle2,
    XCircle,
    Clock,
    User,
    ChevronDown,
    MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAdminTheme } from "@/contexts/AdminThemeContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EmailTemplate {
    id: string;
    name: string;
    slug: string;
    subject: string;
    content_html: string;
    variables: string[];
}

interface EmailConfig {
    id: string;
    template_slug: string;
    sender_name: string;
    sender_email: string;
    reply_to: string | null;
    is_virtual?: boolean;
}

interface EmailLog {
    id: string;
    template_slug: string;
    recipient_email: string;
    status: string;
    sent_at: string;
    error_message: string | null;
}

import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import { Helmet } from "react-helmet-async";

const SUPPORT_TICKET_SLUG = "support_ticket";
const AUTH_SYNC_CRITICAL_SLUGS = new Set(["confirm_signup", "reset_password", "password_changed"]);

const PREVIEW_DUMMY_VARS: Record<string, string> = {
    "ORDER_ID": "TEST-12345",
    "ORDER_DATE": new Date().toLocaleDateString("tr-TR"),
    "NAME": "Test Kullanıcı",
    "EMAIL": "test@ornek.com",
    "SUBJECT": "Destek Talebiniz Alındı",
    "TICKET_ID": "TKT-8899",
    "CATEGORY": "Genel Destek",
    "USER_MESSAGE": "Test mesajı içeriği.",
    "ADMIN_REPLY": "Bu bir test yanıtıdır.",
    "ITEMS_LIST": "<tr><td style='padding:15px; border-bottom:1px solid #eee;'>Bravita Özel Koleksiyon x1</td><td align='right' style='padding:15px; border-bottom:1px solid #eee;'>₺1,450.00</td></tr>",
    "TOTAL": "1,450.00",
    "BROWSER_LINK": "#",
    "SITE_URL": "https://www.bravita.com.tr",
    "CONFIRMATION_URL": "https://bravita.com.tr/test-confirm",
    "UNSUBSCRIBE_URL": "https://bravita.com.tr/unsubscribe",
};

function applyPreviewVariables(content: string, values: Record<string, string>): string {
    let output = String(content || "");

    Object.entries(values).forEach(([key, val]) => {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`{{\\s*\\.?\\s*${escapedKey}\\s*}}`, "g");
        output = output.replace(regex, val);
    });

    return output;
}

function buildTemplatePreview(template: Pick<EmailTemplate, "subject" | "content_html">, useSampleData: boolean): { subject: string; html: string } {
    if (!useSampleData) {
        return {
            subject: template.subject || "",
            html: template.content_html || "",
        };
    }

    return {
        subject: applyPreviewVariables(template.subject || "", PREVIEW_DUMMY_VARS),
        html: applyPreviewVariables(template.content_html || "", PREVIEW_DUMMY_VARS),
    };
}

function getDefaultConfigForSlug(templateSlug: string): Pick<EmailConfig, "sender_name" | "sender_email" | "reply_to"> {
    if (templateSlug.startsWith("support_ticket")) {
        return {
            sender_name: "Bravita Destek",
            sender_email: "support@bravita.com.tr",
            reply_to: "support@bravita.com.tr",
        };
    }

    if (templateSlug.startsWith("order_")) {
        return {
            sender_name: "Bravita Sipariş",
            sender_email: "noreply@bravita.com.tr",
            reply_to: null,
        };
    }

    return {
        sender_name: "Bravita",
        sender_email: "noreply@bravita.com.tr",
        reply_to: null,
    };
}

function withRequiredConfigs(templateRows: EmailTemplate[], configRows: EmailConfig[]): EmailConfig[] {
    const mergedConfigs = [...configRows];
    const hasSupportTemplate = templateRows.some((template) => template.slug === SUPPORT_TICKET_SLUG);
    const hasSupportConfig = mergedConfigs.some((config) => config.template_slug === SUPPORT_TICKET_SLUG);

    if (hasSupportTemplate && !hasSupportConfig) {
        const defaults = getDefaultConfigForSlug(SUPPORT_TICKET_SLUG);
        mergedConfigs.push({
            id: `virtual-${SUPPORT_TICKET_SLUG}`,
            template_slug: SUPPORT_TICKET_SLUG,
            sender_name: defaults.sender_name,
            sender_email: defaults.sender_email,
            reply_to: defaults.reply_to,
            is_virtual: true,
        });
    }

    return mergedConfigs.sort((a, b) => a.template_slug.localeCompare(b.template_slug, "tr"));
}

export default function AdminEmails() {
    const { theme } = useAdminTheme();
    const { isSuperAdmin, isLoading: authLoading, session, refreshSession } = useAuth();
    const navigate = useNavigate();
    const isDark = theme === "dark";

    useEffect(() => {
        if (!authLoading && !isSuperAdmin) {
            toast.error("Bu sayfaya erişim yetkiniz yok.");
            navigate("/admin");
        }
    }, [isSuperAdmin, authLoading, navigate]);

    // ... (keep state declarations)
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [configs, setConfigs] = useState<EmailConfig[]>([]);
    const [logs, setLogs] = useState<EmailLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("templates");

    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
    const [editorView, setEditorView] = useState<"raw" | "preview">("raw");
    const [simulateData, setSimulateData] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const [editingConfig, setEditingConfig] = useState<EmailConfig | null>(null);
    const [isConfigEditorOpen, setIsConfigEditorOpen] = useState(false);

    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [testRecipient, setTestRecipient] = useState("");
    const [testTemplate, setTestTemplate] = useState<EmailTemplate | null>(null);
    const [isSendingTest, setIsSendingTest] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!isSuperAdmin) {
                setTemplates([]);
                setConfigs([]);
                setLogs([]);
                return;
            }

            const [tRes, cRes, lRes] = await Promise.all([
                supabase.from("email_templates").select("*").order("name"),
                supabase.from("email_configs").select("*").order("template_slug"),
                supabase.from("email_logs").select("*").order("sent_at", { ascending: false }).limit(50)
            ]);

            if (tRes.error) throw tRes.error;
            if (cRes.error) throw cRes.error;

            const templateRows = tRes.data ?? [];
            const configRows = cRes.data ?? [];

            setTemplates(templateRows);
            setConfigs(withRequiredConfigs(templateRows, configRows));

            if (lRes.error) {
                console.error("Email log load error:", lRes.error);
                toast.error("Gönderim logları yüklenemedi");
                setLogs([]);
            } else {
                const normalizedLogs: EmailLog[] = (lRes.data ?? []).map((row: Record<string, unknown>) => ({
                    id: String(row.id || ""),
                    template_slug: String(row.template_slug || row.email_type || "-"),
                    recipient_email: String(row.recipient_email || row.recipient || "-"),
                    status: String(row.status || (row.blocked ? "failed" : "sent")),
                    sent_at: String(row.sent_at || ""),
                    error_message: row.error_message ? String(row.error_message) : (row.error_details ? String(row.error_details) : null),
                }));

                setLogs(normalizedLogs);
            }
        } catch (error) {
            toast.error("Veriler yüklenirken bir hata oluştu");
        } finally {
            setIsLoading(false);
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        if (!authLoading && isSuperAdmin) {
            loadData();
        }
    }, [authLoading, isSuperAdmin, loadData]);

    const handleSaveTemplate = async () => {
        if (!editingTemplate) return;

        if (!isSuperAdmin) {
            toast.error("Bu işlem için superadmin yetkisi gereklidir.");
            return;
        }

        const templateSlug = String(editingTemplate.slug || "").trim().toLowerCase();
        const requiresAuthSync = AUTH_SYNC_CRITICAL_SLUGS.has(templateSlug);

        try {
            const { data: originalTemplate, error: originalFetchError } = await supabase
                .from("email_templates")
                .select("name, subject, content_html")
                .eq("id", editingTemplate.id)
                .maybeSingle();

            if (originalFetchError) throw originalFetchError;
            if (!originalTemplate) {
                throw new Error("Kaydedilecek mevcut şablon bulunamadı.");
            }

            const { error: updateError } = await supabase
                .from("email_templates")
                .update({
                    name: editingTemplate.name,
                    subject: editingTemplate.subject,
                    content_html: editingTemplate.content_html
                })
                .eq("id", editingTemplate.id);

            if (updateError) throw updateError;

            if (requiresAuthSync) {
                try {
                    const authHeaders = await getFunctionAuthHeaders();
                    const idempotencyKey = `sync-auth-${editingTemplate.id}-${Date.now()}-${crypto.randomUUID()}`;

                    const { data: syncData, error: syncError } = await supabase.functions.invoke("sync-auth-templates", {
                        body: {
                            slugs: [templateSlug],
                            dry_run: false,
                        },
                        headers: {
                            ...authHeaders,
                            "x-idempotency-key": idempotencyKey,
                        },
                    });

                    if (syncError) {
                        let syncReason = syncError.message || "Bilinmeyen senkronizasyon hatası";
                        try {
                            const body = await syncError.context?.json();
                            const nestedMessage = body?.error?.message || body?.message;
                            if (nestedMessage) {
                                syncReason = String(nestedMessage);
                            }
                        } catch {
                            // ignore nested parse errors
                        }

                        throw new Error(syncReason);
                    }

                    if (!syncData?.success) {
                        const syncReason = String(syncData?.error?.message || "Auth template sync başarısız oldu");
                        throw new Error(syncReason);
                    }
                } catch (syncFailure) {
                    const { error: rollbackError } = await supabase
                        .from("email_templates")
                        .update({
                            name: originalTemplate.name,
                            subject: originalTemplate.subject,
                            content_html: originalTemplate.content_html,
                        })
                        .eq("id", editingTemplate.id);

                    if (rollbackError) {
                        console.error("Auth template sync rollback failed:", rollbackError);
                        throw new Error("Auth sync başarısız oldu ve geri alma tamamlanamadı. Lütfen acil olarak teknik ekiple iletişime geçin.");
                    }

                    const reason = syncFailure instanceof Error ? syncFailure.message : "Auth template sync başarısız oldu";
                    throw new Error(`Auth template sync başarısız: ${reason}. Değişiklik geri alındı.`);
                }
            }

            toast.success(requiresAuthSync ? "Şablon güncellendi ve Auth ile senkronlandı" : "Şablon güncellendi");
            setIsEditorOpen(false);
            loadData();
        } catch (error) {
            console.error("Template save error:", error);
            const message = error instanceof Error ? error.message : "Şablon güncellenirken hata oluştu";
            toast.error(message);
        }
    };

    const handleSaveConfig = async () => {
        if (!editingConfig) return;

        try {
            const normalizedReplyTo = editingConfig.reply_to?.trim() ? editingConfig.reply_to.trim() : null;
            const payload = {
                sender_name: editingConfig.sender_name,
                sender_email: editingConfig.sender_email,
                reply_to: normalizedReplyTo,
            };

            if (editingConfig.is_virtual) {
                const { data: existingConfig, error: existingError } = await supabase
                    .from("email_configs")
                    .select("id")
                    .eq("template_slug", editingConfig.template_slug)
                    .order("created_at", { ascending: true })
                    .limit(1)
                    .maybeSingle();

                if (existingError) throw existingError;

                if (existingConfig?.id) {
                    const { error } = await supabase
                        .from("email_configs")
                        .update(payload)
                        .eq("id", existingConfig.id);

                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from("email_configs")
                        .insert({
                            template_slug: editingConfig.template_slug,
                            ...payload,
                            is_active: true,
                        });

                    if (error) throw error;
                }
            } else {
                const { error } = await supabase
                    .from("email_configs")
                    .update(payload)
                    .eq("id", editingConfig.id);

                if (error) throw error;
            }

            toast.success(editingConfig.is_virtual ? "Yapılandırma oluşturuldu" : "Yapılandırma güncellendi");
            setIsConfigEditorOpen(false);
            loadData();
        } catch (error) {
            toast.error("Yapılandırma güncellenirken hata oluştu");
        }
    };

    const handleSendTest = async () => {
        if (!isSuperAdmin) {
            toast.error("Bu işlem için superadmin yetkisi gereklidir.");
            return;
        }

        if (!testTemplate || !testRecipient) return;

        setIsSendingTest(true);
        try {
            let accessToken = session?.access_token ?? null;
            if (!accessToken) {
                await refreshSession();
                const { data: refreshedSessionData } = await supabase.auth.getSession();
                accessToken = refreshedSessionData.session?.access_token ?? null;
            }

            if (!accessToken) {
                throw new Error("Oturum doğrulanamadı. Lütfen çıkış yapıp tekrar giriş yapın.");
            }

            const previewOutput = buildTemplatePreview(testTemplate, simulateData);

            const { data, error } = await supabase.functions.invoke("send-test-email", {
                body: {
                    template_slug: testTemplate.slug,
                    recipient_email: testRecipient,
                    preview_subject: previewOutput.subject,
                    preview_html: previewOutput.html,
                    preview_uses_sample_data: simulateData,
                },
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "x-user-jwt": `Bearer ${accessToken}`,
                },
            });

            if (error) throw error;

            toast.success("Test e-postası gönderildi");
            setIsTestModalOpen(false);
            setTestRecipient("");
            loadData();
        } catch (error: unknown) {
            console.error("Test send error:", error);
            const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
            toast.error(`Gönderim başarısız: ${errorMessage}`);
        } finally {
            setIsSendingTest(false);
        }
    };

    const cardClass = `p-6 rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-md ${isDark
        ? "bg-slate-800/50 border-slate-700 hover:border-orange-500/30"
        : "bg-white border-gray-100 hover:border-orange-500/20"
        }`;

    const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
    const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
    const tableHeaderClass = isDark ? "text-slate-400 border-slate-700" : "text-gray-500 border-gray-100";
    const tableRowClass = isDark ? "border-slate-800 hover:bg-slate-800/30" : "border-gray-50 hover:bg-gray-50/50";

    return (
        <AdminGuard>
            <AdminLayout>
                <Helmet>
                    <title>Admin Emails | Bravita</title>
                    <meta name="description" content="Admin Emails" />
                    <meta name="robots" content="noindex" />
                    <meta property="og:title" content="Admin Emails" />
                    <meta property="og:description" content="Admin Emails" />
                </Helmet>
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className={`text-2xl font-bold ${textPrimary}`}>E-posta Yönetimi</h1>
                            <p className={textSecondary}>Sistem e-postalarını, şablonları ve gönderim loglarını yönetin.</p>
                        </div>
                        <Button className="bg-orange-600 hover:bg-orange-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Yeni Şablon
                        </Button>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList className={`p-1 rounded-xl ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
                            <TabsTrigger value="templates" className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Şablonlar
                            </TabsTrigger>
                            <TabsTrigger value="configs" className="flex items-center gap-2">
                                <Settings className="w-4 h-4" />
                                Yapılandırma
                            </TabsTrigger>
                            <TabsTrigger value="logs" className="flex items-center gap-2">
                                <History className="w-4 h-4" />
                                Gönderim Logları
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="templates" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {templates.map((template) => (
                                    <div key={template.id} className={cardClass}>
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500">
                                                <Mail className="w-6 h-6" />
                                            </div>
                                            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                                                {template.slug}
                                            </Badge>
                                        </div>
                                        <h3 className={`font-bold mb-1 ${textPrimary}`}>{template.name}</h3>
                                        <p className={`text-sm mb-4 line-clamp-1 ${textSecondary}`}>{template.subject}</p>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                className="w-full flex-1"
                                                onClick={() => {
                                                    setEditingTemplate(template);
                                                    setIsEditorOpen(true);
                                                }}
                                            >
                                                <Edit className="w-4 h-4 mr-2" />
                                                Düzenle
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => {
                                                    setTestTemplate(template);
                                                    setIsTestModalOpen(true);
                                                }}
                                                title="Test Gönder"
                                            >
                                                <Send className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="configs">
                            <div className={`${cardClass} overflow-hidden p-0`}>
                                <Table>
                                    <TableHeader>
                                        <TableRow className={tableRowClass}>
                                            <TableHead className={tableHeaderClass}>Şablon Slug</TableHead>
                                            <TableHead className={tableHeaderClass}>Gönderici Adı</TableHead>
                                            <TableHead className={tableHeaderClass}>Gönderici E-posta</TableHead>
                                            <TableHead className={tableHeaderClass}>Yanıt Adresi (Reply-To)</TableHead>
                                            <TableHead className={`text-right ${tableHeaderClass}`}>İşlemler</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {configs.map((config) => (
                                            <TableRow key={config.id} className={tableRowClass}>
                                                <TableCell className={`font-mono text-xs ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                                                    <span>{config.template_slug}</span>
                                                    {config.is_virtual && (
                                                        <span className={`ml-2 text-[10px] ${isDark ? "text-amber-300" : "text-amber-700"}`}>(eksik, oluşturulacak)</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className={textPrimary}>{config.sender_name}</TableCell>
                                                <TableCell className={textPrimary}>{config.sender_email}</TableCell>
                                                <TableCell className={textPrimary}>{config.reply_to || "-"}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={isDark ? "text-slate-400 hover:text-white hover:bg-slate-700" : ""}
                                                        title={config.is_virtual ? "Yapılandırmayı Oluştur" : "Düzenle"}
                                                        onClick={() => {
                                                            setEditingConfig(config);
                                                            setIsConfigEditorOpen(true);
                                                        }}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>

                        <TabsContent value="logs">
                            <div className={`${cardClass} overflow-hidden p-0`}>
                                <Table>
                                    <TableHeader>
                                        <TableRow className={tableRowClass}>
                                            <TableHead className={tableHeaderClass}>Tarih</TableHead>
                                            <TableHead className={tableHeaderClass}>Alıcı</TableHead>
                                            <TableHead className={tableHeaderClass}>Şablon</TableHead>
                                            <TableHead className={tableHeaderClass}>Durum</TableHead>
                                            <TableHead className={`text-right ${tableHeaderClass}`}>Detay</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.map((log) => (
                                            <TableRow key={log.id} className={tableRowClass}>
                                                <TableCell className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>{new Date(log.sent_at).toLocaleString("tr-TR")}</TableCell>
                                                <TableCell className={textPrimary}>{log.recipient_email}</TableCell>
                                                <TableCell className={`font-mono text-[10px] ${isDark ? "text-slate-300" : "text-gray-600"}`}>{log.template_slug}</TableCell>
                                                <TableCell>
                                                    {log.status === "sent" ? (
                                                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                                                            <CheckCircle2 className="w-3 h-3 mr-1" /> Başarılı
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">
                                                            <XCircle className="w-3 h-3 mr-1" /> Hata
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" className={isDark ? "text-slate-400 hover:text-white hover:bg-slate-700" : ""}>
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Template Editor Dialog */}
                <Dialog open={isEditorOpen} onOpenChange={(open) => {
                    setIsEditorOpen(open);
                    if (!open) setEditorView("raw");
                }}>
                    <DialogContent className={`max-w-5xl max-h-[95vh] flex flex-col p-0 overflow-hidden border-none ${isDark ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}>
                        <div className={`p-6 border-b flex items-center justify-between ${isDark ? "border-gray-800" : "border-gray-100"}`}>
                            <div>
                                <DialogTitle className="text-xl font-bold">Şablonu Düzenle: {editingTemplate?.name}</DialogTitle>
                                <DialogDescription className={isDark ? "text-gray-400" : "text-gray-500"}>
                                    HTML içeriğini ve değişkenleri bu alandan düzenleyebilirsiniz.
                                </DialogDescription>
                            </div>
                            <div className={`flex p-1 rounded-xl items-center gap-2 ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
                                <div className="flex bg-white/5 dark:bg-black/20 p-0.5 rounded-lg mr-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditorView("raw")}
                                        className={`rounded-lg px-4 h-8 transition-all text-xs font-bold ${editorView === "raw"
                                            ? "bg-orange-600 text-white shadow-sm hover:bg-orange-700 hover:text-white"
                                            : isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                                            }`}
                                    >
                                        Kod (Raw)
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditorView("preview")}
                                        className={`rounded-lg px-4 h-8 transition-all text-xs font-bold ${editorView === "preview"
                                            ? "bg-orange-600 text-white shadow-sm hover:bg-orange-700 hover:text-white"
                                            : isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                                            }`}
                                    >
                                        Önizleme
                                    </Button>
                                </div>
                                {editorView === "preview" && (
                                    <div className="flex items-center gap-2 pr-2 border-l border-gray-200 dark:border-gray-700 pl-4">
                                        <Label className="text-[10px] uppercase font-bold text-gray-400 cursor-pointer" htmlFor="sim-toggle">Örnek Veri</Label>
                                        <input
                                            id="sim-toggle"
                                            type="checkbox"
                                            checked={simulateData}
                                            onChange={(e) => setSimulateData(e.target.checked)}
                                            className="w-4 h-4 accent-orange-600 cursor-pointer rounded"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
                            {editingTemplate && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <Label className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"}`}>Şablon Adı</Label>
                                            <Input
                                                className={`h-12 rounded-xl border-none ring-1 transition-all focus:ring-2 focus:ring-orange-500/50 ${isDark
                                                    ? "bg-slate-800 text-slate-100 ring-slate-700 focus:bg-slate-700"
                                                    : "bg-gray-50 text-gray-950 ring-gray-200 focus:bg-white"
                                                    }`}
                                                value={editingTemplate.name}
                                                onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-gray-400"}`}>Konu (Subject)</Label>
                                            <Input
                                                className={`h-12 rounded-xl border-none ring-1 transition-all focus:ring-2 focus:ring-orange-500/50 ${isDark
                                                    ? "bg-slate-800 text-slate-100 ring-slate-700 focus:bg-slate-700"
                                                    : "bg-gray-50 text-gray-950 ring-gray-200 focus:bg-white"
                                                    }`}
                                                value={editingTemplate.subject}
                                                onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {editorView === "raw" ? (
                                        <div className="space-y-3">
                                            <Label className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-gray-400"}`}>HTML İçeriği</Label>
                                            <div className={`p-1 rounded-2xl ring-1 ${isDark ? "ring-slate-700 bg-slate-800" : "ring-gray-200 bg-gray-50"}`}>
                                                <Textarea
                                                    className={`font-mono text-[13px] h-125 border-none bg-transparent resize-none leading-relaxed focus:ring-0 p-4 ${isDark ? "text-orange-100" : "text-gray-800"
                                                        }`}
                                                    value={editingTemplate.content_html}
                                                    onChange={(e) => setEditingTemplate({ ...editingTemplate, content_html: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <Label className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"}`}>Görünüm Önizleme</Label>
                                            <div className="border border-gray-200 dark:border-gray-700 rounded-3xl overflow-hidden bg-white h-125 shadow-2xl">
                                                <iframe
                                                    title="Email Preview"
                                                    className="w-full h-full border-none"
                                                    srcDoc={buildTemplatePreview(editingTemplate, simulateData).html}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <Label className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"}`}>Kullanılabilir Değişkenler</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {editingTemplate.variables.map(v => (
                                                <Badge key={v} variant="secondary" className={`px-4 py-2 rounded-lg font-mono text-xs border-none ${isDark ? "bg-orange-500/10 text-orange-400" : "bg-orange-50 text-orange-600"
                                                    }`}>
                                                    {"{{" + v + "}}"}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={`p-6 border-t flex gap-4 justify-end ${isDark ? "border-slate-800 bg-slate-900/50" : "border-gray-100 bg-gray-50/50"}`}>
                            <Button variant="outline" className={`px-8 h-12 rounded-xl font-semibold ${isDark ? "border-slate-700 hover:bg-slate-800 text-slate-300" : ""}`} onClick={() => setIsEditorOpen(false)}>İptal</Button>
                            <Button className="bg-orange-600 hover:bg-orange-700 px-10 h-12 rounded-xl font-bold text-white shadow-xl shadow-orange-600/20 active:scale-95 transition-all" onClick={handleSaveTemplate}>Güncelle ve Kaydet</Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Config Editor Dialog */}
                <Dialog open={isConfigEditorOpen} onOpenChange={setIsConfigEditorOpen}>
                    <DialogContent className={`max-w-xl border-none ${isDark ? "bg-slate-900 text-slate-100 shadow-2xl ring-1 ring-slate-800" : "bg-white text-gray-900"}`}>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">
                                {editingConfig?.is_virtual ? "Yapılandırma Oluştur" : "Yapılandırmayı Düzenle"}
                            </DialogTitle>
                            <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
                                <strong>{editingConfig?.template_slug}</strong> şablonu için gönderen bilgilerini
                                {editingConfig?.is_virtual ? " ilk kez kaydedin." : " güncelleyin."}
                            </DialogDescription>
                        </DialogHeader>

                        {editingConfig && (
                            <div className="space-y-6 py-4">
                                <div className="space-y-2">
                                    <Label className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-gray-400"}`}>Gönderici Adı</Label>
                                    <Input
                                        className={`h-11 rounded-xl border-none ring-1 ${isDark ? "bg-slate-800 ring-slate-700 text-slate-100" : "bg-gray-50 ring-gray-100"}`}
                                        value={editingConfig.sender_name}
                                        onChange={(e) => setEditingConfig({ ...editingConfig, sender_name: e.target.value })}
                                        placeholder="Örn: Bravita Destek"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-gray-400"}`}>Gönderici E-posta</Label>
                                    <Input
                                        className={`h-11 rounded-xl border-none ring-1 ${isDark ? "bg-slate-800 ring-slate-700 text-slate-100" : "bg-gray-50 ring-gray-100"}`}
                                        value={editingConfig.sender_email}
                                        onChange={(e) => setEditingConfig({ ...editingConfig, sender_email: e.target.value })}
                                        placeholder="noreply@bravita.com.tr"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-gray-400"}`}>Yanıt Adresi (Reply-To)</Label>
                                    <Input
                                        className={`h-11 rounded-xl border-none ring-1 ${isDark ? "bg-slate-800 ring-slate-700 text-slate-100" : "bg-gray-50 ring-gray-100"}`}
                                        value={editingConfig.reply_to || ""}
                                        onChange={(e) => setEditingConfig({ ...editingConfig, reply_to: e.target.value })}
                                        placeholder="support@bravita.com.tr (Opsiyonel)"
                                    />
                                </div>
                            </div>
                        )}

                        <DialogFooter className={`pt-6 border-t mt-4 flex gap-3 ${isDark ? "border-slate-800" : "border-gray-100"}`}>
                            <Button variant="outline" className={`px-6 rounded-xl ${isDark ? "border-slate-700 hover:bg-slate-800 text-slate-300" : ""}`} onClick={() => setIsConfigEditorOpen(false)}>İptal</Button>
                            <Button className="bg-orange-600 hover:bg-orange-700 px-8 rounded-xl font-bold text-white shadow-xl shadow-orange-600/20" onClick={handleSaveConfig}>Değişiklikleri Kaydet</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Test Email Dialog */}
                <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
                    <DialogContent className={`border-none ${isDark ? "bg-slate-900 text-slate-100 shadow-2xl ring-1 ring-slate-800" : ""}`}>
                        <DialogHeader>
                            <DialogTitle>Test E-posta Gönder</DialogTitle>
                            <DialogDescription className={isDark ? "text-slate-400" : ""}>
                                <strong>{testTemplate?.name}</strong> şablonunu test etmek için bir alıcı adresi girin.
                            </DialogDescription>
                        </DialogHeader>
                        <div className={`space-y-6 py-4 ${isDark ? "bg-slate-900/50" : "bg-white"}`}>
                            <div className="space-y-2">
                                <Label className={isDark ? "text-slate-300" : ""}>Alıcı E-posta</Label>
                                <Input
                                    type="email"
                                    placeholder="ornek@mail.com"
                                    value={testRecipient}
                                    onChange={(e) => setTestRecipient(e.target.value)}
                                    className={`h-12 rounded-xl border-none ring-1 transition-all ${isDark
                                        ? "bg-slate-800 text-slate-100 ring-slate-700 focus:ring-orange-500"
                                        : "bg-gray-50 text-gray-900 ring-gray-200 focus:ring-orange-500"
                                        }`}
                                />
                            </div>
                            <p className={`text-[11px] italic ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                * Test e-postası, editörde gördüğünüz önizleme çıktısı ile aynı içerikle gönderilir. "Örnek Veri" açıksa dummy veri uygulanır.
                            </p>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsTestModalOpen(false)}>İptal</Button>
                            <Button
                                className="bg-orange-600 hover:bg-orange-700"
                                onClick={handleSendTest}
                                disabled={isSendingTest || !testRecipient}
                            >
                                {isSendingTest ? "Gönderiliyor..." : "Test Maili Gönder"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </AdminLayout>
        </AdminGuard>
    );
}
