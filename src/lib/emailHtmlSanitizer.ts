import DOMPurify from "dompurify";

const URL_ATTRIBUTES = ["href", "src", "xlink:href", "action", "formaction", "poster"] as const;
const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:", "cid:", "ftp:", "ftps:"]);
const SAFE_DATA_IMAGE_PATTERN = /^data:image\/(?:bmp|gif|jpeg|jpg|png|svg\+xml|webp)(?:;|,)/i;
const BLOCKED_SCHEME_PATTERN = /^(?:javascript|vbscript):/i;
const BLOCKED_DATA_HTML_PATTERN = /^data:text\/html/i;
const WHOLE_DOCUMENT_PATTERN = /<\s*(?:!doctype|html|head|body)\b/i;

const DOMPURIFY_OPTIONS = {
    WHOLE_DOCUMENT: true,
    RETURN_TRUSTED_TYPE: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "base"],
    FORBID_ATTR: ["srcdoc"],
};

function isWholeDocumentHtml(input: string): boolean {
    return WHOLE_DOCUMENT_PATTERN.test(input);
}

function stripUnsafeAsciiControlsAndWhitespace(value: string): string {
    let normalized = "";

    for (const char of value) {
        const code = char.charCodeAt(0);
        if (code <= 31 || code === 127 || char.trim().length === 0) {
            continue;
        }

        normalized += char;
    }

    return normalized;
}

export function sanitizePreviewUrl(value: string): string {
    const raw = String(value ?? "").trim();
    if (!raw) return "";

    if (
        raw.startsWith("#")
        || raw.startsWith("/")
        || raw.startsWith("?")
        || raw.startsWith("./")
        || raw.startsWith("../")
    ) {
        return raw;
    }

    const normalized = stripUnsafeAsciiControlsAndWhitespace(raw);
    if (BLOCKED_SCHEME_PATTERN.test(normalized) || BLOCKED_DATA_HTML_PATTERN.test(normalized)) {
        return "#";
    }

    if (SAFE_DATA_IMAGE_PATTERN.test(normalized)) {
        return raw;
    }

    try {
        const parsed = new URL(raw, "https://preview.bravita.local");
        if (ALLOWED_PROTOCOLS.has(parsed.protocol.toLowerCase())) {
            return raw;
        }
    } catch {
        return "#";
    }

    return "#";
}

function enforceSafeUrlAttributes(document: Document): void {
    const selector = URL_ATTRIBUTES.map((attribute) => `[${attribute.replace(":", "\\:")}]`).join(",");

    document.querySelectorAll(selector).forEach((element) => {
        URL_ATTRIBUTES.forEach((attribute) => {
            const current = element.getAttribute(attribute);
            if (current === null) return;
            element.setAttribute(attribute, sanitizePreviewUrl(current));
        });
    });
}

function stripMetaRefresh(document: Document): void {
    document.querySelectorAll("meta[http-equiv]").forEach((meta) => {
        const httpEquiv = meta.getAttribute("http-equiv");
        if (httpEquiv && httpEquiv.trim().toLowerCase() === "refresh") {
            meta.remove();
        }
    });
}

export function sanitizeEmailHtmlForPreview(input: string): string {
    const dirtyInput = String(input ?? "");
    if (!dirtyInput.trim()) return "";

    const purified = DOMPurify.sanitize(dirtyInput, DOMPURIFY_OPTIONS);
    const parser = new DOMParser();
    const sanitizedDocument = parser.parseFromString(String(purified), "text/html");

    stripMetaRefresh(sanitizedDocument);
    enforceSafeUrlAttributes(sanitizedDocument);

    if (isWholeDocumentHtml(dirtyInput)) {
        const serialized = sanitizedDocument.documentElement?.outerHTML ?? "";
        if (!serialized) return "";
        return /^\s*<!doctype/i.test(dirtyInput) ? `<!DOCTYPE html>\n${serialized}` : serialized;
    }

    return sanitizedDocument.body?.innerHTML ?? "";
}
