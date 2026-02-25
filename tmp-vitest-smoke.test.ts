import { expect, test } from "vitest";

if (typeof test !== "function") {
    throw new Error("Vitest API unavailable: test is not a function");
}

test("smoke works", () => {
    expect(1 + 1).toBe(2);
});
