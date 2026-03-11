import { decideRequestGateAction } from "../../request-gate.js";

describe("decideRequestGateAction", () => {
    it("WAF raporundaki query-string XSS denemelerini bloklar", () => {
        const decision = decideRequestGateAction("https://bravita.com.tr/?q=<script>alert('xss')</script>");

        expect(decision.block).toBe(true);
        expect(decision.detection?.code).toBe("xss_script");
    });

    it("sensitive file probe pathlerini bloklar", () => {
        const decision = decideRequestGateAction("https://bravita.com.tr/wp-config.php");

        expect(decision.block).toBe(true);
        expect(decision.detection?.code).toBe("sensitive_file_probe");
    });

    it("normal landing page ve UTM parametrelerini geçirir", () => {
        const decision = decideRequestGateAction("https://bravita.com.tr/?utm_source=instagram&utm_medium=social");

        expect(decision.block).toBe(false);
        expect(decision.detection).toBeNull();
    });

    it("OAuth callback query parametrelerini geçirir", () => {
        const decision = decideRequestGateAction("https://bravita.com.tr/api/auth/oauth/callback?code=abc123&state=xyz987");

        expect(decision.block).toBe(false);
        expect(decision.detection).toBeNull();
    });
});
