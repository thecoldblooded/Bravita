import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const CookieConsent = () => {
    const { t } = useTranslation();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if user has already made a choice
        const consent = localStorage.getItem("cookie_consent");
        if (!consent) {
            // Small delay for better UX
            const timer = setTimeout(() => setIsVisible(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem("cookie_consent", "accepted");
        setIsVisible(false);
    };

    const handleReject = () => {
        localStorage.setItem("cookie_consent", "rejected");
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="fixed bottom-0 left-0 right-0 z-100 p-4 md:p-6"
                >
                    <div className="max-w-7xl mx-auto w-full">
                        <div className="bg-white/90 dark:bg-black/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-white/20 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">

                            {/* Text Content */}
                            <div className="flex items-start gap-4 flex-1">
                                <div className="p-3 bg-bravita-orange/10 rounded-full shrink-0">
                                    <Cookie className="w-6 h-6 text-bravita-orange" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                                        {t('cookie_consent.title')}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl">
                                        {t('cookie_consent.description')}
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-row gap-3 w-full md:w-auto shrink-0">
                                <Button
                                    variant="outline"
                                    onClick={handleReject}
                                    className="flex-1 md:flex-none border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    {t('cookie_consent.reject')}
                                </Button>
                                <Button
                                    onClick={handleAccept}
                                    className="flex-1 md:flex-none bg-bravita-orange hover:bg-bravita-orange/90 text-white shadow-lg shadow-bravita-orange/20"
                                >
                                    {t('cookie_consent.accept')}
                                </Button>
                            </div>

                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CookieConsent;
