import { sanitizeEmailHtmlForPreview, sanitizePreviewUrl } from "./emailHtmlSanitizer";

function parseHtmlFragment(html: string): Document {
    return new DOMParser().parseFromString(html, "text/html");
}

describe("sanitizeEmailHtmlForPreview", () => {
    it("script tag payloadlarını temizler", () => {
        const dirty = `<div>Merhaba</div><script>alert('xss')</script>`;

        const clean = sanitizeEmailHtmlForPreview(dirty);

        expect(clean.toLowerCase()).not.toContain("<script");
        expect(clean).toContain("Merhaba");
    });

    it("inline event handler attribute'larını temizler", () => {
        const dirty = `<img src="/safe.png" onerror="alert(1)"><a href="#" onclick="alert(2)">Tıkla</a>`;

        const clean = sanitizeEmailHtmlForPreview(dirty);

        expect(clean.toLowerCase()).not.toContain("onerror=");
        expect(clean.toLowerCase()).not.toContain("onclick=");
    });

    it("javascript: ve data:text/html URL payload'larını nötralize eder", () => {
        const dirty = `<a href="javascript:alert(1)">Kötü link</a><img src="data:text/html,<script>alert(2)</script>">`;

        const clean = sanitizeEmailHtmlForPreview(dirty);
        const doc = parseHtmlFragment(clean);

        const anchor = doc.querySelector("a");
        const image = doc.querySelector("img");

        expect(anchor?.getAttribute("href") ?? "#").toBe("#");
        expect(image?.getAttribute("src") ?? "#").toBe("#");
    });

    it("güvenli URL'leri korur", () => {
        const dirty = `<a href="https://www.bravita.com.tr">Bravita</a><a href="/yardim">Yardım</a><a href="mailto:support@bravita.com.tr">E-posta</a>`;

        const clean = sanitizeEmailHtmlForPreview(dirty);
        const doc = parseHtmlFragment(clean);
        const links = Array.from(doc.querySelectorAll("a"));

        expect(links[0]?.getAttribute("href")).toBe("https://www.bravita.com.tr");
        expect(links[1]?.getAttribute("href")).toBe("/yardim");
        expect(links[2]?.getAttribute("href")).toBe("mailto:support@bravita.com.tr");
    });
});

describe("sanitizePreviewUrl", () => {
    it("tehlikeli protokolleri # ile değiştirir", () => {
        expect(sanitizePreviewUrl("javascript:alert(1)")).toBe("#");
        expect(sanitizePreviewUrl("data:text/html,<script>alert(1)</script>")).toBe("#");
    });

    it("izinli protokolleri ve relative URL'leri olduğu gibi bırakır", () => {
        expect(sanitizePreviewUrl("https://www.bravita.com.tr")).toBe("https://www.bravita.com.tr");
        expect(sanitizePreviewUrl("mailto:support@bravita.com.tr")).toBe("mailto:support@bravita.com.tr");
        expect(sanitizePreviewUrl("/iletisim")).toBe("/iletisim");
    });
});
