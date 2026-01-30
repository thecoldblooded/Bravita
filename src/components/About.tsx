import { useTranslation } from "react-i18next";
import { FeatureSteps } from "./ui/feature-steps";
import ScrollImageSequence from "./ui/scroll-image-sequence";

// Lazy load images with URL constructor for proper bundling
const heroImage = new URL("../assets/Geleceğin Kahramanları İçin.webp", import.meta.url).href;
const globalImage = new URL("../assets/Türkiye'den Dünyaya.webp", import.meta.url).href;
const strengthImage = new URL("../assets/Gücün Kaynağı.webp", import.meta.url).href;

const About = () => {
  const { t } = useTranslation();

  return (
    <section id="about" className="relative pt-32 md:pt-8 pb-20 md:pb-2 overflow-x-hidden overflow-y-visible">
      {/* Soft dissolved gradient background */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: `linear-gradient(180deg, 
            transparent 0%, 
            transparent 10%,
            rgba(255, 249, 240, 0.2) 20%,
            rgba(255, 241, 230, 0.4) 35%, 
            rgba(254, 243, 199, 0.6) 50%,
            rgba(255, 251, 235, 0.8) 70%,
            var(--color-background) 100%
          )`,
        }}
      />
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center mb-22 md:mb-30">
          <div className="order-2 md:order-1">
            <span className="text-bravita-orange font-bold tracking-wider text-sm uppercase mb-2 block">{t('about.badge')}</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mt-2 mb-4">
              {t('about.title')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-bravita-yellow via-bravita-orange to-bravita-red">{t('about.title_accent')}</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              {t('about.description')}
            </p>
            <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
              <div className="w-12 h-12 rounded-full bg-bravita-green/10 flex items-center justify-center">
                <span className="text-2xl">🔬</span>
              </div>
              <div>
                <p className="font-bold">{t('about.science_title')}</p>
                <p className="text-muted-foreground text-sm">{t('about.science_desc')}</p>
              </div>
            </div>
          </div>

          <div className="order-1 md:order-2 flex justify-center items-center w-full -z-10 md:z-0">
            <div className="flex justify-center items-center scale-[3] md:scale-100 origin-center -translate-y-[15%] sm:-translate-y-[20%] md:translate-y-0">
              <ScrollImageSequence />
            </div>
          </div>
        </div>

        {/* Values via FeatureSteps */}
        <div className="mt-24 md:mt-32">
          <FeatureSteps
            features={[
              {
                step: t('about.mission.step'),
                title: t('about.mission.title'),
                content: t('about.mission.content'),
                image: heroImage
              },
              {
                step: t('about.vision.step'),
                title: t('about.vision.title'),
                content: t('about.vision.content'),
                image: globalImage
              },
              {
                step: t('about.motto.step'),
                title: t('about.motto.title'),
                content: t('about.motto.content'),
                image: strengthImage
              }
            ]}
            title={t('about.values_title')}
            autoPlayInterval={5000}
            imageHeight="aspect-square"
            className="bg-transparent"
          />
        </div>
      </div>
    </section>
  );
};

export default About;
