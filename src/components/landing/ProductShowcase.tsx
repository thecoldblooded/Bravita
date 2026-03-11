import { useTranslation } from "react-i18next";
import { useState, useRef, useEffect } from "react";

// Use dynamic imports for images to enable code splitting
const bravitaBottle = new URL("@/assets/bravita-bottle.webp", import.meta.url).href;
const bravitaBox = new URL("@/assets/bravita-box.webp", import.meta.url).href;

const ProductShowcase = () => {
  const { t } = useTranslation();
  const [isInView, setIsInView] = useState(false);
  const [bottleLoaded, setBottleLoaded] = useState(false);
  const [boxLoaded, setBoxLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-20 md:py-32 bg-linear-to-b from-background via-secondary/20 to-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">

          <h2 className="text-3xl md:text-5xl font-extrabold mt-2 mb-4">
            {t('product.title')} <span className="text-gradient">{t('product.title_accent')}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('product.description')}
          </p>
        </div>

        <div ref={containerRef} className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Product Images */}
          <div className="relative flex justify-center items-end min-h-75">
            <div className="relative group z-20 -mr-12 md:-mr-24">
              <div className="absolute inset-0 bg-linear-to-br from-bravita-yellow/30 to-bravita-orange/30 rounded-3xl blur-2xl opacity-60 group-hover:opacity-80 transition-opacity" />
              {!bottleLoaded && <div className="w-44 md:w-54 h-64 bg-linear-to-br from-bravita-yellow/20 to-bravita-orange/20 rounded-2xl animate-pulse" />}
              {isInView && (
                <img
                  src={bravitaBottle}
                  alt={t('hero.delicious')}
                  loading="lazy"
                  decoding="async"
                  onLoad={() => setBottleLoaded(true)}
                  className={`relative z-10 w-44 md:w-54 drop-shadow-xl group-hover:scale-105 transition-all duration-500 ${bottleLoaded ? 'opacity-100' : 'opacity-0 absolute'}`}
                />
              )}
            </div>
            <div className="relative group z-10">
              <div className="absolute inset-0 bg-linear-to-br from-bravita-orange/30 to-bravita-red/30 rounded-3xl blur-2xl opacity-60 group-hover:opacity-80 transition-opacity" />
              {!boxLoaded && <div className="w-60 md:w-80 h-72 bg-linear-to-br from-bravita-orange/20 to-bravita-red/20 rounded-2xl animate-pulse" />}
              {isInView && (
                <img
                  src={bravitaBox}
                  alt="Bravita"
                  loading="lazy"
                  decoding="async"
                  onLoad={() => setBoxLoaded(true)}
                  className={`relative z-10 w-60 md:w-80 group-hover:scale-105 transition-all duration-500 ${boxLoaded ? 'opacity-100' : 'opacity-0 absolute'}`}
                />
              )}
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl p-6 border border-border hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-bravita-green/10 flex items-center justify-center shrink-0">
                  <span className="text-2xl">🍊</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{t('product.features.flavor.title')}</h3>
                  <p className="text-muted-foreground">{t('product.features.flavor.desc')}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-6 border border-border hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-bravita-blue/10 flex items-center justify-center shrink-0">
                  <span className="text-2xl">💧</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{t('product.features.liquid.title')}</h3>
                  <p className="text-muted-foreground">{t('product.features.liquid.desc')}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-6 border border-border hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-bravita-teal/10 flex items-center justify-center shrink-0">
                  <span className="text-2xl">🧪</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{t('product.features.rich.title')}</h3>
                  <p className="text-muted-foreground">{t('product.features.rich.desc')}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-6 border border-border hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-bravita-yellow/10 flex items-center justify-center shrink-0">
                  <span className="text-2xl">⭐</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{t('product.features.science.title')}</h3>
                  <p className="text-muted-foreground">{t('product.features.science.desc')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductShowcase;
