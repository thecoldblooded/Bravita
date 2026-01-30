"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Instagram,
  Facebook,
  Linkedin,
  Users,
} from "lucide-react";
import { FooterBackgroundGradient, TextHoverEffect } from "./ui/hover-footer";
import { useTranslation } from "react-i18next";
import { FreeVisitorCounter } from "@rundevelrun/free-visitor-counter";

// Lazy load heavy logos
const bravitaLogo = new URL("../assets/bravita-logo.webp", import.meta.url).href;
const valcoLogo = new URL("../assets/valco-logo.webp", import.meta.url).href;

const VISITOR_SESSION_KEY = "bravita_visitor_counted";

function Footer() {
  const { t } = useTranslation();
  const [isInView, setIsInView] = useState(false);
  const footerRef = useRef<HTMLElement>(null);

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
        { label: t('footer.contact'), href: "#contact" },
        { label: t('footer.privacy'), href: "#" },
        { label: t('footer.kvkk'), href: "#" },
      ],
    },
  ];

  // Contact info data
  const contactInfo = [
    {
      icon: <Mail size={18} className="text-bravita-orange" />,
      text: "info@valcoilac.com.tr",
      href: "mailto:info@valcoilac.com.tr",
    },
    {
      icon: <Phone size={18} className="text-bravita-orange" />,
      text: "0312 238 18 68",
      href: "tel:+903122381868",
    },
  ];

  // Social media icons
  const socialLinks = [
    { icon: <Instagram size={20} />, label: "Instagram", href: "https://instagram.com/bravitaturkiye" },
    { icon: <Facebook size={20} />, label: "Facebook", href: "#" },
    { icon: <Linkedin size={20} />, label: "LinkedIn", href: "#" },
  ];

  return (
    <footer ref={footerRef} className="bg-[#2e241e] relative h-fit rounded-[3rem] overflow-hidden m-4 md:m-8">
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
                {section.links.map((link) => (
                  <li key={link.label} className="relative">
                    <a
                      href={link.href}
                      onClick={(e) => {
                        if (link.href.startsWith("#") && document.querySelector(link.href)) {
                          e.preventDefault();
                          document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className="text-neutral-400 hover:text-bravita-orange transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
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
              {contactInfo.map((item, i) => (
                <li key={i} className="flex items-center space-x-3 justify-center md:justify-start">
                  {item.icon}
                  {item.href ? (
                    <a
                      href={item.href}
                      className="hover:text-bravita-orange transition-colors"
                    >
                      {item.text}
                    </a>
                  ) : (
                    <span className="hover:text-bravita-orange transition-colors">
                      {item.text}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>



        {/* Footer bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center text-sm space-y-4 md:space-y-0 text-neutral-400">
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
            <p className="text-xs opacity-60 mt-1">Valco İlaç Arge Laboratuvar Hizmetleri</p>
          </div>
        </div>
      </div>

      {/* Text hover effect - Using the EXACT positioning classes from the demo */}
      <div className="md:flex hidden h-120 -mt-20 -mb-36 pointer-events-auto justify-center items-center">
        <TextHoverEffect text="BRAVITA" className="z-50 translate-y-20 md:translate-y-0" />
      </div>

      <FooterBackgroundGradient />
    </footer>
  );
}

export default Footer;
