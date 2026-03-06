import { lazy, Suspense, useEffect, useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ScrollReveal from "@/components/ui/scroll-reveal";
import LazySection from "@/components/ui/lazy-section";

// Lazy load below-the-fold components for better initial load
const Benefits = lazy(() => import("@/components/Benefits"));
const ProductShowcase = lazy(() => import("@/components/ProductShowcase"));
const Ingredients = lazy(() => import("@/components/Ingredients"));
const Usage = lazy(() => import("@/components/Usage"));
const About = lazy(() => import("@/components/About"));
const Footer = lazy(() => import("@/components/Footer"));

import bravitaGif from "@/assets/bravita.gif";

const SectionFallback = ({ minHeight }: { minHeight: string }) => (
  <div className="w-full bg-[#FFFBF7]/50 flex items-center justify-center overflow-hidden" style={{ minHeight }} aria-hidden="true">
    <div className="relative w-24 h-24 opacity-40">
      <img
        src={bravitaGif}
        alt="Loading"
        className="w-full h-full object-contain"
      />
    </div>
  </div>
);

import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { t } = useTranslation();
  const [shouldEagerLoadFooter, setShouldEagerLoadFooter] = useState(
    () => typeof window !== "undefined" && window.location.hash.startsWith("#legal:")
  );

  const canonicalUrl = "https://bravita.com.tr";
  const pageTitle = "Bravita | Çocuklar İçin Sıvı Multivitamin";
  const pageDescription = "Bravita, çocukların günlük gelişimini desteklemek için vitamin, mineral ve seçili besin öğeleri içeren sıvı takviye edici gıdadır.";
  const socialDescription = "Çocukların günlük gelişimini desteklemek için geliştirilen sıvı multivitamin ve mineral takviyesi.";
  const skipToContentLabel = t("accessibility.skip_to_content", "Ana içeriğe geç");
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Bravita",
      url: canonicalUrl,
      inLanguage: "tr-TR",
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Bravita",
      url: canonicalUrl,
      logo: `${canonicalUrl}/apple-touch-icon.png`,
      email: "support@bravita.com.tr",
      telephone: "+90 312 328 25 26",
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Bravita Çocuklar İçin Sıvı Multivitamin",
      description: pageDescription,
      image: `${canonicalUrl}/og-image.webp`,
      url: canonicalUrl,
      category: "DietarySupplement",
      brand: {
        "@type": "Brand",
        name: "Bravita",
      },
    },
  ];

  useEffect(() => {
    const trackLegalHashIntent = () => {
      if (window.location.hash.startsWith("#legal:")) {
        setShouldEagerLoadFooter(true);
      }
    };

    trackLegalHashIntent();
    window.addEventListener("hashchange", trackLegalHashIntent);

    return () => {
      window.removeEventListener("hashchange", trackLegalHashIntent);
    };
  }, []);

  // Banner in Header handles incomplete profile notification
  // No auto-redirect needed

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={socialDescription} />
        <meta property="og:image" content={`${canonicalUrl}/og-image.webp`} />
        <meta property="og:image:alt" content="Bravita çocuklar için sıvı multivitamin" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Bravita" />
        <meta property="og:locale" content="tr_TR" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@Bravita" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={socialDescription} />
        <meta name="twitter:image" content={`${canonicalUrl}/og-image.webp`} />
        <meta name="twitter:image:alt" content="Bravita çocuklar için sıvı multivitamin" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-[100] rounded-full bg-orange-500 px-4 py-3 font-bold text-white shadow-lg focus:not-sr-only"
      >
        {skipToContentLabel}
      </a>
      <Header />
      <main id="main-content">
        <Hero />

        <LazySection id="benefits" className="scroll-mt-25 w-full" placeholder={<SectionFallback minHeight="70vh" />} rootMargin="500px 0px">
          <Suspense fallback={<SectionFallback minHeight="70vh" />}>
            <ScrollReveal delay={0.1}>
              <Benefits />
            </ScrollReveal>
          </Suspense>
        </LazySection>

        <LazySection id="showcase" className="scroll-mt-25 w-full" placeholder={<SectionFallback minHeight="70vh" />} rootMargin="450px 0px">
          <Suspense fallback={<SectionFallback minHeight="70vh" />}>
            <ScrollReveal delay={0.2}>
              <ProductShowcase />
            </ScrollReveal>
          </Suspense>
        </LazySection>

        <LazySection id="ingredients" className="scroll-mt-25 w-full" placeholder={<SectionFallback minHeight="70vh" />} rootMargin="450px 0px">
          <Suspense fallback={<SectionFallback minHeight="70vh" />}>
            <ScrollReveal delay={0.1}>
              <Ingredients />
            </ScrollReveal>
          </Suspense>
        </LazySection>

        <LazySection id="usage" className="scroll-mt-25 w-full" placeholder={<SectionFallback minHeight="90vh" />} rootMargin="350px 0px">
          <Suspense fallback={<SectionFallback minHeight="90vh" />}>
            <ScrollReveal delay={0.1}>
              <Usage />
            </ScrollReveal>
          </Suspense>
        </LazySection>

        <LazySection id="about" className="scroll-mt-25 w-full" placeholder={<SectionFallback minHeight="70vh" />} rootMargin="350px 0px">
          <Suspense fallback={<SectionFallback minHeight="70vh" />}>
            <ScrollReveal delay={0.1}>
              <About />
            </ScrollReveal>
          </Suspense>
        </LazySection>
      </main>
      {shouldEagerLoadFooter ? (
        <Suspense fallback={<SectionFallback minHeight="40vh" />}>
          <Footer />
        </Suspense>
      ) : (
        <LazySection placeholder={<SectionFallback minHeight="40vh" />} rootMargin="250px 0px">
          <Suspense fallback={<SectionFallback minHeight="40vh" />}>
            <Footer />
          </Suspense>
        </LazySection>
      )}
    </div>
  );
};

export default Index;
