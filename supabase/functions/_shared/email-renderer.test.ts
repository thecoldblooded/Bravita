// @ts-nocheck
import { normalizeTokenKey, renderTemplate } from "./email-renderer.ts";

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
    if (actual !== expected) {
        throw new Error(`${message} | expected=${String(expected)} actual=${String(actual)}`);
    }
}

Deno.test("normalizeTokenKey normalizes legacy token styles", () => {
    assertEqual(normalizeTokenKey(" ConfirmationURL "), "CONFIRMATION_URL", "camelCase token should normalize");
    assertEqual(normalizeTokenKey(".UnsubscribeURL"), "UNSUBSCRIBE_URL", "dot-prefixed token should normalize");
    assertEqual(normalizeTokenKey("order-id"), "ORDER_ID", "dash token should normalize");
});

Deno.test("renderTemplate test mode warns unresolved tokens but does not block", () => {
    const result = renderTemplate({
        template: {
            slug: "order_confirmation",
            subject: "Sipariş {{ORDER_ID}} / {{MISSING_TOKEN}}",
            content_html: "<a href=\"{{BROWSER_LINK}}\">Aç</a><div>{{MISSING_TOKEN}}</div>",
            unresolved_policy: "block",
            is_auth_critical: false,
        },
        mode: "test",
        variables: {
            ORDER_ID: "TEST-1001",
            BROWSER_LINK: "javascript:alert(1)",
        },
        variablePolicies: {
            BROWSER_LINK: { key: "BROWSER_LINK", render_policy: "url" },
        },
    });

    assertEqual(result.blocked, false, "test mode should not block");
    assert(result.unresolvedTokens.includes("MISSING_TOKEN"), "missing token should be reported");
    assert(result.warnings.length > 0, "warning should be produced in test mode");
    assert(result.html.includes('href="#"'), "unsafe URL should be sanitized to #");
});

Deno.test("renderTemplate send mode blocks unresolved tokens", () => {
    const result = renderTemplate({
        template: {
            slug: "support_ticket",
            subject: "{{SUBJECT}}",
            content_html: "<p>{{USER_MESSAGE}}</p><p>{{ADMIN_REPLY}}</p>",
            unresolved_policy: "block",
            is_auth_critical: false,
        },
        mode: "send",
        variables: {
            SUBJECT: "Merhaba",
            USER_MESSAGE: "İçerik",
        },
    });

    assertEqual(result.blocked, true, "send mode should block unresolved tokens");
    assert(result.unresolvedTokens.includes("ADMIN_REPLY"), "missing ADMIN_REPLY should remain unresolved");
});

Deno.test("renderTemplate applies auth-critical allowlist fallback", () => {
    const result = renderTemplate({
        template: {
            slug: "confirm_signup",
            subject: "Hesabını doğrula",
            content_html: "<a href=\"{{CONFIRMATION_URL}}\">Doğrula</a>",
            unresolved_policy: "allowlist_fallback",
            is_auth_critical: true,
            allowlist_fallback_keys: ["CONFIRMATION_URL"],
        },
        mode: "send",
        variables: {},
        fallbackValues: {
            CONFIRMATION_URL: "https://www.bravita.com.tr/confirm",
        },
    });

    assertEqual(result.blocked, false, "allowlisted unresolved token should not block send");
    assertEqual(result.degradation.active, true, "degradation should be marked active");
    assert(result.warnings.some((w) => w.includes("fallback")), "fallback warning should exist");
    assert(result.html.includes("https://www.bravita.com.tr/confirm"), "fallback URL should be rendered");
});

Deno.test("renderTemplate respects raw_html policy", () => {
    const result = renderTemplate({
        template: {
            slug: "order_confirmation",
            subject: "Sipariş özeti",
            content_html: "<table>{{ITEMS_LIST}}</table>",
            unresolved_policy: "block",
            is_auth_critical: false,
        },
        mode: "send",
        variables: {
            ITEMS_LIST: "<tr><td>Ürün</td></tr>",
        },
        variablePolicies: {
            ITEMS_LIST: { key: "ITEMS_LIST", render_policy: "raw_html" },
        },
    });

    assert(result.html.includes("<tr><td>Ürün</td></tr>"), "raw_html should not be escaped");
});
