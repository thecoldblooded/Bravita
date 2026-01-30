import { useState, useEffect, useMemo } from "react";
import bravitaLogo from "../assets/bravita-logo.webp";
import { NavBar } from "./ui/tubelight-navbar";
import { Home, Heart, List, HelpCircle, Info, ChevronUp, Languages } from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { AuthModal } from "./auth/AuthModal";
import { UserMenu } from "./auth/UserMenu";
import { IncompleteProfileBanner } from "./IncompleteProfileBanner";
import { CartModal } from "./ui/CartModal";

const BravitaLogo = ({ isScrolled }: { isScrolled: boolean }) => {
  const letters = [
    { char: "B", color: "text-[#EE4036]", rotate: "-rotate-3", spacing: 0 },
    { char: "R", color: "text-[#F68B28]", rotate: "-rotate-1", spacing: -0.15 },
    { char: "A", color: "text-[#FDB813]", rotate: "rotate-1", spacing: -0.13 },
    { char: "V", color: "text-[#CDDC39]", rotate: "-rotate-2", spacing: -0.155 },
    { char: "i", color: "text-[#4CAF50]", rotate: "rotate-2", spacing: -0.12 },
    { char: "T", color: "text-[#00ADEF]", rotate: "rotate-1", spacing: -0.06 },
    { char: "A", color: "text-[#9E499B]", rotate: "rotate-3", spacing: -0.17 },
  ];

  return (
    <div
      className={cn(
        "flex items-center font-['Baloo_2'] font-black leading-none select-none tracking-tight text-4xl lg:text-5xl xl:text-[3.5rem] transition-all duration-500 ease-in-out origin-left",
        isScrolled ? "scale-[0.85] lg:scale-[0.8]" : "scale-100"
      )}
    >
      {letters.map((letter, index) => (
        <motion.span
          key={index}
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
            // 'i' needs special centering to look like the logo
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
  const { isAuthenticated, user, isLoading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  // Show UI once user object exists (stub or real) and auth is initialized
  const isUserReady = isAuthenticated && user;

  // Get current language immediately from localStorage to avoid flash
  const getCurrentLanguage = () => {
    const storedLang = localStorage.getItem('i18nextLng');
    return storedLang || i18n.language || 'tr';
  };

  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());

  // Update currentLang when i18n language changes
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
    const handleScroll = () => {
      // Header and Back to Top visibility
      setIsScrolled(window.scrollY > 50);
      setShowBackToTop(window.scrollY > 400);

      // Active section detection
      const scrollPosition = window.scrollY + 150;

      let currentSectionId = 'home';

      for (const item of navItems) {
        if (item.id === 'home') continue;

        const element = document.getElementById(item.id);
        if (element) {
          const top = element.getBoundingClientRect().top + window.scrollY;
          if (scrollPosition >= top) {
            currentSectionId = item.id;
          }
        }
      }

      if (window.scrollY < 100) {
        currentSectionId = 'home';
      }

      setActiveTab(currentSectionId);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [t, navItems]); // Re-run when translation changes to update activeTab names if needed, though we use ID now

  const toggleLanguage = () => {
    const currentLanguage = currentLang || 'tr';
    const nextLang = currentLanguage.startsWith('tr') ? 'en' : 'tr';
    i18n.changeLanguage(nextLang);
    setCurrentLang(nextLang);
  };

  // Find active name for NavBar
  const activeName = navItems.find(item => item.id === activeTab)?.name || navItems[0].name;

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          isScrolled ? "bg-white/40 backdrop-blur-lg shadow-xl py-2 border-b border-white/30" : "bg-transparent py-4"
        )}
      >
        <div className="container mx-auto px-4 flex items-center justify-between">
          {/* Logo Container */}
          <div className="shrink-0">
            <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="inline-block">
              <BravitaLogo isScrolled={isScrolled} />
            </a>
          </div>

          {/* Center NavBar (Desktop) */}
          <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2">
            <NavBar items={navItems} activeTab={activeName} layoutId="desktop-nav" />
          </div>

          {/* Controls Container */}
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            {/* Language Toggle */}
            <motion.button
              onClick={toggleLanguage}
              initial="closed"
              whileHover="open"
              className={cn(
                "flex items-center justify-center p-2 rounded-full transition-all duration-300 active:scale-95 border overflow-hidden",
                isScrolled
                  ? "bg-orange-50 border-orange-100 hover:bg-orange-100 text-orange-600"
                  : "bg-white/80 border-white/50 hover:bg-white shadow-sm backdrop-blur-md text-neutral-800"
              )}
            >
              <motion.span
                variants={{
                  open: { width: "auto", opacity: 1, marginRight: 8 },
                  closed: { width: 0, opacity: 0, marginRight: 0 }
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden whitespace-nowrap text-xs font-bold"
              >
                {currentLang?.startsWith('tr') ? 'Türkçe' : 'English'}
              </motion.span>

              {currentLang?.startsWith('tr') ? (
                <span className="fi fi-tr fis rounded-full text-xl shrink-0" />
              ) : (
                <span className="fi fi-us fis rounded-full text-xl shrink-0" />
              )}
            </motion.button>

            {/* Buy Button & User Menu Container */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Buy Button - Show when authenticated or not authenticated */}
              {isUserReady || !isAuthenticated ? (
                <a
                  href={!isAuthenticated ? "#contact" : undefined}
                  onClick={(e) => {
                    // If authenticated but profile not complete, prevent navigation
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (isAuthenticated && user && !(user as any).isStub && !user?.profile_complete) {
                      e.preventDefault();
                    }
                    // If authenticated and profile complete, open cart
                    if (isAuthenticated && user?.profile_complete) {
                      e.preventDefault();
                      setCartOpen(true);
                    }
                    // If not authenticated, open signup modal instead
                    if (!isAuthenticated) {
                      e.preventDefault();
                      setAuthModalOpen(true);
                    }
                  }}
                  className={cn(
                    "px-4 md:px-6 py-2.5 rounded-full font-black text-sm transition-all duration-300 active:scale-95 shadow-lg whitespace-nowrap",
                    isUserReady && !user?.profile_complete
                      ? // Profile incomplete - inactive state
                      isScrolled
                        ? "bg-gray-400 text-gray-600 shadow-gray-200/50 cursor-not-allowed opacity-60"
                        : "bg-gray-200 text-gray-500 shadow-gray-200/30 cursor-not-allowed opacity-60"
                      : // Profile complete or not authenticated - active state
                      isScrolled
                        ? "bg-orange-600 text-white shadow-orange-200/50 hover:bg-orange-700 cursor-pointer"
                        : "bg-white text-orange-600 shadow-gray-200/30 hover:bg-gray-50 cursor-pointer"
                  )}
                  title={isUserReady && !user?.profile_complete ? t("auth.profile_completion_required") : ""}
                >
                  {t('nav.buy')}
                </a>
              ) : null}

              {/* User Menu - Show when user is ready */}
              {isUserReady && <UserMenu />}

              {/* Login Button - Only show if not authenticated */}
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

      {/* Incomplete Profile Banner - Right aligned */}
      <div className="fixed top-16 md:top-20 right-4 z-40 max-w-sm">
        <IncompleteProfileBanner />
      </div>

      {/* Mobile NavBar (Fixed bottom) */}
      <div className="lg:hidden">
        <NavBar
          items={navItems}
          activeTab={activeName}
          layoutId="mobile-nav"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        />
      </div>

      {/* Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-100 bg-orange-600 text-white p-4 rounded-full shadow-2xl hover:bg-orange-700 transition-colors group"
          >
            <ChevronUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultTab="login"
      />

      <CartModal
        open={cartOpen}
        onOpenChange={setCartOpen}
      />
    </>
  );
};

export default Header;
