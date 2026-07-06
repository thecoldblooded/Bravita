import { describe, expect, it } from "vitest";
import { arePhoneNumbersEquivalent, getFirebaseOtpVerificationErrorKey, getFirebasePhoneAuthErrorMessage, normalizePhone } from "../phoneOtp";

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

  it("Firebase telefon yapılandırma hatalarını anlaşılır mesaja çevirir", () => {
    expect(getFirebasePhoneAuthErrorMessage({ code: "auth/app-not-authorized" }))
      .toContain("alan adı için yetkili değil");
    expect(getFirebasePhoneAuthErrorMessage({ code: "auth/operation-not-allowed" }))
      .toContain("Telefon ile doğrulama");
  });

  it("bilinmeyen SMS hataları için güvenli fallback döner", () => {
    expect(getFirebasePhoneAuthErrorMessage({ code: "auth/unexpected" }))
      .toBe("SMS gönderilemedi. Lütfen tekrar deneyin.");
  });

  it("Firebase OTP doğrulama hatalarını çeviri anahtarlarına çevirir", () => {
    expect(getFirebaseOtpVerificationErrorKey({ code: "auth/invalid-verification-code" }))
      .toBe("auth.invalid_otp");
    expect(getFirebaseOtpVerificationErrorKey({ code: "auth/code-expired" }))
      .toBe("auth.code_expired");
    expect(getFirebaseOtpVerificationErrorKey({ code: "auth/too-many-requests" }))
      .toBe("auth.otp_too_many_attempts");
  });
});
