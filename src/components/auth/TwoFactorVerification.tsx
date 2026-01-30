import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { FormItem, FormLabel, FormMessage } from "../ui/form";
import { toast } from "sonner";

interface TwoFactorVerificationProps {
  phone: string;
  onVerified: (token: string) => Promise<void>;
  onResend: () => Promise<void>;
  isLoading: boolean;
}

export function TwoFactorVerification({
  phone,
  onVerified,
  onResend,
  isLoading,
}: TwoFactorVerificationProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [resendCount, setResendCount] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const maxResends = 3;

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCodeChange = (value: string) => {
    // Only allow numbers, max 6 digits
    const numericValue = value.replace(/\D/g, "").slice(0, 6);
    setCode(numericValue);
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error(t("auth.invalid_otp_length"));
      return;
    }

    setIsVerifying(true);
    try {
      await onVerified(code);
      toast.success(t("auth.verification_successful"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.verification_failed"));
      setCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCount >= maxResends) {
      toast.error(t("auth.max_resend_attempts"));
      return;
    }

    try {
      await onResend();
      setResendCount((prev) => prev + 1);
      setTimeLeft(600); // Reset timer
      setCode("");
      toast.success(t("auth.code_sent"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.resend_failed"));
    }
  };

  const isCodeExpired = timeLeft === 0;
  const canResend = resendCount < maxResends && !isLoading;

  return (
    <div className="space-y-6 py-4">
      <div>
        <p className="text-sm text-gray-600 mb-2">
          {t("auth.sms_sent_to")} {phone}
        </p>
      </div>

      <FormItem>
        <FormLabel>{t("auth.enter_verification_code")}</FormLabel>
        <Input
          type="text"
          placeholder="000000"
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          maxLength={6}
          className="text-center text-2xl tracking-widest"
          disabled={isCodeExpired || isVerifying || isLoading}
        />
        <FormMessage />
      </FormItem>

      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="text-gray-600">{t("auth.code_expires_in")}: </span>
          <span
            className={`font-semibold ${
              timeLeft < 60 ? "text-red-500" : "text-green-600"
            }`}
          >
            {formatTime(timeLeft)}
          </span>
        </div>

        {canResend && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={isLoading || isVerifying}
          >
            {t("auth.resend_code")} ({maxResends - resendCount})
          </Button>
        )}
      </div>

      {isCodeExpired && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-700">{t("auth.code_expired")}</p>
        </div>
      )}

      <Button
        onClick={handleVerify}
        disabled={
          code.length !== 6 ||
          isCodeExpired ||
          isVerifying ||
          isLoading
        }
        className="w-full"
      >
        {isVerifying ? t("auth.verifying") : t("auth.verify_code")}
      </Button>
    </div>
  );
}
