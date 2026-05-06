/// <reference types="node" />

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const nginxConfig = readFileSync(resolve(currentDir, "../../../config/nginx.conf"), "utf8").replace(/\r\n/g, "\n");
const sensitivePathGuard = `location ~* ^/(?:.*\\/)?(?:wp-config\\.php|config\\.php|id_rsa(?:\\.pub)?|database\\.(?:yml|bak)|appsettings\\.json|composer\\.(?:json|lock)|package(?:-lock)?\\.json|yarn\\.lock|requirements\\.txt|docker-compose\\.ya?ml|web\\.config)$ {\n        return 404;\n    }`;
const visitorCounterProxy = `location = /api/visitor-counter {\n        proxy_pass http://127.0.0.1:3901/api/visitor-counter;`;

describe("nginx sensitive path remediation", () => {
    it("dot olmayan hassas dosya adlarını SPA fallbackten önce 404 ile kapatır", () => {
        const spaFallbackAnchor = "    # SPA Routing (React Router) - Main Location\n";

        expect(nginxConfig).toContain(sensitivePathGuard);
        expect(nginxConfig.indexOf(sensitivePathGuard)).toBeLessThan(nginxConfig.indexOf(spaFallbackAnchor));
    });

    it("raporda geçen örnek hassas adları kapsar", () => {
        expect(sensitivePathGuard).toContain("wp-config\\.php");
        expect(sensitivePathGuard).toContain("package(?:-lock)?\\.json");
        expect(sensitivePathGuard).toContain("id_rsa(?:\\.pub)?");
        expect(sensitivePathGuard).toContain("composer\\.(?:json|lock)");
    });

    it("CounterAPI visitor endpointini BillionMail yerine BFF runtime'a yollar", () => {
        const genericApiLocation = "    location /api/ {\n";

        expect(nginxConfig).toContain(visitorCounterProxy);
        expect(nginxConfig.indexOf(visitorCounterProxy)).toBeLessThan(nginxConfig.indexOf(genericApiLocation));
    });

    it("kullanilmayan visitor.6developer.com CSP iznini tutmaz", () => {
        expect(nginxConfig).not.toContain("visitor.6developer.com");
    });
});
