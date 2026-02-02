import { NavBar } from "@/components/ui/tubelight-navbar";
import { Home, User, ShoppingBag, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { ProfileSidebar } from "@/components/profile/ProfileSidebar";
import { ProfileInfo } from "@/components/profile/ProfileInfo";
import { AddressBook } from "@/components/profile/AddressBook";
import { OrderHistory } from "@/components/profile/OrderHistory";
import { Settings } from "@/components/profile/Settings";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader from "@/components/ui/Loader";

export default function Profile() {
    const { user, isLoading } = useAuth();
    const navigate = useNavigate();
    // ... (keep existing setup)
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

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FFFBF4]">
                <Loader />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#FFFBF4] flex flex-col">
            <Header />

            {/* Spacer for fixed header */}
            <div className="h-24 md:h-32" />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar Navigation */}
                    <ProfileSidebar activeTab={activeTab} setActiveTab={handleTabChange} />

                    {/* Main Content Area */}
                    <div className="flex-1 min-w-0">
                        {activeTab === "profile" && <ProfileInfo />}
                        {activeTab === "addresses" && <AddressBook />}
                        {activeTab === "orders" && <OrderHistory />}
                        {activeTab === "settings" && <Settings />}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
