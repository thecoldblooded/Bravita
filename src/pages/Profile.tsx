import { NavBar } from "@/components/ui/tubelight-navbar";
import { Home, User, ShoppingBag, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { ProfileSidebar } from "@/components/profile/ProfileSidebar";
import { ProfileInfo } from "@/components/profile/ProfileInfo";
import { AddressBook } from "@/components/profile/AddressBook";
import { OrderHistory } from "@/components/profile/OrderHistory";
import { Settings as SettingsPanel } from "@/components/profile/Settings";
import { SupportCenter } from "@/components/profile/SupportCenter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader from "@/components/ui/Loader";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

const ProfileContent = ({ activeTab }: { activeTab: string }) => {
    switch (activeTab) {
        case "profile":
            return <ProfileInfo />;
        case "addresses":
            return <AddressBook />;
        case "orders":
            return <OrderHistory />;
        case "support":
            return <SupportCenter />;
        case "settings":
            return <SettingsPanel />;
        default:
            return <ProfileInfo />;
    }
};

export default function Profile() {
    const { t } = useTranslation();
    const { user, isLoading } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();

    // Get active tab from URL or default to 'profile'
    const activeTab = searchParams.get("tab") || "profile";

    const handleTabChange = (tab: string) => {
        setSearchParams({ tab });
    };

    useEffect(() => {
        if (!isLoading && !user) navigate("/");
    }, [user, isLoading, navigate]);

    if (isLoading && !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FFFBF4]">
                <Loader />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#FFFBF4] flex flex-col">
            <Helmet>
                <title>Bravita - {t("nav.profile", "Profilim")}</title>
                <meta name="description" content="Profil sayfası." />
                <meta name="robots" content="noindex" />
                <meta property="og:title" content="Bravita Profile" />
                <meta property="og:description" content="Profil detayları." />
            </Helmet>
            <Header />

            {/* Spacer for fixed header */}
            <div className="h-24 md:h-32" />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar Navigation */}
                    <ProfileSidebar activeTab={activeTab} setActiveTab={handleTabChange} />

                    {/* Main Content Area */}
                    <div className="flex-1 min-w-0">
                        <ProfileContent activeTab={activeTab} />
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
