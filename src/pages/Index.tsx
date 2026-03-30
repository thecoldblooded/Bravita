import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Header from "@/components/layout/Header";
import Hero from "@/components/landing/Hero";
import ScrollReveal from "@/components/ui/scroll-reveal";
import LazySection from "@/components/ui/lazy-section";

// Lazy load below-the-fold components for better initial load
const Benefits = lazy(() => import("@/components/landing/Benefits"));
const ProductShowcase = lazy(() => import("@/components/landing/ProductShowcase"));
const Ingredients = lazy(() => import("@/components/landing/Ingredients"));
const Usage = lazy(() => import("@/components/landing/Usage"));
const About = lazy(() => import("@/components/landing/About"));
const Faq = lazy(() => import("@/components/landing/Faq"));
const Testimonials = lazy(() => import("@/components/landing/Testimonials"));
const Footer = lazy(() => import("@/components/layout/Footer"));

const bravitaGif = "/bravita.gif";

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
  const location = useLocation();
  const [shouldEagerLoadFooter, setShouldEagerLoadFooter] = useState(
    () => typeof window !== "undefined" && window.location.hash.startsWith("#legal:")
  );

  const canonicalUrl = "https://bravita.com.tr";
  const pageTitle = "Bravita | Çocuklar İçin Sıvı Multivitamin Takviyesi";
  const pageDescription = "Bravita, çocukların günlük gelişimini desteklemek için vitamin, mineral ve seçili besin öğeleri içeren sıvı takviye edici gıdadır.";
  const socialDescription = "Çocukların günlük gelişimini desteklemek için geliştirilen sıvı multivitamin ve mineral takviyesi.";
  const skipToContentLabel = t("accessibility.skip_to_content", "Ana içeriğe geç");
  const rawFaqItems = t("about.faq.items", { returnObjects: true }) as unknown;
  const faqItems = Array.isArray(rawFaqItems)
    ? rawFaqItems.reduce<{ question: string; answer: string }[]>((accumulator, item) => {
        if (typeof item === "object" && item !== null && "question" in item && "answer" in item) {
          const { question, answer } = item;

          if (typeof question === "string" && typeof answer === "string") {
            accumulator.push({ question, answer });
          }
        }

        return accumulator;
      }, [])
    : [];

  const benefitItems = [
    {
      name: t("benefits.items.immune.title"),
      description: t("benefits.items.immune.desc"),
      url: `${canonicalUrl}#benefits`,
    },
    {
      name: t("benefits.items.nervous.title"),
      description: t("benefits.items.nervous.desc"),
      url: `${canonicalUrl}#benefits`,
    },
    {
      name: t("benefits.items.energy.title"),
      description: t("benefits.items.energy.desc"),
      url: `${canonicalUrl}#benefits`,
    },
    {
      name: t("benefits.items.bone.title"),
      description: t("benefits.items.bone.desc"),
      url: `${canonicalUrl}#benefits`,
    },
    {
      name: t("benefits.items.vision.title"),
      description: t("benefits.items.vision.desc"),
      url: `${canonicalUrl}#benefits`,
    },
    {
      name: t("benefits.items.heart.title"),
      description: t("benefits.items.heart.desc"),
      url: `${canonicalUrl}#benefits`,
    },
  ];

  const articleBody = [
    t("hero.description"),
    t("benefits.description"),
    t("product.description"),
    t("about.description"),
    `${t("usage.dosage_child")}: ${t("usage.dosage_child_amount")}.`,
    `${t("usage.dosage_adult")}: ${t("usage.dosage_adult_amount")}.`,
    t("usage.shake"),
  ].join(" ");

  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Bravita",
    url: canonicalUrl,
    inLanguage: "tr-TR",
  };

  const organizationStructuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Bravita",
    url: canonicalUrl,
    logo: `${canonicalUrl}/apple-touch-icon.png`,
    email: "support@bravita.com.tr",
    telephone: "+90 312 328 25 26",
  };

  const productStructuredData = {
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
  };

  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonicalUrl}#article`,
    headline: pageTitle,
    description: pageDescription,
    image: [`${canonicalUrl}/og-image.webp`],
    inLanguage: "tr-TR",
    mainEntityOfPage: canonicalUrl,
    articleSection: benefitItems.map((item) => item.name),
    articleBody,
    author: {
      "@type": "Organization",
      name: "Bravita",
      url: canonicalUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Bravita",
      url: canonicalUrl,
      logo: {
        "@type": "ImageObject",
        url: `${canonicalUrl}/apple-touch-icon.png`,
      },
    },
    about: {
      "@type": "Thing",
      name: "Çocuklar için sıvı multivitamin ve mineral takviyesi",
    },
    mainEntity: {
      "@type": "Product",
      name: "Bravita Çocuklar İçin Sıvı Multivitamin",
      url: canonicalUrl,
    },
  };

  const itemListStructuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${canonicalUrl}#item-list`,
    name: "Bravita öne çıkan faydaları",
    itemListOrder: "https://schema.org/ItemListUnordered",
    numberOfItems: benefitItems.length,
    itemListElement: benefitItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      description: item.description,
      url: item.url,
    })),
  };

  const faqPageStructuredData = faqItems.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq`,
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      }
    : null;

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

  useEffect(() => {
    const hash = location.hash;

    if (!hash || hash.startsWith("#legal:")) {
      return;
    }

    let animationFrameId: number | null = null;
    let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const scrollToHashTarget = () => {
      const target = document.querySelector(hash);
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return true;
    };

    animationFrameId = window.requestAnimationFrame(() => {
      if (!scrollToHashTarget()) {
        retryTimeoutId = setTimeout(() => {
          scrollToHashTarget();
        }, 250);
      }
    });

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
      }
    };
  }, [location.hash]);

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
        <script type="application/ld+json">{JSON.stringify(websiteStructuredData)}</script>
        <script type="application/ld+json">{JSON.stringify(organizationStructuredData)}</script>
        <script type="application/ld+json">{JSON.stringify(productStructuredData)}</script>
        <script type="application/ld+json">{JSON.stringify(articleStructuredData)}</script>
        <script type="application/ld+json">{JSON.stringify(itemListStructuredData)}</script>
        {faqPageStructuredData ? (
          <script type="application/ld+json">{JSON.stringify(faqPageStructuredData)}</script>
        ) : null}
      </Helmet>
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-100 rounded-full bg-orange-500 px-4 py-3 font-bold text-white shadow-lg focus:not-sr-only"
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

        <LazySection placeholder={<SectionFallback minHeight="110vh" />} rootMargin="200px 0px">
          <Suspense fallback={<SectionFallback minHeight="110vh" />}>
            <Testimonials />
          </Suspense>
        </LazySection>

        <LazySection id="faq" className="scroll-mt-25 w-full" placeholder={<SectionFallback minHeight="55vh" />} rootMargin="250px 0px">
          <Suspense fallback={<SectionFallback minHeight="55vh" />}>
            <ScrollReveal delay={0.08}>
              <Faq />
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
