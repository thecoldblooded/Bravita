"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Instagram,
  Twitter,
  Linkedin,
  Users,
} from "lucide-react";
import { FooterBackgroundGradient, TextHoverEffect } from "@/components/ui/hover-footer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { FreeVisitorCounter } from "@rundevelrun/free-visitor-counter";
import { getLegalDocuments, getLegalLocale, type LegalDocumentKey } from "@/content/legalDocuments";

// Lazy load heavy logos
const bravitaLogo = new URL("@/assets/bravita-logo.webp", import.meta.url).href;
const valcoLogo = new URL("@/assets/valco-logo.webp", import.meta.url).href;

const VISITOR_SESSION_KEY = "bravita_visitor_counted";
const LEGAL_KEYS = ["terms", "privacy", "cookies", "legalNotice", "kvkk"] as const;

const isLegalDocumentKey = (value: string): value is LegalDocumentKey =>
  (LEGAL_KEYS as readonly string[]).includes(value);

function Footer() {
  const { t, i18n } = useTranslation();
  const [isInView, setIsInView] = useState(false);
  const [activeLegalKey, setActiveLegalKey] = useState<LegalDocumentKey | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const footerRef = useRef<HTMLElement>(null);
  const legalLocale = getLegalLocale(i18n.language);
  const legalDocuments = useMemo(() => getLegalDocuments(legalLocale), [legalLocale]);
  const activeLegalDocument = activeLegalKey ? legalDocuments[activeLegalKey] : null;

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, []);


  useEffect(() => {
    const openLegalFromHash = () => {
      const hash = window.location.hash;
      if (!hash.startsWith("#legal:")) {
        return;
      }

      const hashKey = hash.replace("#legal:", "");
      if (isLegalDocumentKey(hashKey)) {
        setActiveLegalKey(hashKey);
        setIsOpen(true);
      }
    };

    openLegalFromHash();
    window.addEventListener("hashchange", openLegalFromHash);

    return () => {
      window.removeEventListener("hashchange", openLegalFromHash);
    };
  }, []);

  // Footer link data
  const footerLinks = [
    {
      title: t('footer.quick_links'),
      links: [
        { label: t('nav.benefits'), href: "#benefits" },
        { label: t('nav.ingredients'), href: "#ingredients" },
        { label: t('nav.usage'), href: "#usage" },
        { label: t('nav.about'), href: "#about" },
      ],
    },
    {
      title: t('footer.legal_support'),
      links: [
        { label: t('footer.legal_terms'), href: "#legal:terms", seoHref: "/kullanim-kosullari" },
        { label: t('footer.legal_privacy'), href: "#legal:privacy", seoHref: "/gizlilik-politikasi" },
        { label: t('footer.legal_cookies'), href: "#legal:cookies" },
        { label: t('footer.legal_notice'), href: "#legal:legalNotice" },
        { label: t('footer.kvkk'), href: "#legal:kvkk" },
      ],
    },
  ];

  // VALCO vanity decode: 8→V, 2→A, 5→L, 2→C, 6→O
  const valcoDigits = [
    { digit: "8", letter: "V" },
    { digit: "2", letter: "A" },
    { digit: "5", letter: "L" },
    { digit: "2", letter: "C" },
    { digit: "6", letter: "O" },
  ];

  // Social media icons
  const socialLinks = [
    { icon: <Instagram size={20} />, label: "Instagram", href: "https://www.instagram.com/valcoilac" },
    { icon: <Twitter size={20} />, label: "X", href: "https://x.com/valcoilac" },
    { icon: <Linkedin size={20} />, label: "LinkedIn", href: "https://www.linkedin.com/company/valco-ilaç/" },
  ];

  return (
    <footer ref={footerRef} className="bg-[#2e241e] relative z-10 h-fit rounded-[3rem] overflow-hidden m-4 md:m-8 pb-24">
      {/* Shimmer keyframe for VALCO letters */}
      <style>{`
        @keyframes valco-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .valco-shimmer-text {
          background: linear-gradient(
            90deg,
            #e8803a 0%,
            #f5c06a 25%,
            #ffdf9e 50%,
            #f5c06a 75%,
            #e8803a 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: valco-shimmer 4s linear infinite;
        }

        .valco-digit-pair {
          perspective: 600px;
        }
        
        .valco-num, .valco-letter {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          backface-visibility: hidden;
          transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .valco-letter {
          transform: rotateX(0deg);
          transition-delay: var(--stagger-delay);
        }
        .valco-num {
          transform: rotateX(-180deg);
          transition-delay: var(--stagger-delay);
        }

        /* Desktop Hover state */
        @media (hover: hover) and (pointer: fine) {
          .valco-phone-group:hover .valco-letter {
            transform: rotateX(180deg);
          }
          .valco-phone-group:hover .valco-num {
            transform: rotateX(0deg);
          }
        }

        /* Mobile Auto-cycle state (No hover) */
        @media (hover: none) {
          @keyframes autoFlipLetter {
            0%, 40% { transform: rotateX(0deg); }
            50%, 90% { transform: rotateX(180deg); }
            100% { transform: rotateX(360deg); }
          }
          @keyframes autoFlipNum {
            0%, 40% { transform: rotateX(-180deg); }
            50%, 90% { transform: rotateX(0deg); }
            100% { transform: rotateX(180deg); }
          }
          
          .valco-letter {
            animation: autoFlipLetter 6s infinite cubic-bezier(0.34, 1.56, 0.64, 1);
            animation-delay: var(--stagger-delay);
          }
          .valco-num {
            animation: autoFlipNum 6s infinite cubic-bezier(0.34, 1.56, 0.64, 1);
            animation-delay: var(--stagger-delay);
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto p-8 md:p-14 z-40 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-8 lg:gap-16 pb-12">

          {/* Brand section */}
          <div className="flex flex-col space-y-4 items-center md:items-start text-center md:text-left">
            <div className="flex space-x-2">
              {isInView ? (
                <img src={bravitaLogo} alt="Bravita" className="h-10 brightness-0 invert" loading="lazy" />
              ) : (
                <div className="h-10 w-32 bg-neutral-700/50 rounded animate-pulse" />
              )}
            </div>
            <p className="text-sm leading-relaxed text-neutral-300 max-w-xs">
              {t('footer.tagline')}
            </p>
            <div className="text-xs text-neutral-500">
              {t('footer.reg_no')}
            </div>
            <div>
              <a href="https://www.valcoilac.com.tr/" target="_blank" rel="noopener noreferrer" className="inline-block">
                {isInView ? (
                  <img src={valcoLogo} alt="Valco İlaç" className="h-12 brightness-0 invert opacity-60 hover:opacity-100 transition-opacity" loading="lazy" />
                ) : (
                  <div className="h-12 w-24 bg-neutral-700/50 rounded animate-pulse" />
                )}
              </a>
            </div>
          </div>

          {/* Footer link sections */}
          {footerLinks.map((section) => (
            <div key={section.title} className="text-center md:text-left">
              <h4 className="text-white text-lg font-semibold mb-6">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => {
                  const legalKey = link.href.startsWith("#legal:")
                    ? (link.href.replace("#legal:", "") as LegalDocumentKey)
                    : null;
                  const isLegalModalLink = legalKey !== null;
                  const isHashLink = link.href.startsWith("#") && !isLegalModalLink;
                  const isPlaceholderLink = link.href === "#";

                  if (isLegalModalLink) {
                    const legalHref =
                      "seoHref" in link && typeof link.seoHref === "string"
                        ? link.seoHref
                        : link.href;

                    return (
                      <li key={link.label} className="relative">
                        <a
                          href={legalHref}
                          onClick={(e: React.MouseEvent) => {
                            e.preventDefault();
                            setActiveLegalKey(legalKey);
                            setIsOpen(true);
                            if (window.location.hash !== `#legal:${legalKey}`) {
                              window.history.replaceState(null, "", `#legal:${legalKey}`);
                            }
                          }}
                          className="text-neutral-400 hover:text-bravita-orange transition-colors cursor-pointer"
                        >
                          {link.label}
                        </a>
                      </li>
                    );
                  }

                  if (isHashLink) {
                    return (
                      <li key={link.label} className="relative">
                        <button
                          type="button"
                          disabled={isPlaceholderLink}
                          onClick={() => {
                            if (!isPlaceholderLink) {
                              document.querySelector(link.href)?.scrollIntoView({ behavior: "smooth" });
                            }
                          }}
                          className="text-neutral-400 hover:text-bravita-orange transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {link.label}
                        </button>
                      </li>
                    );
                  }

                  return (
                    <li key={link.label} className="relative">
                      <a
                        href={encodeURI(link.href)}
                        className="text-neutral-400 hover:text-bravita-orange transition-colors"
                      >
                        {link.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Contact section */}
          <div className="text-center md:text-left">
            <h4 className="text-white text-lg font-semibold mb-6">
              {t('footer.contact')}
            </h4>
            <ul className="space-y-4 text-neutral-400">
              <li className="flex items-start space-x-3 justify-center md:justify-start">
                <span className="mt-1"><MapPin size={18} className="text-bravita-orange" /></span>
                <span className="text-sm">Prof. Dr. Ahmet Taner Kışlalı Mah. Alacaatlı Cad. No:30/5A Çankaya - Ankara</span>
              </li>

              {/* Email */}
              <li className="flex items-center space-x-3 justify-center md:justify-start">
                <Mail size={18} className="text-bravita-orange" />
                <a href="mailto:support@bravita.com.tr" className="hover:text-bravita-orange transition-colors">
                  support@bravita.com.tr
                </a>
              </li>

              {/* Creative VALCO Phone */}
              <li className="flex items-center space-x-3 justify-center md:justify-start">
                <Phone size={18} className="text-bravita-orange" />
                {/* Creative VALCO decode strip */}
                <a
                  href="tel:03123282526"
                  className="valco-phone-group flex items-center gap-0.5 group cursor-pointer no-underline"
                  aria-label="0 312 32 VALCO - 0 312 328 25 26"
                >
                  {/* Prefix digits */}
                  <span className="text-sm text-neutral-300 tracking-wider mr-1">
                    0 312 32
                  </span>
                  {/* VALCO letter-digit pairs */}
                  {valcoDigits.map((pair, i) => (
                    <span
                      key={`valco-${pair.letter}-${i}`}
                      className="valco-digit-pair relative flex w-4.5 h-6"
                      style={{ "--stagger-delay": `${i * 0.08}s` } as React.CSSProperties}
                    >
                      <span className="valco-num text-[15px] font-bold text-orange-200">
                        {pair.digit}
                      </span>
                      <span className="valco-letter">
                        <span
                          className="text-base font-black valco-shimmer-text leading-none"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        >
                          {pair.letter}
                        </span>
                      </span>
                    </span>
                  ))}
                </a>
              </li>
            </ul>
          </div>
        </div>



        {/* Bank Cards Section */}
        <div className="border-t border-white/5 py-8 flex flex-wrap justify-center items-center gap-4 md:gap-6 opacity-60 hover:opacity-100 transition-all">
          <img src={new URL("@/assets/payment-methods/bonus-card.svg", import.meta.url).href} alt="Bonus Card" width="76" className="h-auto grayscale invert hover:grayscale-0 hover:invert-0 transition-all" />
          <img src={new URL("@/assets/payment-methods/maximum.svg", import.meta.url).href} alt="Maximum" width="62" className="h-auto grayscale invert hover:grayscale-0 hover:invert-0 transition-all" />
          <img src={new URL("@/assets/payment-methods/world.svg", import.meta.url).href} alt="World" width="62" className="h-auto grayscale invert hover:grayscale-0 hover:invert-0 transition-all" />
          <img src={new URL("@/assets/payment-methods/ziraat.svg", import.meta.url).href} alt="Ziraat" width="58" className="h-auto grayscale invert hover:grayscale-0 hover:invert-0 transition-all" />
          <img src={new URL("@/assets/payment-methods/card-finans.svg", import.meta.url).href} alt="Card Finans" width="64" className="h-auto grayscale invert hover:grayscale-0 hover:invert-0 transition-all" />
          <img src={new URL("@/assets/payment-methods/axess.svg", import.meta.url).href} alt="Axess" width="43" className="h-auto grayscale invert hover:grayscale-0 hover:invert-0 transition-all" />
          <img src={new URL("@/assets/payment-methods/kuveyt-turk.svg", import.meta.url).href} alt="Kuveyt Türk" width="76" className="h-auto grayscale invert hover:grayscale-0 hover:invert-0 transition-all" />
          <img src={new URL("@/assets/payment-methods/hsbc.svg", import.meta.url).href} alt="HSBC" width="100" className="h-auto grayscale invert hover:grayscale-0 hover:invert-0 transition-all" />
          <img src={new URL("@/assets/payment-methods/union-pay.svg", import.meta.url).href} alt="Union Pay" width="30" className="h-auto grayscale invert hover:grayscale-0 hover:invert-0 transition-all" />
          <img src={new URL("@/assets/payment-methods/paraf.svg", import.meta.url).href} alt="Paraf" width="35" className="h-auto grayscale invert hover:grayscale-0 hover:invert-0 transition-all" />
          <img src={new URL("@/assets/payment-methods/visa.svg", import.meta.url).href} alt="Visa" width="45" className="h-auto grayscale invert hover:grayscale-0 hover:invert-0 transition-all" />
          <img src={new URL("@/assets/payment-methods/master-card.svg", import.meta.url).href} alt="MasterCard" width="35" className="h-auto grayscale invert hover:grayscale-0 hover:invert-0 transition-all" />
          <img src={new URL("@/assets/payment-methods/american-express.svg", import.meta.url).href} alt="American Express" width="30" className="h-auto grayscale invert hover:grayscale-0 hover:invert-0 transition-all" />
          <img src={new URL("@/assets/payment-methods/troy.svg", import.meta.url).href} alt="Troy" width="45" className="h-auto grayscale invert hover:grayscale-0 hover:invert-0 transition-all" />
        </div>

        {/* Footer bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center text-sm space-y-4 md:space-y-0 text-neutral-400 relative z-60">
          {/* Social icons */}
          <div className="flex space-x-6">
            {socialLinks.map(({ icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="hover:text-bravita-orange transition-colors"
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
              >
                {icon}
              </a>
            ))}
          </div>

          {/* Ziyaretçi Sayacı */}
          <div className="flex items-center space-x-2 bg-neutral-800/50 px-4 py-2 rounded-full">
            <Users size={16} className="text-bravita-orange" />
            <span className="text-neutral-300 text-sm">
              <FreeVisitorCounter
                className="font-semibold text-white inline"
                totalCountPrefix={`${t('footer.visitor_total')} `}
                todayCountPrefix={`${t('footer.visitor_today')} `}
                separator=" | "
                showTotalFirst={true}
              />
              {" "}{t('footer.visitor_count')}
            </span>
          </div>

          {/* Copyright */}
          <div className="text-center md:text-right">
            <p>&copy; {new Date().getFullYear()} Bravita. {t('footer.copyright')}</p>
            <p className="text-xs opacity-60 mt-1">{t('footer.valco_desc')}</p>
          </div>
        </div>
      </div>

      {/* Text hover effect - Using the EXACT positioning classes from the demo */}
      <div className="md:flex hidden h-120 -mt-20 -mb-36 justify-center items-center">
        <TextHoverEffect text="BRAVITA" className="z-50 translate-y-20 md:translate-y-0" />
      </div>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            // setTimeout to let dialog close animation finish
            setTimeout(() => {
              setActiveLegalKey(null);
            }, 300);
            if (window.location.hash.startsWith("#legal:")) {
              window.history.replaceState(
                null,
                "",
                `${window.location.pathname}${window.location.search}`
              );
            }
          }
        }}
      >
        <DialogContent
          data-lenis-prevent
          data-lenis-prevent-wheel
          data-lenis-prevent-touch
          className="max-w-3xl max-h-[85vh] overflow-y-auto border-none bg-[#1f1915] text-neutral-100 shadow-2xl [&>button]:text-neutral-300 [&>button]:hover:text-white"
        >
          {activeLegalDocument ? (
            <>
              <DialogHeader className="pr-8">
                <DialogTitle className="text-2xl font-black text-white">{activeLegalDocument.title}</DialogTitle>
                <DialogDescription className="text-neutral-300 leading-relaxed">
                  {activeLegalDocument.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 pr-1">
                {activeLegalDocument.sections.map((section) => (
                  <section key={section.heading} className="space-y-3 border-t border-white/10 pt-4 first:border-t-0 first:pt-0">
                    <h5 className="text-base md:text-lg font-bold text-white">{section.heading}</h5>

                    <div className="space-y-2">
                      {section.paragraphs.map((paragraph, paragraphIndex) => (
                        <p key={`${section.heading}-paragraph-${paragraphIndex}`} className="text-sm md:text-[15px] leading-relaxed text-neutral-200">
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {section.items && section.items.length > 0 ? (
                      <ul className="list-disc pl-5 space-y-2 text-sm md:text-[15px] text-neutral-200 leading-relaxed">
                        {section.items.map((item, itemIndex) => (
                          <li key={`${section.heading}-item-${itemIndex}`}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                ))}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <FooterBackgroundGradient />
    </footer>
  );
}

export default Footer;
