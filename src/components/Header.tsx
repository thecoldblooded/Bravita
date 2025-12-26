import { useState, useEffect } from "react";
import bravitaLogo from "@/assets/bravita-logo.png";
import { NavBar } from "@/components/ui/tubelight-navbar";
import { Home, Heart, List, HelpCircle, Info, ChevronUp, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

const Header = () => {
  const { t, i18n } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [showBackToTop, setShowBackToTop] = useState(false);

  const navItems = [
    { name: t('nav.home'), id: 'home', url: '#hero', icon: Home, onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    { name: t('nav.benefits'), id: 'benefits', url: '#benefits', icon: Heart },
    { name: t('nav.ingredients'), id: 'ingredients', url: '#ingredients', icon: List },
    { name: t('nav.usage'), id: 'usage', url: '#usage', icon: HelpCircle },
    { name: t('nav.about'), id: 'about', url: '#about', icon: Info }
  ]

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
          const top = element.offsetTop;
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
  }, [t]); // Re-run when translation changes to update activeTab names if needed, though we use ID now

  const toggleLanguage = () => {
    const currentLang = i18n.language || 'tr';
    const nextLang = currentLang.startsWith('tr') ? 'en' : 'tr';
    i18n.changeLanguage(nextLang);
  };

  // Find active name for NavBar
  const activeName = navItems.find(item => item.id === activeTab)?.name || navItems[0].name;

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          isScrolled ? "bg-white/95 backdrop-blur-md shadow-lg py-2 border-b border-orange-100" : "bg-transparent py-4"
        )}
      >
        <div className="container mx-auto px-4 flex items-center justify-between">
          {/* Logo Container */}
          <div className="shrink-0">
            <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="inline-block transition-transform duration-300 hover:scale-105">
              <img
                src={bravitaLogo}
                alt="Bravita Logo"
                className={cn(
                  "transition-all duration-500 w-auto h-auto",
                  isScrolled ? "max-h-10 md:max-h-12" : "max-h-14 md:max-h-16"
                )}
              />
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
                {i18n.language?.startsWith('tr') ? 'English' : 'Türkçe'}
              </motion.span>

              {i18n.language?.startsWith('tr') ? (
                <span className="fi fi-us fis rounded-full text-xl shrink-0" />
              ) : (
                <span className="fi fi-tr fis rounded-full text-xl shrink-0" />
              )}
            </motion.button>

            {/* Buy Button Container */}
            <div className="w-24 md:w-32 flex justify-end">
              <a
                href="#contact"
                className={cn(
                  "px-4 md:px-6 py-2.5 rounded-full font-black text-sm transition-all duration-300 active:scale-95 shadow-lg whitespace-nowrap",
                  isScrolled
                    ? "bg-orange-600 text-white shadow-orange-200/50"
                    : "bg-white text-orange-600 shadow-gray-200/30"
                )}
              >
                {t('nav.buy')}
              </a>
            </div>
          </div>
        </div>
      </header>

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
    </>
  );
};

export default Header;
