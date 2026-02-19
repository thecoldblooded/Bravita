export type RenderMode = "send" | "test" | "browser_preview";

export interface EmailTemplateRecord {
    slug: string;
    subject: string;
    content_html: string;
    content_text?: string | null;
    version?: number | null;
    is_auth_critical?: boolean | null;
    unresolved_policy?: "block" | "warn" | "allowlist_fallback" | string | null;
    allowlist_fallback_keys?: string[] | null;
    variables?: unknown;
}

export interface EmailConfigRecord {
    sender_name?: string | null;
    sender_email?: string | null;
    reply_to?: string | null;
}

export interface EmailVariablePolicy {
    key: string;
    render_policy?: "escaped_text" | "raw_html" | "url" | string;
    value_type?: string;
}

export interface RenderTemplateInput {
    template: EmailTemplateRecord;
    mode: RenderMode;
    variables: Record<string, unknown>;
    variablePolicies?: Record<string, EmailVariablePolicy>;
    fallbackValues?: Record<string, string>;
}

export interface RenderTemplateOutput {
    subject: string;
    html: string;
    text: string;
    unresolvedTokens: string[];
    warnings: string[];
    usedVariables: string[];
    blocked: boolean;
    degradation: {
        active: boolean;
        reason: string | null;
    };
}

const TOKEN_REGEX = /\{\{\s*\.?\s*([A-Za-z0-9_]+)\s*\}\}/g;

export function normalizeTokenKey(rawKey: string): string {
    const cleaned = String(rawKey ?? "").trim().replace(/^\.+/, "");
    if (!cleaned) return "";

    return cleaned
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/[^A-Za-z0-9_]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")
        .toUpperCase();
}

export function escapeHtml(value: unknown): string {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
        const entityMap: Record<string, string> = {
            "&": "\u0026amp;",
            "<": "\u0026lt;",
            ">": "\u0026gt;",
            '"': "\u0026quot;",
            "'": "\u0026#39;",
        };
        return entityMap[char] ?? char;
    });
}

function sanitizeUrl(value: string): string {
    const raw = String(value ?? "").trim();
    if (!raw) return "#";

    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("/") || raw.startsWith("#") || raw.startsWith("mailto:")) return raw;

    return "#";
}

const BRAVITA_SITE_URL = "https://www.bravita.com.tr";
const BRAVITA_SUPPORT_EMAIL = "support@bravita.com.tr";

function resolveTemplateEmoji(slug: string): string {
    const normalizedSlug = String(slug || "").toLowerCase();

    if (normalizedSlug.includes("confirm_signup") || normalizedSlug.includes("reset_password") || normalizedSlug.includes("password_changed")) {
        return "🔐";
    }
    if (normalizedSlug.includes("welcome")) return "🎉";
    if (normalizedSlug.includes("support_ticket_closed")) return "✅";
    if (normalizedSlug.includes("support_ticket_replied")) return "💬";
    if (normalizedSlug.includes("support_ticket")) return "🎫";
    if (normalizedSlug.includes("order_shipped")) return "🚚";
    if (normalizedSlug.includes("order_delivered")) return "🎁";
    if (normalizedSlug.includes("order_cancelled")) return "❌";
    if (normalizedSlug.includes("order_processing")) return "⚙️";
    if (normalizedSlug.includes("order_preparing")) return "📦";
    if (normalizedSlug.includes("order_awaiting_payment")) return "💳";
    if (normalizedSlug.includes("order_confirmation")) return "🧾";

    return "✉️";
}

function extractStyleBlocks(content: string): string {
    const matches = String(content ?? "").match(/<style[^>]*>[\s\S]*?<\/style>/gi);
    return matches ? matches.join("\n") : "";
}

function extractBodyContent(content: string): string {
    const raw = String(content ?? "").trim();
    if (!raw) return "";

    const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch?.[1]) {
        return bodyMatch[1].trim();
    }

    return raw
        .replace(/<!doctype[^>]*>/gi, "")
        .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
        .replace(/<html[^>]*>/gi, "")
        .replace(/<\/html>/gi, "")
        .replace(/<body[^>]*>/gi, "")
        .replace(/<\/body>/gi, "")
        .trim();
}

function buildUnifiedBravitaLayout(params: {
    templateSlug: string;
    subject: string;
    renderedHtml: string;
    values: Record<string, string>;
}): string {
    const { templateSlug, subject, renderedHtml, values } = params;

    const sanitizedSiteUrl = sanitizeUrl(values.SITE_URL || BRAVITA_SITE_URL);
    const siteUrl = sanitizedSiteUrl === "#" ? BRAVITA_SITE_URL : sanitizedSiteUrl.replace(/\/+$/, "");
    const logoUrl = `${siteUrl}/logo.png`;

    const browserLink = sanitizeUrl(values.BROWSER_LINK || "");
    const browserLine = browserLink === "#"
        ? "E-postayı görüntülemekte sorun mu yaşıyorsunuz? Tarayıcıda açın."
        : `E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="${escapeHtml(browserLink)}" style="color:#ea580c;text-decoration:none;font-weight:700;">Tarayıcıda açın</a>`;

    const confirmationUrl = sanitizeUrl(values.CONFIRMATION_URL || "");
    const showConfirmationLine = confirmationUrl !== "#";
    const emoji = resolveTemplateEmoji(templateSlug);

    const preservedStyles = extractStyleBlocks(renderedHtml);
    const contentBody = extractBodyContent(renderedHtml) || renderedHtml;

    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(subject)}</title>
<style>
    body {
        margin: 0;
        padding: 0;
        background-color: #fffbf7;
        font-family: 'Baloo 2', 'Nunito', Arial, sans-serif;
        color: #1f2937;
    }

    .brv-shell {
        width: 100%;
        border-collapse: collapse;
        background-color: #fffbf7;
    }

    .brv-card {
        width: 100%;
        max-width: 640px;
        border-collapse: separate;
        border-spacing: 0;
        background: #ffffff;
        border: 1px solid #f5e7dd;
        border-radius: 22px;
        overflow: hidden;
    }

    .brv-muted {
        color: #6b7280;
        font-size: 13px;
        line-height: 1.55;
        margin: 0;
    }

    .brv-footer-link {
        color: #ea580c;
        text-decoration: none;
        font-weight: 700;
    }

    .brv-main-content table {
        max-width: 100%;
    }
</style>
${preservedStyles}
</head>
<body>
<table role="presentation" class="brv-shell" cellspacing="0" cellpadding="0" border="0">
    <tr>
        <td align="center" style="padding: 36px 14px;">
            <table role="presentation" class="brv-card" cellspacing="0" cellpadding="0" border="0">
                <tr>
                    <td style="padding: 24px 30px; border-bottom: 1px solid #f8ece3;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td align="left" valign="middle">
                                    <a href="${escapeHtml(siteUrl)}" style="text-decoration:none;">
                                        <img src="${escapeHtml(logoUrl)}" alt="Bravita" style="display:block; height:34px; width:auto; border:0;" />
                                    </a>
                                </td>
                                <td align="right" valign="middle" style="font-size:28px; line-height:1;">${emoji}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 18px 30px 0;">
                        <p class="brv-muted">${browserLine}</p>
                    </td>
                </tr>
                ${showConfirmationLine ? `
                <tr>
                    <td style="padding: 10px 30px 0;">
                        <p class="brv-muted" style="margin-bottom: 4px;">Link çalışmıyor mu? Bunu deneyin:</p>
                        <p class="brv-muted" style="word-break: break-all;">
                            <a href="${escapeHtml(confirmationUrl)}" style="color:#ea580c; text-decoration:none;">${escapeHtml(confirmationUrl)}</a>
                        </p>
                    </td>
                </tr>
                ` : ""}
                <tr>
                    <td class="brv-main-content" style="padding: 24px 30px 20px;">
                        ${contentBody}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 18px 30px; background:#fff8f1; border-top:1px solid #f8ece3;">
                        <p class="brv-muted" style="margin-bottom: 8px;">
                            Sorularınız mı var? Bize ulaşın:
                            <a href="mailto:${BRAVITA_SUPPORT_EMAIL}" class="brv-footer-link">${BRAVITA_SUPPORT_EMAIL}</a>
                        </p>
                        <p class="brv-muted">© 2026 Bravita. Tüm hakları saklıdır.</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>`;
}

function toTextFromHtml(html: string): string {
    return String(html ?? "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function extractTokens(content: string): string[] {
    if (!content) return [];

    const found: string[] = [];
    const regex = new RegExp(TOKEN_REGEX.source, "g");
    let match: RegExpExecArray | null = null;

    while ((match = regex.exec(content)) !== null) {
        const normalized = normalizeTokenKey(match[1]);
        if (normalized) found.push(normalized);
    }

    return found;
}

function normalizeValueMap(values: Record<string, unknown>): Record<string, string> {
    const mapped: Record<string, string> = {};

    Object.entries(values || {}).forEach(([key, value]) => {
        const normalizedKey = normalizeTokenKey(key);
        if (!normalizedKey) return;
        mapped[normalizedKey] = value == null ? "" : String(value);
    });

    return mapped;
}

function normalizePolicyMap(variablePolicies?: Record<string, EmailVariablePolicy>): Record<string, EmailVariablePolicy> {
    const mapped: Record<string, EmailVariablePolicy> = {};

    Object.entries(variablePolicies || {}).forEach(([key, policy]) => {
        const normalizedKey = normalizeTokenKey(key);
        if (!normalizedKey) return;
        mapped[normalizedKey] = {
            key: normalizedKey,
            render_policy: policy?.render_policy || "escaped_text",
            value_type: policy?.value_type || "string",
        };
    });

    return mapped;
}

function renderByPolicy(params: {
    key: string;
    value: string;
    channel: "subject" | "html" | "text";
    policies: Record<string, EmailVariablePolicy>;
}): string {
    const { key, value, channel, policies } = params;

    if (channel === "subject" || channel === "text") {
        return escapeHtml(value);
    }

    const policy = policies[key]?.render_policy || "escaped_text";

    if (policy === "raw_html") return value;
    if (policy === "url") return escapeHtml(sanitizeUrl(value));

    return escapeHtml(value);
}

function fallbackForKey(key: string): string {
    if (key.endsWith("_URL") || key === "BROWSER_LINK" || key === "SITE_URL") return "#";
    if (key === "NAME") return "Müşterimiz";
    return "";
}

function renderChannel(params: {
    content: string;
    channel: "subject" | "html" | "text";
    values: Record<string, string>;
    policies: Record<string, EmailVariablePolicy>;
}): string {
    const { content, channel, values, policies } = params;

    return String(content ?? "").replace(TOKEN_REGEX, (_fullMatch: string, rawKey: string) => {
        const key = normalizeTokenKey(rawKey);
        if (!key) return "";

        const value = values[key];
        if (value == null) return `{{${key}}}`;

        return renderByPolicy({ key, value, channel, policies });
    });
}

export function renderTemplate(input: RenderTemplateInput): RenderTemplateOutput {
    const { template, mode, variables, variablePolicies, fallbackValues } = input;

    const normalizedValues = normalizeValueMap(variables || {});
    const normalizedPolicies = normalizePolicyMap(variablePolicies);

    const usedVariables = Array.from(
        new Set([
            ...extractTokens(template.subject || ""),
            ...extractTokens(template.content_html || ""),
            ...extractTokens(template.content_text || ""),
        ]),
    );

    const unresolvedBeforePolicy = usedVariables.filter((key) => normalizedValues[key] == null);

    const warnings: string[] = [];
    const valuesForRender: Record<string, string> = { ...normalizedValues };

    const unresolvedPolicy = String(template.unresolved_policy || "block");
    const allowlist = new Set(
        (template.allowlist_fallback_keys || []).map((key) => normalizeTokenKey(key)).filter(Boolean),
    );

    let unresolvedAfterPolicy = [...unresolvedBeforePolicy];
    let degradationActive = false;
    let degradationReason: string | null = null;

    if (mode === "send" && template.is_auth_critical && unresolvedPolicy === "allowlist_fallback") {
        const unresolvedBlocked: string[] = [];

        unresolvedAfterPolicy.forEach((key) => {
            if (allowlist.has(key)) {
                valuesForRender[key] = fallbackValues?.[key] ?? fallbackForKey(key);
                degradationActive = true;
            } else {
                unresolvedBlocked.push(key);
            }
        });

        unresolvedAfterPolicy = unresolvedBlocked;

        if (degradationActive) {
            degradationReason = "auth_critical_allowlist_fallback_applied";
            warnings.push("Auth-kritik fallback uygulandı: allowlist tokenları güvenli varsayılanlarla render edildi.");
        }
    }

    if (mode === "test" || mode === "browser_preview") {
        if (unresolvedAfterPolicy.length > 0) {
            warnings.push(
                `Çözülemeyen tokenlar: ${unresolvedAfterPolicy.join(", ")}. Test modunda gönderim bloklanmadı.`,
            );
        }
    }

    const blocked = mode === "send" && unresolvedAfterPolicy.length > 0;

    if (blocked) {
        warnings.push(`Gönderim bloklandı. Çözülemeyen tokenlar: ${unresolvedAfterPolicy.join(", ")}`);
    }

    const renderedSubject = renderChannel({
        content: template.subject || "",
        channel: "subject",
        values: valuesForRender,
        policies: normalizedPolicies,
    });

    const renderedHtml = renderChannel({
        content: template.content_html || "",
        channel: "html",
        values: valuesForRender,
        policies: normalizedPolicies,
    });

    const rawTextTemplate = template.content_text || "";
    const renderedTextFromTemplate = rawTextTemplate
        ? renderChannel({
            content: rawTextTemplate,
            channel: "text",
            values: valuesForRender,
            policies: normalizedPolicies,
        })
        : "";

    // Admin panelinde kaydedilen HTML içerik source-of-truth'tür; otomatik wrapper eklenmez.
    const finalHtml = renderedHtml;

    const text = renderedTextFromTemplate || toTextFromHtml(finalHtml);

    return {
        subject: renderedSubject,
        html: finalHtml,
        text,
        unresolvedTokens: unresolvedAfterPolicy,
        warnings,
        usedVariables,
        blocked,
        degradation: {
            active: degradationActive,
            reason: degradationReason,
        },
    };
}

export async function fetchTemplateBundle(
    supabase: any,
    templateSlug: string,
): Promise<{
    template: EmailTemplateRecord;
    config: EmailConfigRecord | null;
    variablePolicies: Record<string, EmailVariablePolicy>;
}> {
    const { data: template, error: templateError } = await supabase
        .from("email_templates")
        .select("*")
        .eq("slug", templateSlug)
        .single();

    if (templateError || !template) {
        throw new Error(`Template not found for slug: ${templateSlug}`);
    }

    const { data: config } = await supabase
        .from("email_configs")
        .select("*")
        .eq("template_slug", templateSlug)
        .limit(1)
        .maybeSingle();

    const variablePolicies = await fetchVariablePoliciesForTemplate(supabase, templateSlug, template);

    return {
        template,
        config: config ?? null,
        variablePolicies,
    };
}

async function fetchVariablePoliciesForTemplate(
    supabase: any,
    templateSlug: string,
    template: EmailTemplateRecord,
): Promise<Record<string, EmailVariablePolicy>> {
    const policyMap: Record<string, EmailVariablePolicy> = {};

    let variableKeys: string[] = [];

    try {
        const { data: templateVars, error: templateVarsError } = await supabase
            .from("email_template_variables")
            .select("variable_key, is_enabled, insertion_order")
            .eq("template_slug", templateSlug)
            .eq("is_enabled", true)
            .order("insertion_order", { ascending: true });

        if (!templateVarsError && Array.isArray(templateVars)) {
            variableKeys = templateVars
                .map((item: any) => normalizeTokenKey(item?.variable_key || ""))
                .filter(Boolean);
        }
    } catch {
        // Backward compatibility: table may not exist before migration.
    }

    if (variableKeys.length === 0 && Array.isArray(template?.variables)) {
        variableKeys = (template.variables as unknown[])
            .map((item) => normalizeTokenKey(String(item ?? "")))
            .filter(Boolean);
    }

    const contentDiscovered = [
        ...extractTokens(template.subject || ""),
        ...extractTokens(template.content_html || ""),
        ...extractTokens(template.content_text || ""),
    ];

    variableKeys = Array.from(new Set([...variableKeys, ...contentDiscovered]));

    if (variableKeys.length === 0) return policyMap;

    try {
        const { data: registryRows, error: registryError } = await supabase
            .from("email_variable_registry")
            .select("key, render_policy, value_type, is_active")
            .in("key", variableKeys);

        if (!registryError && Array.isArray(registryRows)) {
            registryRows.forEach((row: any) => {
                const key = normalizeTokenKey(row?.key || "");
                if (!key) return;

                policyMap[key] = {
                    key,
                    render_policy: row?.render_policy || "escaped_text",
                    value_type: row?.value_type || "string",
                };
            });
        }
    } catch {
        // Backward compatibility: table may not exist before migration.
    }

    variableKeys.forEach((key) => {
        if (!policyMap[key]) {
            policyMap[key] = {
                key,
                render_policy: key.endsWith("_URL") || key === "BROWSER_LINK" || key === "SITE_URL" ? "url" : "escaped_text",
                value_type: "string",
            };
        }
    });

    return policyMap;
}
