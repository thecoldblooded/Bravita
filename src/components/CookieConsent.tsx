import { useEffect, useReducer } from "react";
import { m, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

type CookieState = {
    isVisible: boolean;
    showCustomize: boolean;
    analyticsEnabled: boolean;
    functionalEnabled: boolean;
    marketingEnabled: boolean;
};

type CookieAction =
    | { type: 'SET_VISIBLE'; payload: boolean }
    | { type: 'TOGGLE_CUSTOMIZE' }
    | { type: 'SET_ANALYTICS'; payload: boolean }
    | { type: 'SET_FUNCTIONAL'; payload: boolean }
    | { type: 'SET_MARKETING'; payload: boolean }
    | { type: 'HIDE' };

const CookieConsent = () => {
    const { t } = useTranslation();
    const [state, dispatch] = useReducer(
        (state: CookieState, action: CookieAction): CookieState => {
            switch (action.type) {
                case 'SET_VISIBLE': return { ...state, isVisible: action.payload };
                case 'TOGGLE_CUSTOMIZE': return { ...state, showCustomize: !state.showCustomize };
                case 'SET_ANALYTICS': return { ...state, analyticsEnabled: action.payload };
                case 'SET_FUNCTIONAL': return { ...state, functionalEnabled: action.payload };
                case 'SET_MARKETING': return { ...state, marketingEnabled: action.payload };
                case 'HIDE': return { ...state, isVisible: false };
                default: return state;
            }
        },
        {
            isVisible: false,
            showCustomize: false,
            analyticsEnabled: true,
            functionalEnabled: true,
            marketingEnabled: false,
        }
    );

    useEffect(() => {
        // Check if user has already made a choice
        const consent = localStorage.getItem("cookie_consent");
        if (!consent) {
            // Small delay for better UX
            const timer = setTimeout(() => dispatch({ type: 'SET_VISIBLE', payload: true }), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem("cookie_consent", "accepted");
        localStorage.setItem(
            "cookie_preferences",
            JSON.stringify({
                necessary: true,
                analytics: true,
                functional: true,
                marketing: true,
            })
        );
        dispatch({ type: 'HIDE' });
        window.dispatchEvent(new CustomEvent("cookie-consent-updated", { detail: { pending: false } }));
    };

    const handleReject = () => {
        // Keep this as a temporary dismissal only.
        // On next page load, banner should be shown again.
        localStorage.removeItem("cookie_consent");
        localStorage.removeItem("cookie_preferences");
        dispatch({ type: 'HIDE' });
        window.dispatchEvent(new CustomEvent("cookie-consent-updated", { detail: { pending: false } }));
    };

    const handleCustomize = () => {
        dispatch({ type: 'TOGGLE_CUSTOMIZE' });
    };

    const handleSavePreferences = () => {
        localStorage.setItem("cookie_consent", "customized");
        localStorage.setItem(
            "cookie_preferences",
            JSON.stringify({
                necessary: true,
                analytics: state.analyticsEnabled,
                functional: state.functionalEnabled,
                marketing: state.marketingEnabled,
            })
        );
        dispatch({ type: 'HIDE' });
        window.dispatchEvent(new CustomEvent("cookie-consent-updated", { detail: { pending: false } }));
    };

    return (
        <AnimatePresence>
            {state.isVisible && (
                <m.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="fixed z-998 left-3 right-3 sm:left-4 sm:right-4 md:left-6 md:right-auto lg:left-8 w-auto md:w-[min(780px,calc(100vw-28rem))]"
                    style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }}
                >
                    <div className="w-full">
                        <div className="relative overflow-hidden rounded-[26px] border border-orange-300/20 bg-[#171821]/96 backdrop-blur-xl shadow-2xl p-5 md:p-6">
                            <div
                                className="pointer-events-none absolute inset-y-0 left-0 w-[66%] bg-linear-to-br from-[#22232d]/95 via-[#1c1f29]/92 to-[#15171f]/88"
                                style={{ clipPath: "polygon(0 0, 82% 0, 62% 100%, 0 100%)" }}
                            />
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(246,139,40,0.18)_0%,rgba(246,139,40,0)_42%),radial-gradient(circle_at_18%_100%,rgba(253,184,19,0.14)_0%,rgba(253,184,19,0)_45%)]" />
                            <Cookie className="pointer-events-none absolute right-5 top-4 w-11 h-11 text-orange-200/20" />

                            <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-5 xl:gap-6 items-start">
                                <div className="xl:col-span-7 space-y-3">
                                    <h3 className="font-extrabold text-2xl sm:text-3xl md:text-4xl leading-tight text-zinc-100">
                                        {t('cookie_consent.title')}
                                    </h3>
                                    <p className="text-sm md:text-[15px] leading-relaxed text-zinc-300">
                                        {t('cookie_consent.description')}
                                    </p>
                                    <a href="/#legal:cookies" className="inline-block font-semibold text-orange-200 underline underline-offset-4 hover:text-orange-100 transition-colors">
                                        {t('footer.legal_cookies')}
                                    </a>
                                </div>

                                <div className="xl:col-span-5 flex flex-col gap-3 xl:items-end">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3 w-full xl:w-auto">
                                        <Button
                                            variant="ghost"
                                            onClick={handleCustomize}
                                            className="h-11 px-4 rounded-xl text-zinc-100 hover:bg-orange-500/15 hover:text-orange-100 whitespace-nowrap"
                                        >
                                            {t('cookie_consent.customize')}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={handleReject}
                                            className="h-11 px-4 rounded-xl text-zinc-100 hover:bg-orange-500/15 hover:text-orange-100 whitespace-nowrap"
                                        >
                                            {t('cookie_consent.reject')}
                                        </Button>
                                        <Button
                                            onClick={handleAccept}
                                            className="h-11 px-6 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 text-white hover:from-orange-400 hover:to-amber-300 shadow-lg shadow-orange-500/30 col-span-2 sm:col-span-1 whitespace-nowrap"
                                        >
                                            {t('cookie_consent.accept')}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <AnimatePresence>
                                {state.showCustomize && (
                                    <m.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="relative z-10 mt-4 rounded-xl border border-orange-200/20 bg-[#11131a]/85 p-3 md:p-4"
                                    >
                                        <p className="text-sm font-semibold text-white mb-3">
                                            {t("cookie_consent.preferences_title")}
                                        </p>

                                        <div className="space-y-2">
                                            <label className="flex items-center justify-between text-sm text-zinc-100">
                                                <span>{t("cookie_consent.necessary")}</span>
                                                <span className="text-xs px-2 py-1 rounded-md bg-white/20">{t("cookie_consent.always_on")}</span>
                                            </label>

                                            <label className="flex items-center justify-between text-sm text-zinc-100">
                                                <span>{t("cookie_consent.analytics")}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={state.analyticsEnabled}
                                                    onChange={(event) => dispatch({ type: 'SET_ANALYTICS', payload: event.target.checked })}
                                                    className="h-4 w-4 accent-orange-500"
                                                />
                                            </label>

                                            <label className="flex items-center justify-between text-sm text-zinc-100">
                                                <span>{t("cookie_consent.functional")}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={state.functionalEnabled}
                                                    onChange={(event) => dispatch({ type: 'SET_FUNCTIONAL', payload: event.target.checked })}
                                                    className="h-4 w-4 accent-orange-500"
                                                />
                                            </label>

                                            <label className="flex items-center justify-between text-sm text-zinc-100">
                                                <span>{t("cookie_consent.marketing")}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={state.marketingEnabled}
                                                    onChange={(event) => dispatch({ type: 'SET_MARKETING', payload: event.target.checked })}
                                                    className="h-4 w-4 accent-orange-500"
                                                />
                                            </label>
                                        </div>

                                        <div className="mt-3 flex justify-end">
                                            <Button
                                                onClick={handleSavePreferences}
                                                className="h-10 px-5 rounded-xl bg-white text-zinc-900 hover:bg-zinc-100"
                                            >
                                                {t("cookie_consent.save_preferences")}
                                            </Button>
                                        </div>
                                    </m.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </m.div>
            )}
        </AnimatePresence>
    );
};

export default CookieConsent;
