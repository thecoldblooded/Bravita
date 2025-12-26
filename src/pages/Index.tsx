import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Benefits from "@/components/Benefits";
import ProductShowcase from "@/components/ProductShowcase";
import Ingredients from "@/components/Ingredients";
import Usage from "@/components/Usage";
import About from "@/components/About";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ui/scroll-reveal";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />

        <ScrollReveal delay={0.1}>
          <Benefits />
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <ProductShowcase />
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <Ingredients />
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <Usage />
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <About />
        </ScrollReveal>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
