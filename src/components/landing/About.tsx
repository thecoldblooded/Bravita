import { useTranslation } from "react-i18next";

import { FeatureSteps } from "@/components/ui/feature-steps";
import ScrollImageSequence from "@/components/ui/scroll-image-sequence";

// Lazy load images with URL constructor for proper bundling
const heroImage = new URL("@/assets/Geleceğin Kahramanları İçin.webp", import.meta.url).href;
const globalImage = new URL("@/assets/Türkiye'den Dünyaya.webp", import.meta.url).href;
const strengthImage = new URL("@/assets/Gücün Kaynağı.webp", import.meta.url).href;

const About = () => {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-x-hidden overflow-y-visible pb-20 pt-32 md:pb-2 md:pt-8">
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
        <div className="mb-22 grid items-center gap-12 md:mb-30 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <span className="mb-2 block text-sm font-bold uppercase tracking-wider text-bravita-orange">
              {t("about.badge")}
            </span>
            <h2 className="mt-2 mb-4 text-3xl font-extrabold text-foreground md:text-5xl">
              {t("about.title")} {" "}
              <span className="bg-linear-to-r from-bravita-yellow via-bravita-orange to-bravita-red bg-clip-text text-transparent">
                {t("about.title_accent")}
              </span>
            </h2>
            <p className="mb-6 text-lg leading-relaxed text-muted-foreground">
              {t("about.description")}
            </p>
            <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bravita-green/10">
                <span className="text-2xl">🔬</span>
              </div>
              <div>
                <p className="font-bold">{t("about.science_title")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("about.science_desc")}
                </p>
              </div>
            </div>
          </div>

          <div className="order-1 flex w-full items-center justify-center -z-10 md:order-2 md:z-0">
            <div className="flex origin-center translate-y-[-15%] scale-[3] items-center justify-center sm:-translate-y-[20%] md:translate-y-0 md:scale-100">
              <ScrollImageSequence />
            </div>
          </div>
        </div>

        <div className="mt-24 md:mt-32">
          <FeatureSteps
            features={[
              {
                step: t("about.mission.step"),
                title: t("about.mission.title"),
                content: t("about.mission.content"),
                image: heroImage,
              },
              {
                step: t("about.vision.step"),
                title: t("about.vision.title"),
                content: t("about.vision.content"),
                image: globalImage,
              },
              {
                step: t("about.motto.step"),
                title: t("about.motto.title"),
                content: t("about.motto.content"),
                image: strengthImage,
              },
            ]}
            title={t("about.values_title")}
            imageHeight="aspect-square"
            className="bg-transparent"
            mode="auto"
          />
        </div>
      </div>
    </section>
  );
};

export default About;
