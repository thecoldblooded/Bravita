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

const Index = () => {
  // Banner in Header handles incomplete profile notification
  // No auto-redirect needed

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />

        <LazySection placeholder={<SectionFallback minHeight="70vh" />} rootMargin="500px 0px">
          <Suspense fallback={<SectionFallback minHeight="70vh" />}>
            <ScrollReveal delay={0.1}>
              <Benefits />
            </ScrollReveal>
          </Suspense>
        </LazySection>

        <LazySection placeholder={<SectionFallback minHeight="70vh" />} rootMargin="450px 0px">
          <Suspense fallback={<SectionFallback minHeight="70vh" />}>
            <ScrollReveal delay={0.2}>
              <ProductShowcase />
            </ScrollReveal>
          </Suspense>
        </LazySection>

        <LazySection placeholder={<SectionFallback minHeight="70vh" />} rootMargin="450px 0px">
          <Suspense fallback={<SectionFallback minHeight="70vh" />}>
            <ScrollReveal delay={0.1}>
              <Ingredients />
            </ScrollReveal>
          </Suspense>
        </LazySection>

        <LazySection placeholder={<SectionFallback minHeight="90vh" />} rootMargin="350px 0px">
          <Suspense fallback={<SectionFallback minHeight="90vh" />}>
            <ScrollReveal delay={0.1}>
              <Usage />
            </ScrollReveal>
          </Suspense>
        </LazySection>

        <LazySection placeholder={<SectionFallback minHeight="70vh" />} rootMargin="350px 0px">
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
