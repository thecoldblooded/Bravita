import { useState, useEffect, useMemo, useRef, lazy, Suspense, useCallback, memo } from "react";
import { Link, useLocation } from "react-router-dom";
import { NavBar } from "@/components/ui/tubelight-navbar";
import { Home, Heart, List, HelpCircle, Info, ChevronUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { m, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { UserMenu } from "@/components/auth/UserMenu";
import { IncompleteProfileBanner } from "@/components/IncompleteProfileBanner";
import { useCart } from "@/contexts/CartContext";
const FloatingSupport = lazy(() => import("@/components/FloatingSupport"));
import trFlag from "flag-icons/flags/4x3/tr.svg";
import usFlag from "flag-icons/flags/4x3/us.svg";

const AuthModal = lazy(() => import("@/components/auth/AuthModal").then((module) => ({ default: module.AuthModal })));
const CartModal = lazy(() => import("@/components/ui/CartModal").then((module) => ({ default: module.CartModal })));

type HeaderNavItem = {
  name: string;
  id: string;
  url: string;
  icon: LucideIcon;
  onClick?: () => void;
};

type ScrollState = {
  isScrolled: boolean;
  showBackToTop: boolean;
  activeTab: string;
};

type I18nApi = ReturnType<typeof useTranslation>["i18n"];

const BravitaLogo = ({ isScrolled }: { isScrolled: boolean }) => {
  const letters = useMemo(
    () => [
      { id: "b", char: "B", color: "text-[#EE4036]", rotate: "-rotate-3", spacing: 0 },
      { id: "r", char: "R", color: "text-[#F68B28]", rotate: "-rotate-1", spacing: -0.15 },
      { id: "a1", char: "A", color: "text-[#FDB813]", rotate: "rotate-1", spacing: -0.13 },
      { id: "v", char: "V", color: "text-[#CDDC39]", rotate: "-rotate-2", spacing: -0.155 },
      { id: "i", char: "i", color: "text-[#4CAF50]", rotate: "rotate-2", spacing: -0.12 },
      { id: "t", char: "T", color: "text-[#00ADEF]", rotate: "rotate-1", spacing: -0.06 },
      { id: "a2", char: "A", color: "text-[#9E499B]", rotate: "rotate-3", spacing: -0.17 },
    ],
    [],
  );

  return (
    <div
      className={cn(
        "flex items-center font-['Baloo_2'] font-black leading-none select-none tracking-tight text-4xl lg:text-5xl xl:text-[3.5rem] transition-all duration-500 ease-in-out origin-left",
        isScrolled ? "scale-[0.85] lg:scale-[0.8]" : "scale-100",
      )}
    >
      {letters.map((letter, index) => (
        <m.span
          key={letter.id}
          className={cn(letter.color, letter.rotate, "relative inline-block origin-bottom")}
          style={{
            WebkitTextStroke: "2px black",
            paintOrder: "stroke fill",
            textShadow: "2px 2px 0px rgba(0,0,0,0.1)",
            scaleX: 0.75,
            marginLeft: `${letter.spacing}em`,
          }}
          animate={{ y: [0, -12, 0], scale: [1, 1.05, 1] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.5,
            repeatDelay: (letters.length - 1) * 0.5,
          }}
        >
          {letter.char === "i" ? <span className="relative inline-block">i</span> : letter.char}
        </m.span>
      ))}
    </div>
  );
};

function useHeaderScrollState(navItems: HeaderNavItem[]): ScrollState {
  const [scrollState, setScrollState] = useState<ScrollState>({
    isScrolled: false,
    showBackToTop: false,
    activeTab: "home",
  });

  const sectionTopOffsetsRef = useRef<Array<{ id: string; top: number }>>([]);
  const scrollFrameRef = useRef<number | null>(null);
  const measureFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const refreshSectionOffsets = () => {
      sectionTopOffsetsRef.current = navItems
        .filter((item) => item.id !== "home")
        .map((item) => {
          const sectionElement = document.getElementById(item.id);
          if (!sectionElement) return null;

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

      const scrollPosition = currentScrollY + 200;
      let currentSectionId = "home";

      for (const section of sectionTopOffsetsRef.current) {
        if (scrollPosition >= section.top) {
          currentSectionId = section.id;
        } else {
          break;
        }
      }

      if (currentScrollY < 100) {
        currentSectionId = "home";
      }

      setScrollState((prev) => {
        if (
          prev.isScrolled !== shouldShowCompactHeader ||
          prev.showBackToTop !== shouldShowBackToTopButton ||
          prev.activeTab !== currentSectionId
        ) {
          return {
            isScrolled: shouldShowCompactHeader,
            showBackToTop: shouldShowBackToTopButton,
            activeTab: currentSectionId,
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

    const resizeObserver = new ResizeObserver(() => {
      requestSectionMeasure();
    });
    resizeObserver.observe(document.body);

    return () => {
      window.removeEventListener("scroll", requestScrollUpdate);
      window.removeEventListener("resize", requestSectionMeasure);
      resizeObserver.disconnect();

      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }

      if (measureFrameRef.current !== null) {
        window.cancelAnimationFrame(measureFrameRef.current);
      }
    };
  }, [navItems]);

  return scrollState;
}

function useCookieConsentPending() {
  const [isCookieConsentPending, setIsCookieConsentPending] = useState(false);

  useEffect(() => {
    const readPendingConsent = () => {
      try {
        return !localStorage.getItem("cookie_consent");
      } catch {
        return false;
      }
    };

    const syncPendingConsent = (pendingOverride?: boolean) => {
      setIsCookieConsentPending(typeof pendingOverride === "boolean" ? pendingOverride : readPendingConsent());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "cookie_consent") {
        syncPendingConsent();
      }
    };

    const handleCookieConsentUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ pending?: boolean }>;
      syncPendingConsent(customEvent.detail?.pending);
    };

    syncPendingConsent();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("cookie-consent-updated", handleCookieConsentUpdate as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("cookie-consent-updated", handleCookieConsentUpdate as EventListener);
    };
  }, []);

  return isCookieConsentPending;
}

function useCurrentLanguage(i18n: I18nApi) {
  const getCurrentLanguage = () => {
    const storedLang = localStorage.getItem("i18nextLng");
    return storedLang || i18n.language || "tr";
  };

  const [currentLang, setCurrentLang] = useState(getCurrentLanguage);

  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLang(i18n.language || "tr");
    };

    i18n.on("languageChanged", handleLanguageChange);

    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, [i18n]);

  const toggleLanguage = () => {
    const nextLang = currentLang?.startsWith("tr") ? "en" : "tr";
    void i18n.changeLanguage(nextLang);
    setCurrentLang(nextLang);
  };

  return { currentLang, toggleLanguage };
}

interface HeaderLogoProps {
  pathname: string;
  isScrolled: boolean;
  onScrollTop: () => void;
}

const HeaderLogo = memo(({ pathname, isScrolled, onScrollTop }: HeaderLogoProps) => {
  if (pathname === "/") {
    return (
      <button type="button" className="inline-block bg-transparent border-0 p-0" onClick={onScrollTop}>
        <BravitaLogo isScrolled={isScrolled} />
      </button>
    );
  }

  return (
    <Link to="/" className="inline-block">
      <BravitaLogo isScrolled={isScrolled} />
    </Link>
  );
});

HeaderLogo.displayName = "HeaderLogo";

interface LanguageToggleButtonProps {
  isScrolled: boolean;
  currentFlagSrc: string;
  currentFlagAlt: string;
  languageToggleLabel: string;
  onToggleLanguage: () => void;
}

const LanguageToggleButton = memo(({
  isScrolled,
  currentFlagSrc,
  currentFlagAlt,
  languageToggleLabel,
  onToggleLanguage,
}: LanguageToggleButtonProps) => {
  return (
    <m.button
      onClick={onToggleLanguage}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      aria-label={languageToggleLabel}
      title={languageToggleLabel}
      className={cn(
        "flex items-center justify-center p-2 rounded-full transition-all duration-300 border overflow-hidden",
        isScrolled
          ? "bg-orange-50 border-orange-100 hover:bg-orange-100 text-orange-600"
          : "bg-white/80 border-white/50 hover:bg-white shadow-sm backdrop-blur-md text-neutral-800",
      )}
    >
      <img
        src={currentFlagSrc}
        alt={currentFlagAlt}
        className="h-5 w-7 rounded-[3px] shrink-0 object-cover shadow-sm"
        loading="eager"
        decoding="sync"
      />
    </m.button>
  );
});

LanguageToggleButton.displayName = "LanguageToggleButton";

interface HeaderActionButtonsProps {
  isScrolled: boolean;
  isAuthenticated: boolean;
  isUserReady: boolean;
  isProfileCompletionBlocked: boolean;
  buyLabel: string;
  loginLabel: string;
  profileCompletionRequiredTitle: string;
  onBuyClick: () => void;
  onOpenAuthModal: () => void;
}

const HeaderActionButtons = memo(({
  isScrolled,
  isAuthenticated,
  isUserReady,
  isProfileCompletionBlocked,
  buyLabel,
  loginLabel,
  profileCompletionRequiredTitle,
  onBuyClick,
  onOpenAuthModal,
}: HeaderActionButtonsProps) => {
  return (
    <div className="flex items-center gap-2 md:gap-4">
      {isUserReady || !isAuthenticated ? (
        <button
          type="button"
          onClick={onBuyClick}
          disabled={isProfileCompletionBlocked}
          className={cn(
            "px-4 md:px-6 py-2.5 rounded-full font-black text-sm transition-all duration-300 active:scale-95 shadow-lg whitespace-nowrap",
            isProfileCompletionBlocked
              ? isScrolled
                ? "bg-gray-400 text-gray-600 shadow-gray-200/50 cursor-not-allowed opacity-60"
                : "bg-gray-200 text-gray-500 shadow-gray-200/30 cursor-not-allowed opacity-60"
              : isScrolled
                ? "bg-orange-600 text-white shadow-orange-200/50 hover:bg-orange-700 cursor-pointer"
                : "bg-white text-orange-600 shadow-gray-200/30 hover:bg-gray-50 cursor-pointer",
          )}
          title={isProfileCompletionBlocked ? profileCompletionRequiredTitle : ""}
        >
          {buyLabel}
        </button>
      ) : null}

      {isUserReady && <UserMenu />}

      {!isAuthenticated && (
        <m.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(event) => {
            if (event.currentTarget?.blur) {
              event.currentTarget.blur();
            }
            onOpenAuthModal();
          }}
          className={cn(
            "px-3 md:px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 active:scale-95 border cursor-pointer",
            isScrolled
              ? "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 shadow-sm"
              : "bg-orange-100/50 border-orange-200 text-orange-700 hover:bg-orange-100",
          )}
        >
          {loginLabel}
        </m.button>
      )}
    </div>
  );
});

HeaderActionButtons.displayName = "HeaderActionButtons";

interface HeaderPrimaryBarProps {
  pathname: string;
  isScrolled: boolean;
  hideNavigation: boolean;
  navItems: HeaderNavItem[];
  activeName: string;
  currentFlagSrc: string;
  currentFlagAlt: string;
  languageToggleLabel: string;
  isAuthenticated: boolean;
  isUserReady: boolean;
  isProfileCompletionBlocked: boolean;
  buyLabel: string;
  loginLabel: string;
  profileCompletionRequiredTitle: string;
  onScrollTop: () => void;
  onToggleLanguage: () => void;
  onBuyClick: () => void;
  onOpenAuthModal: () => void;
}

const HeaderPrimaryBar = memo(({
  pathname,
  isScrolled,
  hideNavigation,
  navItems,
  activeName,
  currentFlagSrc,
  currentFlagAlt,
  languageToggleLabel,
  isAuthenticated,
  isUserReady,
  isProfileCompletionBlocked,
  buyLabel,
  loginLabel,
  profileCompletionRequiredTitle,
  onScrollTop,
  onToggleLanguage,
  onBuyClick,
  onOpenAuthModal,
}: HeaderPrimaryBarProps) => {
  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        isScrolled ? "bg-white/40 backdrop-blur-lg shadow-xl py-2 border-b border-white/30" : "bg-transparent py-4",
      )}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="shrink-0">
          <HeaderLogo pathname={pathname} isScrolled={isScrolled} onScrollTop={onScrollTop} />
        </div>

        <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2">
          {!hideNavigation && <NavBar items={navItems} activeTab={activeName} layoutId="desktop-nav" />}
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <LanguageToggleButton
            isScrolled={isScrolled}
            currentFlagSrc={currentFlagSrc}
            currentFlagAlt={currentFlagAlt}
            languageToggleLabel={languageToggleLabel}
            onToggleLanguage={onToggleLanguage}
          />

          <HeaderActionButtons
            isScrolled={isScrolled}
            isAuthenticated={isAuthenticated}
            isUserReady={isUserReady}
            isProfileCompletionBlocked={isProfileCompletionBlocked}
            buyLabel={buyLabel}
            loginLabel={loginLabel}
            profileCompletionRequiredTitle={profileCompletionRequiredTitle}
            onBuyClick={onBuyClick}
            onOpenAuthModal={onOpenAuthModal}
          />
        </div>
      </div>
    </header>
  );
});

HeaderPrimaryBar.displayName = "HeaderPrimaryBar";

interface HeaderMobileNavProps {
  hideNavigation: boolean;
  navItems: HeaderNavItem[];
  activeName: string;
}

function HeaderMobileNav({ hideNavigation, navItems, activeName }: HeaderMobileNavProps) {
  if (hideNavigation) {
    return null;
  }

  return (
    <div className="lg:hidden">
      <NavBar
        items={navItems}
        activeTab={activeName}
        layoutId="mobile-nav"
        className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50"
      />
    </div>
  );
}

interface HeaderFloatingActionsProps {
  isProfilePage: boolean;
  isCheckoutPage: boolean;
  isCookieConsentPending: boolean;
  showBackToTop: boolean;
  termsLabel: string;
  privacyLabel: string;
  onBackToTop: () => void;
}

function HeaderFloatingActions({
  isProfilePage,
  isCheckoutPage,
  isCookieConsentPending,
  showBackToTop,
  termsLabel,
  privacyLabel,
  onBackToTop,
}: HeaderFloatingActionsProps) {
  return (
    <>
      {!isProfilePage && !isCheckoutPage && (
        <div
          className={cn(
            "fixed z-9999 flex flex-col gap-1.5 items-end pointer-events-none right-3 sm:right-4 md:right-7",
            isCookieConsentPending
              ? "bottom-[calc(env(safe-area-inset-bottom,0px)+13rem)] lg:bottom-[calc(env(safe-area-inset-bottom,0px)+10.5rem)]"
              : "bottom-[calc(env(safe-area-inset-bottom,0px)+9rem)] lg:bottom-[calc(env(safe-area-inset-bottom,0px)+4.75rem)]",
          )}
        >
          <div className="pointer-events-auto">
            <Suspense fallback={null}>
              <FloatingSupport />
            </Suspense>
          </div>

          <div className="pointer-events-auto max-w-[min(11.75rem,calc(100vw-1rem))] lg:max-w-none rounded-[0.95rem] border border-white/12 bg-zinc-900/60 p-1 backdrop-blur-lg shadow-[0_10px_22px_rgba(0,0,0,0.24)]">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-end gap-1">
              <Link
                to="/kullanim-kosullari"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-[0.72rem] px-2 py-1 text-[8.5px] min-[360px]:text-[9px] lg:text-[10.5px] font-semibold tracking-[0.01em] leading-none text-orange-50/90 bg-white/6 hover:bg-orange-500/24 hover:text-white transition-all duration-200"
              >
                {termsLabel}
              </Link>
              <Link
                to="/gizlilik-politikasi"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-[0.72rem] px-2 py-1 text-[8.5px] min-[360px]:text-[9px] lg:text-[10.5px] font-semibold tracking-[0.01em] leading-none text-orange-50/90 bg-white/6 hover:bg-orange-500/24 hover:text-white transition-all duration-200"
              >
                {privacyLabel}
              </Link>
            </div>
          </div>
        </div>
      )}

      <div
        className={cn(
          "fixed z-9999 flex items-end pointer-events-none right-3 sm:right-4 md:right-7",
          isCookieConsentPending
            ? "bottom-[calc(env(safe-area-inset-bottom,0px)+7.25rem)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)]"
            : "bottom-[calc(env(safe-area-inset-bottom,0px)+0.9rem)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+1.1rem)]",
        )}
      >
        <AnimatePresence>
          {showBackToTop && (
            <m.button
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.94 }}
              onClick={onBackToTop}
              aria-label="Sayfanın üstüne çık"
              className="pointer-events-auto bg-linear-to-br from-orange-500 to-orange-600 text-white p-[0.38rem] md:p-[0.55rem] rounded-full border border-white/30 shadow-[0_7px_14px_rgba(234,88,12,0.30)] hover:from-orange-600 hover:to-orange-700 transition-all duration-300 group"
            >
              <ChevronUp className="w-3 h-3 md:w-4 md:h-4 group-hover:-translate-y-0.5 transition-transform" />
            </m.button>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

interface HeaderModalsProps {
  isAuthenticated: boolean;
  authModalOpen: boolean;
  isCartOpen: boolean;
  onAuthModalChange: (open: boolean) => void;
  onCartModalChange: (open: boolean) => void;
}

function HeaderModals({
  isAuthenticated,
  authModalOpen,
  isCartOpen,
  onAuthModalChange,
  onCartModalChange,
}: HeaderModalsProps) {
  return (
    <Suspense fallback={null}>
      {!isAuthenticated && <AuthModal open={authModalOpen} onOpenChange={onAuthModalChange} defaultTab="login" />}

      <CartModal open={isCartOpen} onOpenChange={onCartModalChange} />
    </Suspense>
  );
}

const Header = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { isAuthenticated, user, refreshUserProfile } = useAuth();
  const { isCartOpen, openCart, setIsCartOpen } = useCart();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const isCookieConsentPending = useCookieConsentPending();
  const { currentLang, toggleLanguage } = useCurrentLanguage(i18n);

  const navItems = useMemo<HeaderNavItem[]>(
    () => [
      { name: t("nav.home"), id: "home", url: "#hero", icon: Home, onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
      { name: t("nav.benefits"), id: "benefits", url: "#benefits", icon: Heart },
      { name: t("nav.ingredients"), id: "ingredients", url: "#ingredients", icon: List },
      { name: t("nav.usage"), id: "usage", url: "#usage", icon: HelpCircle },
      { name: t("nav.about"), id: "about", url: "#about", icon: Info },
    ],
    [t],
  );

  const { isScrolled, showBackToTop, activeTab } = useHeaderScrollState(navItems);

  const pathname = location.pathname;
  const normalizedPathname = pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
  const isProfilePage = normalizedPathname === "/profile";
  const isCheckoutPage = normalizedPathname === "/checkout";
  const isLegalRoute = normalizedPathname === "/gizlilik-politikasi" || normalizedPathname === "/kullanim-kosullari";
  const isLegalHash = normalizedPathname === "/" && location.hash.startsWith("#legal:");
  const hideNavigation = isProfilePage || isCheckoutPage || isLegalRoute || isLegalHash;
  const isUserReady = isAuthenticated && !!user;
  const isStubUser = (user as { isStub?: boolean } | null)?.isStub === true;
  const isProfileCompletionBlocked = isAuthenticated && !!user && !isStubUser && !user.profile_complete;

  const activeName = navItems.find((item) => item.id === activeTab)?.name || navItems[0]?.name || "";
  const isTurkishSelected = currentLang?.startsWith("tr");
  const currentFlagSrc = isTurkishSelected ? trFlag : usFlag;
  const currentFlagAlt = isTurkishSelected ? "Turkiye" : "United States";
  const languageToggleLabel = isTurkishSelected ? "Switch language to English" : "Dili Turkceye cevir";

  const handleScrollTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleOpenAuthModal = useCallback(() => {
    setAuthModalOpen(true);
  }, []);

  const handleBuyClick = useCallback(() => {
    if (isAuthenticated) {
      if (!user) {
        return;
      }

      if (isStubUser) {
        void refreshUserProfile();
        openCart();
        return;
      }

      if (user.profile_complete) {
        openCart();
      }

      return;
    }

    setAuthModalOpen(true);
  }, [isAuthenticated, user, isStubUser, refreshUserProfile, openCart]);

  return (
    <>
      <HeaderPrimaryBar
        pathname={pathname}
        isScrolled={isScrolled}
        hideNavigation={hideNavigation}
        navItems={navItems}
        activeName={activeName}
        currentFlagSrc={currentFlagSrc}
        currentFlagAlt={currentFlagAlt}
        languageToggleLabel={languageToggleLabel}
        isAuthenticated={isAuthenticated}
        isUserReady={isUserReady}
        isProfileCompletionBlocked={isProfileCompletionBlocked}
        buyLabel={t("nav.buy")}
        loginLabel={t("auth.login")}
        profileCompletionRequiredTitle={t("auth.profile_completion_required")}
        onScrollTop={handleScrollTop}
        onToggleLanguage={toggleLanguage}
        onBuyClick={handleBuyClick}
        onOpenAuthModal={handleOpenAuthModal}
      />

      <IncompleteProfileBanner />

      <HeaderMobileNav hideNavigation={hideNavigation} navItems={navItems} activeName={activeName} />

      <HeaderFloatingActions
        isProfilePage={isProfilePage}
        isCheckoutPage={isCheckoutPage}
        isCookieConsentPending={isCookieConsentPending}
        showBackToTop={showBackToTop}
        termsLabel={t("footer.legal_terms")}
        privacyLabel={t("footer.legal_privacy")}
        onBackToTop={handleScrollTop}
      />

      <HeaderModals
        isAuthenticated={isAuthenticated}
        authModalOpen={authModalOpen}
        isCartOpen={isCartOpen}
        onAuthModalChange={setAuthModalOpen}
        onCartModalChange={setIsCartOpen}
      />
    </>
  );
};

export default Header;
