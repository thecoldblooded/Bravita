import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useAuth } from "@/contexts/AuthContext";
import { billionMail } from "@/lib/email/billionmail";
import { buildBillionMailContactFromProfile, shouldSyncCompletedProfileToBillionMail } from "@/lib/email/billionmailSync";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import Loader from "@/components/ui/Loader";
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
import { TFunction } from "i18next";
import { arePhoneNumbersEquivalent, changePhoneWithOtp, exchangeFirebasePhoneToken, verifyOtp } from "@/lib/auth/phoneOtp";
import type { ConfirmationResult } from "firebase/auth";

// Helper function to get validation messages based on language
function getValidationMessages(t: TFunction) {
  return {
    nameTooShort: t("auth.name_too_short"),
    streetRequired: t("auth.street_address_required"),
    cityRequired: t("auth.city_required"),
    districtRequired: "İlçe zorunludur", // TODO: Add translation key
    postalCodeRequired: t("auth.postal_code_required"),
    phoneRequired: t("auth.validation.phone_required"),
    phoneInvalid: t("auth.validation.phone_invalid"),
  };
}

export default function CompleteProfile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, user, isLoading: authLoading, refreshUserProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Get validation messages based on current language
  const messages = getValidationMessages(t);

  // Create schema dynamically based on language
  const profileSchema = z.object({
    fullName: z.string().min(2, messages.nameTooShort),
    street: z.string().min(5, messages.streetRequired),
    city: z.string().min(2, messages.cityRequired),
    district: z.string().min(2, messages.districtRequired),
    postalCode: z.string().min(3, messages.postalCodeRequired),
    phone: z
      .string()
      .min(1, messages.phoneRequired)
      .refine((value) => isValidPhoneNumber(value), messages.phoneInvalid),
  });

  type ProfileForm = z.infer<typeof profileSchema>;

  // Initialize form
  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.full_name || "",
      street: "",
      city: "",
      district: "",
      postalCode: "",
      phone: user?.phone || "",
    },
  });

  // Update form when user data becomes available (e.g., from OAuth)
  useEffect(() => {
    if (user?.full_name && !profileForm.getValues("fullName")) {
      profileForm.setValue("fullName", user.full_name);
    }
  }, [user?.full_name, profileForm]);

  // Check authentication and profile status
  useEffect(() => {
    if (!authLoading) {
      // No session - redirect to home
      if (!session?.user) {
        navigate("/");
        return;
      }

      if (user?.profile_complete === true) {
        navigate("/");
        return;
      }
    }
  }, [session, user, authLoading, navigate]);

  // Phone verification states
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(() => {
    return !!(user?.phone && user?.phone_verified);
  });
  const [otpCode, setOtpCode] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const verifiedPhoneRef = useRef(user?.phone || "");

  // Update phone states when authoritative user details are fetched
  useEffect(() => {
    if (user?.phone && user?.phone_verified) {
      const currentPhone = profileForm.getValues("phone");
      if (!currentPhone || arePhoneNumbersEquivalent(currentPhone, user.phone)) {
        setPhoneVerified(true);
        verifiedPhoneRef.current = user.phone;
        profileForm.setValue("phone", user.phone);
      }
    }
  }, [user, profileForm]);

  // Countdown timer for OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Watch phone input value to dynamically compute verification status
  const watchedPhone = profileForm.watch("phone");
  const isPhoneVerifiedNow = !!(
    (user?.phone_verified && user?.phone && arePhoneNumbersEquivalent(watchedPhone, user.phone)) ||
    (phoneVerified && verifiedPhoneRef.current && arePhoneNumbersEquivalent(watchedPhone, verifiedPhoneRef.current))
  );

  // Reset OTP states if user modifies phone number to a non-verified value
  useEffect(() => {
    if (!verifiedPhoneRef.current) return;

    const currentPhone = profileForm.getValues("phone");
    const shouldResetOtpState =
      (otpSent || phoneVerified || Boolean(confirmationResult)) &&
      !arePhoneNumbersEquivalent(verifiedPhoneRef.current, currentPhone);

    if (shouldResetOtpState) {
      setOtpSent(false);
      setPhoneVerified(false);
      setOtpCode("");
      setVerificationToken("");
      setConfirmationResult(null);
      setCountdown(0);
      verifiedPhoneRef.current = "";
    }
  }, [watchedPhone, otpSent, phoneVerified, confirmationResult, profileForm]);

  const handleSendOtp = async () => {
    const phone = profileForm.getValues("phone");
    if (!phone || !isValidPhoneNumber(phone)) {
      toast.error(t("auth.validation.phone_invalid"));
      return;
    }

    setIsSendingOtp(true);
    try {
      const { confirmationResult: res } = await changePhoneWithOtp(phone);
      setConfirmationResult(res);
      verifiedPhoneRef.current = phone;

      setOtpSent(true);
      setCountdown(180);
      toast.success("Doğrulama kodu SMS ile gönderildi.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bir hata oluştu.";
      toast.error(message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Lütfen 6 haneli doğrulama kodunu girin.");
      return;
    }

    if (!confirmationResult) {
      toast.error("Lütfen önce doğrulama kodu isteyin.");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const { idToken } = await verifyOtp(confirmationResult, otpCode);
      const phone = profileForm.getValues("phone");
      const signedVerificationToken = await exchangeFirebasePhoneToken(idToken, phone);
      setPhoneVerified(true);
      setVerificationToken(signedVerificationToken);
      toast.success("Telefon numaranız başarıyla doğrulandı.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bir hata oluştu.";
      toast.error(message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Show loading only during initial auth check
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader />
          <p className="text-gray-600 mt-4">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render (will redirect)
  if (!session?.user) {
    return null;
  }

  const handleProfileSubmit = async (data: ProfileForm) => {
    try {
      if (!session?.user) {
        toast.error("Oturum bulunamadı");
        return;
      }

      if (!isPhoneVerifiedNow) {
        toast.error("Lütfen önce telefon numaranızı SMS ile doğrulayın.");
        return;
      }

      setIsLoading(true);

      // UPSERT profile
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({
          id: session.user.id,
          email: session.user.email || "",
          full_name: data.fullName,
          user_type: "individual",
          phone: data.phone,
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
          profile_complete: true,
          updated_at: new Date().toISOString(),
        });

      if (upsertError) {
        toast.error("Profil kaydedilirken hata oluştu: " + upsertError.message);
        return;
      }

      // Delete existing addresses if any
      const { data: existingAddresses } = await supabase
        .from("addresses")
        .select("id", { count: "exact" })
        .eq("user_id", session.user.id);

      if (existingAddresses && existingAddresses.length > 0) {
        await supabase
          .from("addresses")
          .delete()
          .eq("user_id", session.user.id);
      }

      // Insert new address
      const { error: addressError } = await supabase
        .from("addresses")
        .insert({
          user_id: session.user.id,
          street: data.street,
          city: data.city,
          district: data.district,
          postal_code: data.postalCode,
          is_default: true,
        });

      if (addressError) {
        toast.error("Adres kaydedilirken hata oluştu: " + addressError.message);
        return;
      }

      const shouldSyncToBillionMail = shouldSyncCompletedProfileToBillionMail({
        email: session.user.email || "",
        profile_complete: true,
        previous_profile_complete: user?.profile_complete ?? false,
      });

      if (shouldSyncToBillionMail) {
        const contactPayload = buildBillionMailContactFromProfile({
          email: session.user.email || "",
          full_name: data.fullName,
          phone: data.phone,
          user_type: "individual",
          company_name: null,
        });

        let syncResult = await billionMail.subscribeContact(contactPayload);
        if (syncResult?.success !== true) {
          syncResult = await billionMail.subscribeContact(contactPayload);
        }
      }

      // Refresh the context to get the updated profile
      await refreshUserProfile();

      // Clear localStorage - profile completion done
      localStorage.setItem("profile_known_complete", "true");
      localStorage.removeItem("profile_in_progress");
      localStorage.removeItem("oauth_provider");

      toast.success(t("auth.profile_updated"));
      navigate("/");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-white py-12 px-4">
      {/* Warning banner */}
      <div className="fixed top-0 left-0 right-0 bg-orange-600 text-white py-3 px-4 text-center z-50">
        <p className="text-sm font-semibold">
          ⚠️ {t("auth.profile_completion_required")} - Devam etmek için lütfen formu doldurun
        </p>
      </div>

      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t("auth.complete_profile")}
          </h1>
          <p className="text-gray-600 mb-8">
            {t("auth.profile_completion_required")}
          </p>

          <Form {...profileForm}>
            <form
              onSubmit={profileForm.handleSubmit(handleProfileSubmit)}
              className="space-y-6"
            >
              <FormField
                control={profileForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.full_name")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(Zorunlu)"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>İl (Şehir)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Örn: İstanbul"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>İlçe</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Örn: Kadıköy"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={profileForm.control}
                name="street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.street")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Mahalle, Sokak, Kapı No..."
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posta Kodu</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Örn: 34000"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>{t("auth.phone")}</FormLabel>
                      {isPhoneVerifiedNow && (
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Doğrulanmış Numara
                        </span>
                      )}
                    </div>
                    <FormControl>
                      <div className="flex gap-2">
                        <PhoneInput
                          international
                          countryCallingCodeEditable={false}
                          defaultCountry="TR"
                          value={field.value || ""}
                          onChange={(value) => field.onChange(value || "")}
                          disabled={isLoading || isSendingOtp || (isPhoneVerifiedNow && phoneVerified)}
                          className="flex h-11 rounded-xl border border-gray-200 px-4 flex-1"
                        />
                        {!isPhoneVerifiedNow && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleSendOtp}
                            disabled={isLoading || isSendingOtp || !field.value || countdown > 0}
                            className="h-11 text-xs px-3 border-orange-200 text-orange-700 hover:bg-orange-50 shrink-0 rounded-xl"
                          >
                            {isSendingOtp ? (
                              <Loader size="1rem" noMargin />
                            ) : countdown > 0 ? (
                              `${countdown}s`
                            ) : otpSent ? (
                              "Tekrar Gönder"
                            ) : (
                              "Numarayı Doğrula"
                            )}
                          </Button>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isPhoneVerifiedNow && otpSent && (
                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100/50 space-y-3">
                  <FormLabel className="text-sm font-medium text-gray-700">Doğrulama Kodu</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      maxLength={6}
                      placeholder="6 Haneli Kod"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                      disabled={isLoading || isVerifyingOtp}
                      className="flex-1 text-center font-semibold tracking-widest text-lg h-11 rounded-xl"
                    />
                    <Button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={isLoading || isVerifyingOtp || otpCode.length !== 6}
                      className="bg-orange-500 hover:bg-orange-600 text-white shrink-0 h-11 rounded-xl"
                    >
                      {isVerifyingOtp ? <Loader size="1rem" noMargin /> : "Doğrula"}
                    </Button>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Telefonunuza gönderilen 6 haneli doğrulama kodunu giriniz.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !isPhoneVerifiedNow}
                size="lg"
              >
                {isLoading ? <Loader size="1.25rem" noMargin /> : t("auth.complete")}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
