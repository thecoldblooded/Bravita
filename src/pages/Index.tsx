import { lazy, Suspense } from "react";
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
  // Banner in Header handles incomplete profile notification
  // No auto-redirect needed

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Bravita - Çocuklar İçin Vitamin | Bağışıklık Güçlendirici</title>
        <meta name="description" content="Bravita, çocukların sağlıklı gelişimi için gerekli vitamin ve mineralleri içeren, lezzetli ve eğlenceli çiğnenebilir formda takviye edici gıdadır." />
        <link rel="canonical" href="https://bravita.com.tr" />
        <meta property="og:title" content="Bravita - Çocuklar İçin Vitamin | Bağışıklık Güçlendirici" />
        <meta property="og:description" content="Bravita, çocukların sağlıklı gelişimi için gerekli vitamin ve mineralleri içeren, lezzetli takviye edici gıda." />
        <meta property="og:image" content="https://bravita.com.tr/og-image.jpg" />
        <meta property="og:url" content="https://bravita.com.tr" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Header />
      <main>
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
      <LazySection placeholder={<SectionFallback minHeight="40vh" />} rootMargin="250px 0px">
        <Suspense fallback={<SectionFallback minHeight="40vh" />}>
          <Footer />
        </Suspense>
      </LazySection>
    </div>
  );
};

export default Index;
