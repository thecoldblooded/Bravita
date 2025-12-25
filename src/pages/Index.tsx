import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Benefits from "@/components/Benefits";
import ProductShowcase from "@/components/ProductShowcase";
import Ingredients from "@/components/Ingredients";
import Usage from "@/components/Usage";
import About from "@/components/About";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <Benefits />
        <ProductShowcase />
        <Ingredients />
        <Usage />
        <About />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
