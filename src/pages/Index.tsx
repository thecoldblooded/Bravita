import { lazy, Suspense } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ScrollReveal from "@/components/ui/scroll-reveal";

// Lazy load below-the-fold components for better initial load
const Benefits = lazy(() => import("@/components/Benefits"));
const ProductShowcase = lazy(() => import("@/components/ProductShowcase"));
const Ingredients = lazy(() => import("@/components/Ingredients"));
const Usage = lazy(() => import("@/components/Usage"));
const About = lazy(() => import("@/components/About"));
const Footer = lazy(() => import("@/components/Footer"));

// Simple loading fallback
const SectionLoader = () => (
  <div className="min-h-[400px] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-bravita-orange/30 border-t-bravita-orange rounded-full animate-spin" />
  </div>
);

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />

        <Suspense fallback={<SectionLoader />}>
          <ScrollReveal delay={0.1}>
            <Benefits />
          </ScrollReveal>
        </Suspense>

        <Suspense fallback={<SectionLoader />}>
          <ScrollReveal delay={0.2}>
            <ProductShowcase />
          </ScrollReveal>
        </Suspense>

        <Suspense fallback={<SectionLoader />}>
          <ScrollReveal delay={0.1}>
            <Ingredients />
          </ScrollReveal>
        </Suspense>

        <Suspense fallback={<SectionLoader />}>
          <ScrollReveal delay={0.1}>
            <Usage />
          </ScrollReveal>
        </Suspense>

        <Suspense fallback={<SectionLoader />}>
          <ScrollReveal delay={0.1}>
            <About />
          </ScrollReveal>
        </Suspense>
      </main>
      <Suspense fallback={<SectionLoader />}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;
