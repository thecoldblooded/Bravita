import { useState, useRef, lazy, Suspense } from "react";
import type HCaptcha from "@hcaptcha/react-hcaptcha";
const HCaptchaComponent = lazy(() => import("@hcaptcha/react-hcaptcha"));
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuthOperations } from "@/hooks/useAuth";
import Loader from "@/components/ui/Loader";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Mail, RefreshCw } from "lucide-react";
import { translateError } from "@/lib/errorTranslator";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";

interface SignupFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function SignupForm({ onSuccess, onSwitchToLogin }: SignupFormProps) {
  const { t } = useTranslation();

  const passwordSchema = z
    .string()
    .min(12, t("auth.validation.password_min"))
    .regex(/[A-Z]/, t("auth.validation.password_uppercase"))
    .regex(/[a-z]/, t("auth.validation.password_lowercase"))
    .regex(/[0-9]/, t("auth.validation.password_number"))
    .regex(/[!@#$%^&*]/, t("auth.validation.password_special"));

  const individualSignupSchema = z
    .object({
      email: z.string().email(t("auth.validation.email_invalid")),
      password: passwordSchema,
      confirmPassword: z.string(),
      phone: z.string()
        .min(1, t("auth.validation.phone_required"))
        .refine(
          (value) => isValidPhoneNumber(value || ""),
          t("auth.validation.phone_invalid")
        ),
      fullName: z.string().min(2, t("auth.validation.full_name_required")),
      agreeTerms: z.boolean().refine((v) => v === true, t("auth.validation.must_accept_terms")),
      agreePrivacy: z.boolean().refine((v) => v === true, t("auth.validation.must_accept_privacy")),
      agreeKvkk: z.boolean().refine((v) => v === true, t("auth.validation.must_accept_kvkk")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("auth.validation.passwords_dont_match"),
      path: ["confirmPassword"],
    });

  const companySignupSchema = z
    .object({
      username: z.string().min(3, t("auth.validation.username_too_short")),
      email: z.string().email(t("auth.validation.email_invalid")),
      password: passwordSchema,
      confirmPassword: z.string(),
      companyName: z.string().min(1, t("auth.validation.company_name_required")),
      agreeTerms: z.boolean().refine((v) => v === true, t("auth.validation.must_accept_terms")),
      agreePrivacy: z.boolean().refine((v) => v === true, t("auth.validation.must_accept_privacy")),
      agreeKvkk: z.boolean().refine((v) => v === true, t("auth.validation.must_accept_kvkk")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("auth.validation.passwords_dont_match"),
      path: ["confirmPassword"],
    });

  type IndividualSignupForm = z.infer<typeof individualSignupSchema>;
  type CompanySignupForm = z.infer<typeof companySignupSchema>;

  const {
    signupWithEmail,
    signupWithGoogle,
    resendEmailConfirmation,
    isLoading,
    error,
  } = useAuthOperations();

  const [userType, setUserType] = useState<"individual" | "company">(
    "individual"
  );
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string>("");
  const [isResending, setIsResending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

  // Production Key: "203039b0-ee5c-48ba-aa2c-390a43ecaae0"
  const HCAPTCHA_SITE_KEY = "203039b0-ee5c-48ba-aa2c-390a43ecaae0";

  // Individual signup form
  const individualForm = useForm<IndividualSignupForm>({
    resolver: zodResolver(individualSignupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      fullName: "",
      agreeTerms: false,
      agreePrivacy: false,
      agreeKvkk: false,
    },
  });

  // Company signup form
  const companyForm = useForm<CompanySignupForm>({
    resolver: zodResolver(companySignupSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      companyName: "",
      agreeTerms: false,
      agreePrivacy: false,
      agreeKvkk: false,
    },
  });

  const handleIndividualSignupSubmit = async (data: IndividualSignupForm) => {
    try {
      const skipCaptcha = import.meta.env.VITE_SKIP_CAPTCHA === "true";

      if (!captchaToken && !skipCaptcha) {
        toast.error(t("auth.captcha_required"));
        return;
      }

      // Create account directly - Supabase will send confirmation email
      await signupWithEmail({
        email: data.email,
        password: data.password,
        phone: data.phone,
        userType: "individual",
        fullName: data.fullName,
        captchaToken: captchaToken!,
      });

      // Set flag so IncompleteProfileBanner shows after email confirmation
      localStorage.setItem("profile_in_progress", "true");

      setRegisteredEmail(data.email);
      setShowEmailConfirmation(true);
      toast.success(t("auth.email_confirmation_sent"));

      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    } catch (err) {
      toast.error(translateError(err, t));
    }
  };

  const handleCompanySignupSubmit = async (data: CompanySignupForm) => {
    try {
      const skipCaptcha = import.meta.env.VITE_SKIP_CAPTCHA === "true";

      if (!captchaToken && !skipCaptcha) {
        toast.error(t("auth.captcha_required"));
        return;
      }

      await signupWithEmail({
        email: data.email,
        password: data.password,
        phone: "",
        userType: "company",
        companyName: data.companyName,
        captchaToken: captchaToken!,
      });

      setRegisteredEmail(data.email);
      setShowEmailConfirmation(true);
      toast.success(t("auth.email_confirmation_sent"));

      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    } catch (err) {
      toast.error(translateError(err, t));
    }
  };

  const handleResendEmail = async () => {
    if (!registeredEmail) return;
    setIsResending(true);
    try {
      await resendEmailConfirmation(registeredEmail);
      toast.success(t("auth.email_sent"));
    } catch (err) {
      toast.error(translateError(err, t));
    } finally {
      setIsResending(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      localStorage.setItem("profile_in_progress", "true");
      localStorage.setItem("oauth_provider", "google");

      await signupWithGoogle({ userType: "individual", phone: "" });
    } catch (err) {
      toast.error(translateError(err, t));
    }
  };

  // Email confirmation screen
  if (showEmailConfirmation) {
    return (
      <div className="space-y-6 py-8 text-center">
        <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
          <Mail className="w-8 h-8 text-orange-600" />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t("auth.check_email")}
          </h2>
          <p className="text-gray-600">
            {t("auth.email_sent_to")} <strong>{registeredEmail}</strong>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {t("auth.email_confirmation_note")}
          </p>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleResendEmail}
            disabled={isResending}
          >
            {isResending ? (
              <Loader size="1.25rem" noMargin />
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t("auth.resend_email")}
              </>
            )}
          </Button>

          <button
            type="button"
            onClick={() => {
              setShowEmailConfirmation(false);
              setRegisteredEmail("");
              setCaptchaToken(null);
            }}
            className="text-sm text-orange-600 hover:underline"
          >
            ← {t("auth.back")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Tabs
      value={userType}
      onValueChange={(value) => setUserType(value as "individual" | "company")}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="individual">{t("auth.individual")}</TabsTrigger>
        <TabsTrigger value="company">{t("auth.company")}</TabsTrigger>
      </TabsList>

      {/* Individual Signup */}
      <TabsContent value="individual" className="space-y-4">
        <Form {...individualForm}>
          <form
            onSubmit={(e) => { e.preventDefault(); void individualForm.handleSubmit(handleIndividualSignupSubmit)(e); }}
            className="space-y-4"
          >
            <FormField
              control={individualForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.email")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("auth.placeholders.email")}
                      type="email"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={individualForm.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.full_name")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("auth.placeholders.full_name")}
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={individualForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.phone")} *</FormLabel>
                  <FormControl>
                    <PhoneInput
                      international
                      countryCallingCodeEditable={false}
                      defaultCountry="TR"
                      placeholder={t("auth.phone_placeholder")}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                      className="flex h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-base ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={individualForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.password")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("auth.placeholders.password")}
                      type="password"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <PasswordStrengthIndicator password={field.value} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={individualForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.confirm_password")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("auth.placeholders.confirm_password")}
                      type="password"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 border-t pt-4">
              <FormField
                control={individualForm.control}
                name="agreeTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-normal cursor-pointer">
                        {t("auth.agree_terms")}{" "}
                        <a
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:underline"
                        >
                          {t("auth.terms_link")}
                        </a>
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={individualForm.control}
                name="agreePrivacy"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-normal cursor-pointer">
                        {t("auth.agree_privacy")}{" "}
                        <a
                          href="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:underline"
                        >
                          {t("auth.privacy_link")}
                        </a>
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={individualForm.control}
                name="agreeKvkk"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-normal cursor-pointer">
                        {t("auth.agree_kvkk")}{" "}
                        <a
                          href="/kvkk"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:underline"
                        >
                          {t("auth.kvkk_link")}
                        </a>
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-center py-4">
              <Suspense fallback={<div className="h-19.5 w-75 bg-gray-50 animate-pulse rounded-lg border border-gray-100 flex items-center justify-center text-[10px] text-gray-400">hCaptcha Yükleniyor...</div>}>
                <HCaptchaComponent
                  sitekey={HCAPTCHA_SITE_KEY}
                  onVerify={(token) => setCaptchaToken(token)}
                  onError={(err) => console.error("hCaptcha Error:", err)}
                  onExpire={() => setCaptchaToken(null)}
                  ref={captchaRef}
                />
              </Suspense>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader size="1.25rem" noMargin /> : t("auth.signup")}
            </Button>
          </form>
        </Form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              {t("auth.or_continue_with")}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignup}
            disabled={
              isLoading ||
              !individualForm.watch("agreeTerms") ||
              !individualForm.watch("agreePrivacy") ||
              !individualForm.watch("agreeKvkk")
            }
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
            {t("auth.signup_with_google")}
          </Button>

          {(!individualForm.watch("agreeTerms") ||
            !individualForm.watch("agreePrivacy") ||
            !individualForm.watch("agreeKvkk")) && (
              <p className="text-xs text-center text-amber-600 bg-amber-50 p-2 rounded">
                {t("auth.must_agree_all")}
              </p>
            )}
        </div>

        <div className="text-center text-sm">
          <span className="text-gray-600">{t("auth.already_account")} </span>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-orange-600 hover:underline font-semibold"
          >
            {t("auth.login")}
          </button>
        </div>
      </TabsContent>

      {/* Company Signup */}
      <TabsContent value="company" className="space-y-4">
        <Form {...companyForm}>
          <form
            onSubmit={(e) => { e.preventDefault(); void companyForm.handleSubmit(handleCompanySignupSubmit)(e); }}
            className="space-y-4"
          >
            <FormField
              control={companyForm.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.username")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("auth.username")}
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={companyForm.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.company_name")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("auth.company_name")}
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={companyForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.email")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("auth.email_placeholder")}
                      type="email"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={companyForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.password")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("auth.placeholders.password")}
                      type="password"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <PasswordStrengthIndicator password={field.value} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={companyForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.confirm_password")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("auth.placeholders.confirm_password")}
                      type="password"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 border-t pt-4">
              <FormField
                control={companyForm.control}
                name="agreeTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-normal cursor-pointer">
                        {t("auth.agree_terms")}{" "}
                        <a
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:underline"
                        >
                          {t("auth.terms_link")}
                        </a>
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={companyForm.control}
                name="agreePrivacy"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-normal cursor-pointer">
                        {t("auth.agree_privacy")}{" "}
                        <a
                          href="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:underline"
                        >
                          {t("auth.privacy_link")}
                        </a>
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={companyForm.control}
                name="agreeKvkk"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-normal cursor-pointer">
                        {t("auth.agree_kvkk")}{" "}
                        <a
                          href="/kvkk"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:underline"
                        >
                          {t("auth.kvkk_link")}
                        </a>
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-center py-4">
              <Suspense fallback={<div className="h-19.5 w-75 bg-gray-50 animate-pulse rounded-lg border border-gray-100 flex items-center justify-center text-[10px] text-gray-400">hCaptcha Yükleniyor...</div>}>
                <HCaptchaComponent
                  sitekey={HCAPTCHA_SITE_KEY}
                  onVerify={(token) => setCaptchaToken(token)}
                  onError={(err) => console.error("hCaptcha Error:", err)}
                  onExpire={() => setCaptchaToken(null)}
                  // We share the ref, but since tabs unmount content, it might be tricky. 
                  // However, usually only one is mounted or visible.
                  // Re-using ref for simplicity as tabs implementation might keep both mounted or unmount.
                  // Ideally we should use separate refs but let's test.
                  ref={captchaRef}
                />
              </Suspense>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader size="1.25rem" noMargin /> : t("auth.signup")}
            </Button>
          </form>
        </Form>

        <div className="text-center text-sm">
          <span className="text-gray-600">{t("auth.already_account")} </span>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-orange-600 hover:underline font-semibold"
          >
            {t("auth.login")}
          </button>
        </div>
      </TabsContent >
    </Tabs >
  );
}
