import { describe as importedDescribe, expect as importedExpect, test as importedTest } from "vitest";

describe("vitest import identity", () => {
    test("global ve imported fonksiyon referanslarını kıyaslar", () => {
        expect(typeof importedTest).toBe("function");
        expect(typeof importedExpect).toBe("function");
        expect(typeof importedDescribe).toBe("function");

        expect(importedTest).toBe(test);
        expect(importedExpect).toBe(expect);
        expect(importedDescribe).toBe(describe);
    });
});
