import { describe, expect, it } from "vitest";
import { arePhoneNumbersEquivalent, normalizePhone } from "../phoneOtp";

describe("phoneOtp helpers", () => {
  it("telefon numarasını oturum için normalize eder", () => {
    expect(normalizePhone("+90 (555) 111-22-33")).toBe("+905551112233");
    expect(normalizePhone("0555 111 22 33")).toBe("+905551112233");
  });

  it("aynı numarayı farklı formatlarda eşdeğer sayar", () => {
    expect(arePhoneNumbersEquivalent("+90 555 111 22 33", "0555 111 22 33")).toBe(true);
  });

  it("farklı numaraları eşdeğer saymaz", () => {
    expect(arePhoneNumbersEquivalent("+90 555 111 22 33", "+90 532 111 22 33")).toBe(false);
  });
});
