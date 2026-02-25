import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["vitest.smoke.test.js", "tmp-vitest-global.test.ts", "tmp-vitest-import-identity.test.ts"],
        environment: "node",
        globals: false,
        passWithNoTests: false,
    },
});
