import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { NavBar } from "@/components/ui/tubelight-navbar";
import { Home, Heart, List, HelpCircle, Info, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { UserMenu } from "@/components/auth/UserMenu";
import { IncompleteProfileBanner } from "@/components/IncompleteProfileBanner";
import { useCart } from "@/contexts/CartContext";
const FloatingSupport = lazy(() => import("@/components/FloatingSupport"));
import trFlag from "flag-icons/flags/4x3/tr.svg";
import usFlag from "flag-icons/flags/4x3/us.svg";

// Lazy load heavy modals
const AuthModal = lazy(() => import("@/components/auth/AuthModal").then(module => ({ default: module.AuthModal })));
const CartModal = lazy(() => import("@/components/ui/CartModal").then(module => ({ default: module.CartModal })));

const BravitaLogo = ({ isScrolled }: { isScrolled: boolean }) => {
  const letters = useMemo(() => [
    { id: 'b', char: "B", color: "text-[#EE4036]", rotate: "-rotate-3", spacing: 0 },
    { id: 'r', char: "R", color: "text-[#F68B28]", rotate: "-rotate-1", spacing: -0.15 },
    { id: 'a1', char: "A", color: "text-[#FDB813]", rotate: "rotate-1", spacing: -0.13 },
    { id: 'v', char: "V", color: "text-[#CDDC39]", rotate: "-rotate-2", spacing: -0.155 },
    { id: 'i', char: "i", color: "text-[#4CAF50]", rotate: "rotate-2", spacing: -0.12 },
    { id: 't', char: "T", color: "text-[#00ADEF]", rotate: "rotate-1", spacing: -0.06 },
    { id: 'a2', char: "A", color: "text-[#9E499B]", rotate: "rotate-3", spacing: -0.17 },
  ], []);

  return (
    <div
      className={cn(
        "flex items-center font-['Baloo_2'] font-black leading-none select-none tracking-tight text-4xl lg:text-5xl xl:text-[3.5rem] transition-all duration-500 ease-in-out origin-left",
        isScrolled ? "scale-[0.85] lg:scale-[0.8]" : "scale-100"
      )}
    >
      {letters.map((letter, index) => (
        <motion.span
          key={letter.id}
          className={cn(
            letter.color,
            letter.rotate,
            "relative inline-block origin-bottom"
          )}
          style={{
            WebkitTextStroke: '2px black',
            paintOrder: 'stroke fill',
            textShadow: '2px 2px 0px rgba(0,0,0,0.1)',
            scaleX: 0.75,
            marginLeft: `${letter.spacing}em`,
          }}
          animate={{
            y: [0, -12, 0],
            scale: [1, 1.05, 1]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.5,
            repeatDelay: (letters.length - 1) * 0.5,
          }}
        >
          {letter.char === "i" ? (
            <span className="relative inline-block">
              i
            </span>
          ) : letter.char}
        </motion.span>
      ))}
    </div>
  );
};

const Header = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading } = useAuth();

  // Grouped scroll and UI state to reduce useState calls
  const [scrollState, setScrollState] = useState({
    isScrolled: false,
    showBackToTop: false,
    activeTab: 'home'
  });

  const { isScrolled, showBackToTop, activeTab } = scrollState;

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isCookieConsentPending, setIsCookieConsentPending] = useState(false);
  const sectionTopOffsetsRef = useRef<Array<{ id: string; top: number }>>([]);
  const scrollFrameRef = useRef<number | null>(null);
  const measureFrameRef = useRef<number | null>(null);
  const { isCartOpen, openCart, setIsCartOpen } = useCart();

  const isProfilePage = location.pathname === "/profile";
  const isCheckoutPage = location.pathname === "/checkout";
  const isUserReady = isAuthenticated && user;

  const getCurrentLanguage = () => {
    const storedLang = localStorage.getItem('i18nextLng');
    return storedLang || i18n.language || 'tr';
  };

  const [currentLang, setCurrentLang] = useState(getCurrentLanguage);

  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLang(i18n.language || 'tr');
    };
    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const navItems = useMemo(() => [
    { name: t('nav.home'), id: 'home', url: '#hero', icon: Home, onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    { name: t('nav.benefits'), id: 'benefits', url: '#benefits', icon: Heart },
    { name: t('nav.ingredients'), id: 'ingredients', url: '#ingredients', icon: List },
    { name: t('nav.usage'), id: 'usage', url: '#usage', icon: HelpCircle },
    { name: t('nav.about'), id: 'about', url: '#about', icon: Info }
  ], [t]);

  useEffect(() => {
    const refreshSectionOffsets = () => {
      sectionTopOffsetsRef.current = navItems
        .filter((item) => item.id !== "home")
        .map((item) => {
          const sectionElement = document.getElementById(item.id);
          if (!sectionElement) return null;
          // Calculate absolute offset by walking offsetParents
          let top = sectionElement.offsetTop;
          let parent = sectionElement.offsetParent as HTMLElement | null;
          while (parent) {
            top += parent.offsetTop;
            parent = parent.offsetParent as HTMLElement | null;
          }
          return { id: item.id, top };
        })
        .filter((section): section is { id: string; top: number } => section !== null)
        .sort((a, b) => a.top - b.top);
    };

    const updateHeaderState = () => {
      const currentScrollY = window.scrollY;
      const shouldShowCompactHeader = currentScrollY > 50;
      const shouldShowBackToTopButton = currentScrollY > 400;

      // Re-measure offsets periodically as lazy sections load and change layout
      // Optimization: Only refresh if height changed? Or just trust the raf.
      // refreshSectionOffsets(); // Keeping this might be expensive in loop

      const scrollPosition = currentScrollY + 200;
      let currentSectionId = "home";

      for (const section of sectionTopOffsetsRef.current) {
        if (scrollPosition >= section.top) {
          currentSectionId = section.id;
        } else {
          break;
        }
      }

      if (currentScrollY < 100) currentSectionId = "home";

      setScrollState(prev => {
        if (
          prev.isScrolled !== shouldShowCompactHeader ||
          prev.showBackToTop !== shouldShowBackToTopButton ||
          prev.activeTab !== currentSectionId
        ) {
          return {
            isScrolled: shouldShowCompactHeader,
            showBackToTop: shouldShowBackToTopButton,
            activeTab: currentSectionId
          };
        }
        return prev;
      });

      scrollFrameRef.current = null;
    };

    const requestScrollUpdate = () => {
      if (scrollFrameRef.current === null) {
        scrollFrameRef.current = window.requestAnimationFrame(updateHeaderState);
      }
    };

    const requestSectionMeasure = () => {
      if (measureFrameRef.current !== null) {
        window.cancelAnimationFrame(measureFrameRef.current);
      }
      measureFrameRef.current = window.requestAnimationFrame(() => {
        refreshSectionOffsets();
        requestScrollUpdate();
        measureFrameRef.current = null;
      });
    };

    requestSectionMeasure();
    window.addEventListener("scroll", requestScrollUpdate, { passive: true });
    window.addEventListener("resize", requestSectionMeasure);

    // Observer for layout changes (lazy loading, accordion expansion, etc)
    const resizeObserver = new ResizeObserver(() => {
      requestSectionMeasure();
    });
    resizeObserver.observe(document.body);

    return () => {
      window.removeEventListener("scroll", requestScrollUpdate);
      window.removeEventListener("resize", requestSectionMeasure);
      resizeObserver.disconnect();
      if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
      if (measureFrameRef.current !== null) window.cancelAnimationFrame(measureFrameRef.current);
    };
  }, [navItems]);

  useEffect(() => {
    const resolvePendingConsent = () => {
      try {
        setIsCookieConsentPending(!localStorage.getItem("cookie_consent"));
      } catch {
        setIsCookieConsentPending(false);
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "cookie_consent") resolvePendingConsent();
    };
    const handleCookieConsentUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ pending?: boolean }>;
      if (typeof customEvent.detail?.pending === "boolean") {
        setIsCookieConsentPending(customEvent.detail.pending);
      } else {
        resolvePendingConsent();
      }
    };
    resolvePendingConsent();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("cookie-consent-updated", handleCookieConsentUpdate as EventListener);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("cookie-consent-updated", handleCookieConsentUpdate as EventListener);
    };
  }, []);

  const toggleLanguage = () => {
    const nextLang = currentLang?.startsWith('tr') ? 'en' : 'tr';
    i18n.changeLanguage(nextLang);
    setCurrentLang(nextLang);
  };

  const activeName = navItems.find(item => item.id === activeTab)?.name || navItems[0].name;
  const isTurkishSelected = currentLang?.startsWith("tr");
  const currentFlagSrc = isTurkishSelected ? trFlag : usFlag;
  const currentFlagAlt = isTurkishSelected ? "Turkiye" : "United States";
  const languageToggleLabel = isTurkishSelected ? "Switch language to English" : "Dili Turkceye cevir";

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          isScrolled ? "bg-white/40 backdrop-blur-lg shadow-xl py-2 border-b border-white/30" : "bg-transparent py-4"
        )}
      >
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="shrink-0">
            <Link
              to="/"
              className="inline-block"
              onClick={(e) => {
                if (location.pathname === '/') {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
            >
              <BravitaLogo isScrolled={isScrolled} />
            </Link>
          </div>

          <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2">
            {!isProfilePage && !isCheckoutPage && <NavBar items={navItems} activeTab={activeName} layoutId="desktop-nav" />}
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <motion.button
              onClick={toggleLanguage}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              aria-label={languageToggleLabel}
              title={languageToggleLabel}
              className={cn(
                "flex items-center justify-center p-2 rounded-full transition-all duration-300 border overflow-hidden",
                isScrolled
                  ? "bg-orange-50 border-orange-100 hover:bg-orange-100 text-orange-600"
                  : "bg-white/80 border-white/50 hover:bg-white shadow-sm backdrop-blur-md text-neutral-800"
              )}
            >
              <img
                src={currentFlagSrc}
                alt={currentFlagAlt}
                className="h-5 w-7 rounded-[3px] shrink-0 object-cover shadow-sm"
                loading="eager"
                decoding="sync"
              />
            </motion.button>

            <div className="flex items-center gap-2 md:gap-4">
              {isUserReady || !isAuthenticated ? (
                <a
                  href={!isAuthenticated ? "#contact" : undefined}
                  onClick={(e) => {
                    if (isAuthenticated && user && !user?.profile_complete) {
                      e.preventDefault();
                    }
                    if (isAuthenticated && user?.profile_complete) {
                      e.preventDefault();
                      openCart();
                    }
                    if (!isAuthenticated) {
                      e.preventDefault();
                      setAuthModalOpen(true);
                    }
                  }}
                  className={cn(
                    "px-4 md:px-6 py-2.5 rounded-full font-black text-sm transition-all duration-300 active:scale-95 shadow-lg whitespace-nowrap",
                    isUserReady && !user?.profile_complete
                      ? isScrolled
                        ? "bg-gray-400 text-gray-600 shadow-gray-200/50 cursor-not-allowed opacity-60"
                        : "bg-gray-200 text-gray-500 shadow-gray-200/30 cursor-not-allowed opacity-60"
                      : isScrolled
                        ? "bg-orange-600 text-white shadow-orange-200/50 hover:bg-orange-700 cursor-pointer"
                        : "bg-white text-orange-600 shadow-gray-200/30 hover:bg-gray-50 cursor-pointer"
                  )}
                  title={isUserReady && !user?.profile_complete ? t("auth.profile_completion_required") : ""}
                >
                  {t('nav.buy')}
                </a>
              ) : null}

              {isUserReady && <UserMenu />}

              {!isAuthenticated && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setAuthModalOpen(true)}
                  className={cn(
                    "px-3 md:px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 active:scale-95 border cursor-pointer",
                    isScrolled
                      ? "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 shadow-sm"
                      : "bg-orange-100/50 border-orange-200 text-orange-700 hover:bg-orange-100"
                  )}
                >
                  {t('auth.login')}
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </header>

      <IncompleteProfileBanner />

      {!isProfilePage && !isCheckoutPage && (
        <div className="lg:hidden">
          <NavBar
            items={navItems}
            activeTab={activeName}
            layoutId="mobile-nav"
            className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50"
          />
        </div>
      )}

      <div
        className={cn(
          "fixed z-9999 flex flex-col gap-4 items-end pointer-events-none md:bottom-20 md:right-10",
          isCookieConsentPending ? "bottom-60 right-4" : "bottom-36 right-6"
        )}
      >
        {!isProfilePage && !isCheckoutPage && (
          <div className="pointer-events-auto">
            <Suspense fallback={null}>
              <FloatingSupport />
            </Suspense>
          </div>
        )}

        <AnimatePresence>
          {showBackToTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="pointer-events-auto bg-orange-600 text-white p-4 rounded-full shadow-2xl hover:bg-orange-700 transition-colors group"
            >
              <ChevronUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <Suspense fallback={null}>
        {!isAuthenticated && (
          <AuthModal
            open={authModalOpen}
            onOpenChange={setAuthModalOpen}
            defaultTab="login"
          />
        )}

        <CartModal
          open={isCartOpen}
          onOpenChange={setIsCartOpen}
        />
      </Suspense>
    </>
  );
};

export default Header;
