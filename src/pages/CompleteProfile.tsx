import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthOperations } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

import { TFunction } from "i18next";

// Helper function to get validation messages based on language
function getValidationMessages(t: TFunction) {
  return {
    nameTooShort: t("auth.name_too_short"),
    streetRequired: t("auth.street_address_required"),
    cityRequired: t("auth.city_required"),
    postalCodeRequired: t("auth.postal_code_required"),
    phoneRequired: t("auth.phone_required"),
  };
}
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
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { TwoFactorVerification } from "@/components/auth/TwoFactorVerification";

export function CompleteProfile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, user, isLoading: authLoading, refreshUserProfile } = useAuth();
  const { sendPhoneVerificationCode, verifyPhoneCode, isLoading } =
    useAuthOperations();

  const [currentStep, setCurrentStep] = useState(1);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [pendingPhone, setPendingPhone] = useState("");
  const [phoneResendCount, setPhoneResendCount] = useState(0);

  // Get validation messages based on current language
  const messages = getValidationMessages(t);

  // Create schemas dynamically based on language
  const step1Schema = z.object({
    fullName: z.string().min(2, messages.nameTooShort),
    street: z.string().min(5, messages.streetRequired),
    city: z.string().min(2, messages.cityRequired),
    postalCode: z.string().min(3, messages.postalCodeRequired),
  });

  const step2Schema = z.object({
    phone: z.string().min(1, messages.phoneRequired),
    setAsDefault: z.boolean().default(true),
  });

  type Step1Form = z.infer<typeof step1Schema>;
  type Step2Form = z.infer<typeof step2Schema>;

  // IMPORTANT: Initialize forms BEFORE any conditional returns (before loading check)
  // Hook'lar conditional olmamalı
  const step1Form = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      fullName: user?.full_name || "",
      street: "",
      city: "",
      postalCode: "",
    },
  });

  const step2Form = useForm<Step2Form>({
    defaultValues: {
      phone: user?.phone || "",
      setAsDefault: true,
    },
  });

  // Check authentication and profile status
  useEffect(() => {
    console.log("CompleteProfile mount check:", {
      authLoading,
      hasSession: !!session?.user,
      hasUser: !!user,
      profileComplete: user?.profile_complete
    });

    if (!authLoading) {
      if (!session?.user) {
        console.log("No session, redirecting to /");
        navigate("/");
        return;
      }

      if (user?.profile_complete) {
        console.log("Profile complete, redirecting to /");
        navigate("/");
        return;
      }
    }
  }, [session, user, authLoading, navigate]);

  console.log("CompleteProfile render:", { authLoading, hasSession: !!session?.user });

  // Show loading only during initial auth check
  if (authLoading) {
    console.log("Showing loading screen");
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render (will redirect)
  if (!session?.user) {
    return null;
  }

  const handleStep1Submit = async (data: Step1Form) => {
    try {
      if (!session?.user) {
        console.error("Session user yok:", session);
        toast.error("Oturum bulunamadı");
        return;
      }

      console.log("Step 1 başladı:", data);
      console.log("Session user:", session.user.id);


      // UPSERT profile first to ensure it exists
      // This is needed because addresses table has a foreign key constraint on user_id
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({
          id: session.user.id,
          email: session.user.email || "",
          full_name: data.fullName,
          user_type: "individual",
          profile_complete: false,
          updated_at: new Date().toISOString(),
        });

      if (upsertError) {
        console.error("Profile upsert error:", upsertError);
        toast.error("Profil kaydedilirken hata oluştu: " + upsertError.message);
        return;
      }

      console.log("Profile upserted successfully");
      // Only delete existing addresses if there are any
      // On first profile completion, there typically won't be any
      const { data: existingAddresses } = await supabase
        .from("addresses")
        .select("id", { count: "exact" })
        .eq("user_id", session.user.id);

      if (existingAddresses && existingAddresses.length > 0) {
        const { error: deleteError } = await supabase
          .from("addresses")
          .delete()
          .eq("user_id", session.user.id);

        if (deleteError) {
          console.error("Address delete error:", deleteError);
        }
      }

      // Insert new address
      console.log("Inserting address with data:", {
        user_id: session.user.id,
        street: data.street,
        city: data.city,
        postal_code: data.postalCode,
        is_default: true,
      });

      const { data: insertedAddress, error: addressError } = await supabase
        .from("addresses")
        .insert({
          user_id: session.user.id,
          street: data.street,
          city: data.city,
          postal_code: data.postalCode,
          is_default: true,
        })
        .select();

      if (addressError) {
        console.error("Address insert error:", addressError);
        console.error("Address insert error details:", {
          code: addressError.code,
          message: addressError.message,
          details: addressError.details,
        });
        toast.error("Adres kaydedilirken hata oluştu: " + addressError.message);
        return;
      }

      console.log("Step 1 data saved successfully", insertedAddress);
      toast.success(t("auth.address_saved"));
      setPendingPhone("");
      setCurrentStep(2);

    } catch (error) {
      console.error("Step 1 submission error:", error);
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error(errorMessage);
    }
  };

  const updateProfileAndAddress = async (data: Step1Form) => {
    try {
      if (!session?.user) return;

      console.log("Background'da profile ve address update başlanıyor");

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: data.fullName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
      } else {
        console.log("Profile updated successfully");
      }

      // Delete existing addresses and add new one
      const { error: deleteError } = await supabase
        .from("addresses")
        .delete()
        .eq("user_id", session.user.id);

      if (deleteError) {
        console.error("Address delete error:", deleteError);
      }

      const { error: addressError } = await supabase
        .from("addresses")
        .insert({
          user_id: session.user.id,
          street: data.street,
          city: data.city,
          postal_code: data.postalCode,
          is_default: true,
        });

      if (addressError) {
        console.error("Address insert error:", addressError);
      } else {
        console.log("Address inserted successfully");
      }
    } catch (error) {
      console.error("Background update error:", error);
    }
  };

  const handleStep2Submit = async (data: Step2Form) => {
    try {
      console.log("Step 2 submit başlanıyor, telefon:", data.phone);

      if (!session?.user) {
        toast.error("Oturum bulunamadı");
        return;
      }

      if (!data.phone) {
        toast.error("Lütfen telefon numarası girin");
        return;
      }

      // OTP temporarily disabled: directly update profile and mark complete
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          phone: data.phone,
          phone_verified: false,
          phone_verified_at: null,
          profile_complete: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id);

      if (updateError) {
        console.error("Profile update error (no-otp)", updateError);
        toast.error(updateError.message || "Profil güncellenirken hata oluştu");
        return;
      }

      await refreshUserProfile();

      // Mark profile known-complete locally and clear flags
      localStorage.setItem("profile_known_complete", "true");
      localStorage.removeItem("profile_in_progress");
      localStorage.removeItem("oauth_provider");

      toast.success(t("auth.profile_updated"));
      navigate("/");

    } catch (error) {
      console.error("Step 2 error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Profil kaydedilirken hata oluştu"
      );
    }
  };

  const handle2FAVerified = async (token: string) => {
    if (!session?.user || !pendingPhone) return;

    try {
      // Verify phone
      await verifyPhoneCode(pendingPhone, token);

      // Update profile with verified phone
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          phone: pendingPhone,
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
          profile_complete: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id);

      if (updateError) throw updateError;

      await refreshUserProfile();

      // Clear localStorage - profile completion done and mark known-complete
      localStorage.setItem("profile_known_complete", "true");
      localStorage.removeItem("profile_in_progress");
      localStorage.removeItem("oauth_provider");

      toast.success(t("auth.profile_completion_required"));
      navigate("/");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("auth.verification_failed")
      );
    }
  };

  const handleResendPhone = async () => {
    try {
      await sendPhoneVerificationCode(pendingPhone);
      setPhoneResendCount((prev) => prev + 1);
      toast.success(t("auth.code_sent"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.resend_failed"));
    }
  };

  if (showPhoneVerification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">
            {t("auth.phone_verification_required")}
          </h2>

          <TwoFactorVerification
            phone={pendingPhone}
            onVerified={handle2FAVerified}
            onResend={handleResendPhone}
            isLoading={isLoading}
          />

          <button
            onClick={() => {
              setShowPhoneVerification(false);
              setCurrentStep(2);
            }}
            className="mt-4 text-sm text-orange-600 hover:underline"
          >
            ← {t("auth.back")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white py-12 px-4">
      {/* Warning banner if user tries to leave */}
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

          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex-1">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${currentStep >= 1 ? "bg-orange-600" : "bg-gray-200"
                  }`}
              />
              <p className="text-sm font-semibold mt-2 text-gray-700">
                {t("auth.address")}
              </p>
            </div>

            <div className="h-2 w-8 mx-2 bg-gray-200" />

            <div className="flex-1">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${currentStep >= 2 ? "bg-orange-600" : "bg-gray-200"
                  }`}
              />
              <p className="text-sm font-semibold mt-2 text-gray-700">
                {t("auth.phone")}
              </p>
            </div>
          </div>

          {/* Step 1: Address */}
          {currentStep === 1 && (
            <Form {...step1Form}>
              <form
                onSubmit={step1Form.handleSubmit(handleStep1Submit)}
                className="space-y-6"
              >
                <FormField
                  control={step1Form.control}
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

                <FormField
                  control={step1Form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth.street")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="* (Zorunlu)"
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
                    control={step1Form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Şehir</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="* (Zorunlu)"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step1Form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Posta Kodu</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="* (Zorunlu)"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  size="lg"
                >
                  {isLoading
                    ? t("auth.saving")
                    : `${t("auth.next")} ➜`}
                </Button>
              </form>
            </Form>
          )}

          {/* Step 2: Phone */}
          {currentStep === 2 && (
            <Form {...step2Form}>
              <form
                onSubmit={step2Form.handleSubmit(handleStep2Submit)}
                className="space-y-6"
              >
                <FormField
                  control={step2Form.control}
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
                  control={step2Form.control}
                  name="setAsDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        Set as default phone number
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    {t("auth.phone_verification_note")}
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setCurrentStep(1)}
                    disabled={isLoading}
                  >
                    ← {t("auth.back")}
                  </Button>

                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isLoading}
                    size="lg"
                  >
                    {isLoading ? t("auth.verifying") : t("auth.complete")}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}

export default CompleteProfile;
