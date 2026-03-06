import { detectSuspiciousValue } from "../../api/auth/_shared.js";

describe("detectSuspiciousValue", () => {
    it("WAF raporundaki script payloadlarını yakalar", () => {
        const detection = detectSuspiciousValue("<script>alert('xss')</script>");

        expect(detection?.code).toBe("xss_script");
    });

    it("HTML entity ile gizlenmiş XSS payloadlarını yakalar", () => {
        const detection = detectSuspiciousValue("&#60;script&#62;alert&#40;1&#41;&#60;/script&#62;");

        expect(detection?.code).toBe("xss_script");
    });

    it("yorum satırıyla gizlenmiş SQL injection payloadlarını yakalar", () => {
        const detection = detectSuspiciousValue("'/**/OR/**/1=1--");

        expect(detection?.code).toBe("sqli_boolean_bypass");
    });

    it("UTF/overlong encoded path traversal payloadlarını yakalar", () => {
        const detection = detectSuspiciousValue("..%c0%af..%c0%af..%c0%afetc%c0%afpasswd");

        expect(detection?.code).toBe("path_traversal");
    });

    it("sensitive file probe isteklerini yakalar", () => {
        const detection = detectSuspiciousValue("/wp-config.php");

        expect(detection?.code).toBe("sensitive_file_probe");
    });

    it("localhost ve file tabanlı SSRF payloadlarını yakalar", () => {
        expect(detectSuspiciousValue("http://127.0.0.1/")?.code).toBe("ssrf_localhost_or_file");
        expect(detectSuspiciousValue("file:///etc/passwd")?.code).toBe("ssrf_localhost_or_file");
    });

    it("güvenli uygulama rotalarını bloklamaz", () => {
        const detection = detectSuspiciousValue("/iletisim?utm_source=instagram");

        expect(detection).toBeNull();
    });
});
