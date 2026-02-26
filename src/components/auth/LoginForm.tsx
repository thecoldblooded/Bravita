import { useState, useRef, lazy, Suspense, type RefObject } from "react";
import type HCaptcha from "@hcaptcha/react-hcaptcha";
const HCaptchaComponent = lazy(() => import("@hcaptcha/react-hcaptcha"));
import { useTranslation } from "react-i18next";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { useAuthOperations } from "@/hooks/useAuth";
import Loader from "@/components/ui/Loader";
import { translateError } from "@/lib/errorTranslator";

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToSignup?: () => void;
}

type TranslateFn = ReturnType<typeof useTranslation>["t"];

type IndividualLoginForm = {
  email: string;
  password: string;
};

type CaptchaSectionProps = {
  siteKey: string;
  captchaRef: RefObject<HCaptcha | null>;
  onTokenChange: (token: string | null) => void;
};

function CaptchaSection({ siteKey, captchaRef, onTokenChange }: CaptchaSectionProps) {
  if (!siteKey) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
        hCaptcha yapılandırması eksik (VITE_HCAPTCHA_SITE_KEY).
      </div>
    );
  }

  return (
    <div className="flex justify-center py-4">
      <Suspense
        fallback={
          <div className="h-19.5 w-75 bg-gray-50 animate-pulse rounded-lg border border-gray-100 flex items-center justify-center text-[10px] text-gray-400">
            hCaptcha Yükleniyor...
          </div>
        }
      >
        <HCaptchaComponent
          sitekey={siteKey}
          onVerify={(token) => onTokenChange(token)}
          onError={(err) => console.error("hCaptcha Error:", err)}
          onExpire={() => onTokenChange(null)}
          ref={captchaRef}
        />
      </Suspense>
    </div>
  );
}

type GoogleLoginButtonProps = {
  t: TranslateFn;
  isLoading: boolean;
  onClick: () => void;
};

function GoogleLoginButton({ t, isLoading, onClick }: GoogleLoginButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={isLoading}
      onClick={onClick}
    >
      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {t("auth.login_with_google")}
    </Button>
  );
}

type SignupSwitchProps = {
  t: TranslateFn;
  onSwitchToSignup?: () => void;
};

function SignupSwitch({ t, onSwitchToSignup }: SignupSwitchProps) {
  return (
    <div className="text-center text-sm">
      <span className="text-gray-600">{t("auth.no_account")} </span>
      <button
        type="button"
        onClick={onSwitchToSignup}
        className="text-orange-600 hover:underline font-semibold"
      >
        {t("auth.signup")}
      </button>
    </div>
  );
}

type IndividualLoginTabProps = {
  t: TranslateFn;
  form: UseFormReturn<IndividualLoginForm>;
  isLoading: boolean;
  onSubmit: (data: IndividualLoginForm) => Promise<void>;
  onForgotPassword: () => Promise<void>;
  onGoogleLogin: () => Promise<void>;
  onSwitchToSignup?: () => void;
  hcaptchaSiteKey: string;
  captchaRef: RefObject<HCaptcha | null>;
  onTokenChange: (token: string | null) => void;
};

function IndividualLoginTab({
  t,
  form,
  isLoading,
  onSubmit,
  onForgotPassword,
  onGoogleLogin,
  onSwitchToSignup,
  hcaptchaSiteKey,
  captchaRef,
  onTokenChange,
}: IndividualLoginTabProps) {
  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth.email")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("auth.email_placeholder")}
                    type="email"
                    autoComplete="email"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex justify-between items-center">
                  {t("auth.password")}
                  <button
                    type="button"
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                    onClick={onForgotPassword}
                    disabled={isLoading}
                  >
                    {t("auth.forgot_password")}
                  </button>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="••••••••"
                    type="password"
                    autoComplete="current-password"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <CaptchaSection
            siteKey={hcaptchaSiteKey}
            captchaRef={captchaRef}
            onTokenChange={onTokenChange}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader size="1.25rem" noMargin /> : t("auth.login")}
          </Button>
        </form>
      </Form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">{t("auth.or_continue_with")}</span>
        </div>
      </div>

      <GoogleLoginButton t={t} isLoading={isLoading} onClick={onGoogleLogin} />
      <SignupSwitch t={t} onSwitchToSignup={onSwitchToSignup} />
    </div>
  );
}

export function LoginForm({ onSuccess, onSwitchToSignup }: LoginFormProps) {
  const { t } = useTranslation();

  const individualLoginSchema = z.object({
    email: z.string().email(t("auth.validation.email_invalid")),
    password: z.string().min(1, t("auth.validation.password_required")),
  });

  const { loginWithEmail, signupWithGoogle, resetPassword, isLoading } =
    useAuthOperations();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

  const HCAPTCHA_SITE_KEY = String(import.meta.env.VITE_HCAPTCHA_SITE_KEY ?? "").trim();

  const individualForm = useForm<IndividualLoginForm>({
    resolver: zodResolver(individualLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const resetCaptchaState = () => {
    captchaRef.current?.resetCaptcha();
    setCaptchaToken(null);
  };

  const handleIndividualLogin = async (data: IndividualLoginForm) => {
    try {
      if (!captchaToken) {
        toast.error(t("auth.captcha_required"));
        return;
      }

      await loginWithEmail({
        email: data.email,
        password: data.password,
        captchaToken: captchaToken!,
      });
      toast.success(t("auth.login_successful"));

      resetCaptchaState();
      onSuccess?.();
    } catch (err) {
      resetCaptchaState();
      toast.error(translateError(err, t));
    }
  };

  const handleGoogleLogin = async () => {
    try {
      localStorage.setItem("profile_in_progress", "true");
      localStorage.setItem("oauth_provider", "google");
      await signupWithGoogle();
    } catch (err) {
      toast.error(translateError(err, t));
    }
  };

  const handleForgotPassword = async () => {
    const email = individualForm.getValues("email");
    if (!email) {
      toast.error(t("auth.email_required_for_reset"));
      individualForm.setFocus("email");
      return;
    }

    try {
      if (!captchaToken) {
        toast.error(t("auth.captcha_required"));
        return;
      }

      await resetPassword(email, captchaToken!);
      toast.success(t("auth.password_reset_sent"));

      resetCaptchaState();
    } catch (err) {
      resetCaptchaState();
      toast.error(translateError(err, t));
    }
  };

  return (
    <IndividualLoginTab
      t={t}
      form={individualForm}
      isLoading={isLoading}
      onSubmit={handleIndividualLogin}
      onForgotPassword={handleForgotPassword}
      onGoogleLogin={handleGoogleLogin}
      onSwitchToSignup={onSwitchToSignup}
      hcaptchaSiteKey={HCAPTCHA_SITE_KEY}
      captchaRef={captchaRef}
      onTokenChange={setCaptchaToken}
    />
  );
}
