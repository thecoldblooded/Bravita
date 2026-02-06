import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
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

// Helper function to get validation messages based on language
function getValidationMessages(t: TFunction) {
  return {
    nameTooShort: t("auth.name_too_short"),
    streetRequired: t("auth.street_address_required"),
    cityRequired: t("auth.city_required"),
    districtRequired: "İlçe zorunludur", // TODO: Add translation key
    postalCodeRequired: t("auth.postal_code_required"),
  };
}

export function CompleteProfile() {
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
    console.log("CompleteProfile mount check:", {
      authLoading,
      hasSession: !!session?.user,
      hasUser: !!user,
      profileComplete: user?.profile_complete,
      isStub: user?.isStub
    });

    if (!authLoading) {
      // No session - redirect to home
      if (!session?.user) {
        console.log("No session, redirecting to /");
        navigate("/");
        return;
      }

      if (user?.profile_complete === true) {
        console.log("Profile complete, redirecting to /", user);
        navigate("/");
        return;
      }

      // If still a stub after a brief wait, that's fine - show form
    }
  }, [session, user, authLoading, navigate]);

  console.log("CompleteProfile render:", { authLoading, hasSession: !!session?.user });

  // Show loading only during initial auth check
  if (authLoading) {
    console.log("Showing loading screen");
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

      setIsLoading(true);

      // UPSERT profile
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({
          id: session.user.id,
          email: session.user.email || "",
          full_name: data.fullName,
          user_type: "individual",
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

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
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

export default CompleteProfile;
