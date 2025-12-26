import { useTranslation } from "react-i18next";
import bravitaBottle from "@/assets/bravita-bottle.png";
import { FeatureSteps } from "@/components/ui/feature-steps";
import heroImage from "@/assets/Geleceğin Kahramanları İçin.jpeg";
import globalImage from "@/assets/Türkiye'den Dünyaya.png";
import strengthImage from "@/assets/Gücün Kaynağı.jpeg";

const About = () => {
  const { t } = useTranslation();

  return (
    <section id="about" className="py-20 md:py-32 bg-gradient-to-b from-bravita-cream/30 to-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div className="order-2 lg:order-1">
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

          <div className="order-1 lg:order-2 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-bravita-yellow/40 to-bravita-orange/40 rounded-full blur-3xl scale-90" />
              <img
                src={bravitaBottle}
                alt="Bravita"
                className="relative z-10 w-64 md:w-80 animate-float-slow"
              />
            </div>
          </div>
        </div>

        {/* Values via FeatureSteps */}
        <div className="mt-16">
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
