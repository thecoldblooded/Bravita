import { useState, useEffect } from "react";
import bravitaLogo from "@/assets/bravita-logo.png";
import { NavBar } from "@/components/ui/tubelight-navbar";
import { Home, Heart, List, HelpCircle, Info, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('Merhaba');
  const [showBackToTop, setShowBackToTop] = useState(false);

  const navItems = [
    { name: 'Merhaba', url: '#hero', icon: Home, onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    { name: 'Faydaları', url: '#benefits', icon: Heart },
    { name: 'İçindekiler', url: '#ingredients', icon: List },
    { name: 'Kullanım', url: '#usage', icon: HelpCircle },
    { name: 'Hakkında', url: '#about', icon: Info }
  ]

  useEffect(() => {
    const handleScroll = () => {
      // Header and Back to Top visibility
      setIsScrolled(window.scrollY > 50);
      setShowBackToTop(window.scrollY > 400);

      // Active section detection
      const scrollPosition = window.scrollY + 150; // Use a slightly larger offset for detection

      let currentSection = 'Merhaba';

      // Calculate active section by checking distance to top of each section
      const sections = navItems.map(item => {
        const id = item.url.replace('#', '');
        return { name: item.name, id };
      });

      for (const section of sections) {
        if (section.id === 'hero' || section.id === '') continue;

        const element = document.getElementById(section.id);
        if (element) {
          const top = element.offsetTop;
          // If we've scrolled past the top of the section, mark it as active
          if (scrollPosition >= top) {
            currentSection = section.name;
          }
        }
      }

      // Special case for very top of page
      if (window.scrollY < 100) {
        currentSection = 'Merhaba';
      }

      setActiveSection(currentSection);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
          <div className="hidden lg:flex flex-grow justify-center">
            <NavBar items={navItems} activeTab={activeSection} layoutId="desktop-nav" />
          </div>

          {/* Buy Button Container */}
          <div className="w-32 md:w-48 flex justify-end flex-shrink-0">
            <a
              href="#contact"
              className={cn(
                "px-6 py-2.5 rounded-full font-black text-sm transition-all duration-300 active:scale-95 shadow-lg whitespace-nowrap",
                isScrolled
                  ? "bg-orange-600 text-white shadow-orange-200/50"
                  : "bg-white text-orange-600 shadow-gray-200/30"
              )}
            >
              Satın Al
            </a>
          </div>
        </div>
      </header>

      {/* Mobile NavBar (Fixed bottom) */}
      <div className="lg:hidden">
        <NavBar
          items={navItems}
          activeTab={activeSection}
          layoutId="mobile-nav"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        />
      </div>

      {/* Back to Top Button */}


      {/* Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[100] bg-orange-600 text-white p-4 rounded-full shadow-2xl hover:bg-orange-700 transition-colors group"
          >
            <ChevronUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
