"use client";
import React from "react";
import {
  Mail,
  Phone,
  MapPin,
  Instagram,
  Facebook,
  Linkedin,

} from "lucide-react";
import { FooterBackgroundGradient, TextHoverEffect } from "@/components/ui/hover-footer";
import bravitaLogo from "@/assets/bravita-logo.png";
import valcoLogo from "@/assets/valco-logo.png";

function Footer() {
  // Footer link data
  const footerLinks = [
    {
      title: "Hızlı Linkler",
      links: [
        { label: "Faydaları", href: "#benefits" },
        { label: "İçindekiler", href: "#ingredients" },
        { label: "Kullanım", href: "#usage" },
        { label: "Hakkımızda", href: "#about" },
      ],
    },
    {
      title: "Yasal & Destek",
      links: [
        { label: "İletişim", href: "#contact" },
        { label: "Gizlilik Politikası", href: "#" },
        { label: "KVKK", href: "#" },
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
    {
      icon: <MapPin size={18} className="text-bravita-orange" />,
      text: "Çankaya, Ankara",
    },
  ];

  // Social media icons
  const socialLinks = [
    { icon: <Instagram size={20} />, label: "Instagram", href: "https://instagram.com/bravitaturkiye" },
    { icon: <Facebook size={20} />, label: "Facebook", href: "#" },
    { icon: <Linkedin size={20} />, label: "LinkedIn", href: "#" },
  ];

  return (
    <footer className="bg-[#2e241e] relative h-fit rounded-[3rem] overflow-hidden m-4 md:m-8">
      <div className="max-w-7xl mx-auto p-8 md:p-14 z-40 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-8 lg:gap-16 pb-12">

          {/* Brand section */}
          <div className="flex flex-col space-y-4 items-center md:items-start text-center md:text-left">
            <div className="flex space-x-2">
              <img src={bravitaLogo} alt="Bravita" className="h-10 brightness-0 invert" />
            </div>
            <p className="text-sm leading-relaxed text-neutral-300 max-w-xs">
              Multivitamin, Multimineral ve Aminoasit İçeren Sıvı Takviye Edici Gıda.
            </p>
            <div className="text-xs text-neutral-500">
              Kayıt No: TR-06-K-094361
            </div>
            <div>
              <img src={valcoLogo} alt="Valco İlaç" className="h-12 brightness-0 invert opacity-60 hover:opacity-100 transition-opacity" />
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
                        e.preventDefault();
                        document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' });
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
              İletişim
            </h4>
            <ul className="space-y-4 text-neutral-400">
              <li className="flex items-start space-x-3 justify-center md:justify-start">
                <span className="mt-1"><MapPin size={18} className="text-bravita-orange" /></span>
                <span className="text-sm">Prof. Dr. Ahmet Taner Kışlalı Mah. Alacaatlı Cad. No:30/5A Çankaya - Ankara</span>
              </li>
              {contactInfo.slice(0, 2).map((item, i) => (
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

          {/* Copyright */}
          <div className="text-center md:text-right">
            <p>&copy; {new Date().getFullYear()} Bravita. Tüm hakları saklıdır.</p>
            <p className="text-xs opacity-60 mt-1">Valco İlaç Arge Laboratuvar Hizmetleri</p>
          </div>
        </div>
      </div>

      {/* Text hover effect - Using the EXACT positioning classes from the demo */}
      <div className="md:flex hidden h-[30rem] -mt-20 -mb-36 pointer-events-auto justify-center items-center">
        <TextHoverEffect text="BRAVITA" className="z-50 translate-y-20 md:translate-y-0" />
      </div>

      {/* Scroll to top button - Re-added as requested implicitly by 'design I want' context if it was liked */}
      {/* Scroll to top button removed as per user request */}

      <FooterBackgroundGradient />
    </footer>
  );
}

export default Footer;
