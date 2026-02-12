import { Clock, Thermometer, AlertTriangle, Baby } from "lucide-react";
import HeroScrollVideo from "@/components/ui/scroll-animated-video";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import usageVideo from "@/assets/Generated video 1.mp4";

// Keep as a static import so Vite resolves a valid production/dev URL.

const Usage = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  return (
    <section className="bg-transparent pb-20 md:pb-32">
      <HeroScrollVideo
        title="Bravita"
        subtitle={t('usage.video_subtitle')}
        meta="2025"
        media={usageVideo}
        poster="/bravita-bottle.webp"
        mediaType="video"
        targetSize="fullscreen"
        scrollHeightVh={isMobile ? 120 : 200}
        overlay={{}}
      />

      <div className="container mx-auto px-4 mt-[-100vh] md:mt-[-115vh] relative z-10 pointer-events-none">
        {/* Spacer to push content below the scroll height */}
        <div style={{ height: "10vh" }}></div>
      </div>

      <div id="usage" className="container mx-auto px-4 relative z-10 scroll-mt-32">
        <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/50 p-6 md:p-12 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-bravita-orange font-bold tracking-wider text-sm uppercase mb-2 block">
              {t('usage.badge')}
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight drop-shadow-sm mt-2 mb-4">
              {t('usage.title')} <span className="text-transparent bg-clip-text bg-linear-to-r from-bravita-yellow via-bravita-orange to-bravita-red">{t('usage.title_accent')}</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Dosage Card */}
            <div className="group hover:-translate-y-1 transition-transform duration-300 bg-linear-to-br from-orange-50 to-amber-50 rounded-3xl p-8 border border-orange-100 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl"></div>

              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 text-bravita-orange">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-6 text-foreground">{t('usage.dosage_title')}</h3>
              <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-4 bg-white/80 backdrop-blur rounded-2xl p-4 shadow-sm border border-orange-100">
                  <div className="p-2 bg-blue-50 rounded-xl">
                    <Baby className="w-6 h-6 text-bravita-blue" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{t('usage.dosage_child')}</p>
                    <p className="text-muted-foreground text-sm">{t('usage.dosage_child_amount')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-white/80 backdrop-blur rounded-2xl p-4 shadow-sm border border-orange-100">
                  <div className="p-2 bg-green-50 rounded-xl text-2xl leading-none flex items-center justify-center w-10 h-10">
                    👨‍👩‍👧
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{t('usage.dosage_adult')}</p>
                    <p className="text-muted-foreground text-sm">{t('usage.dosage_adult_amount')}</p>
                  </div>
                </div>
              </div>
              <p className="mt-6 text-orange-800/70 text-sm font-medium italic flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-400"></span>
                {t('usage.shake')}
              </p>
            </div>

            {/* Storage Card */}
            <div className="group hover:-translate-y-1 transition-transform duration-300 bg-linear-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 border border-blue-100 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>

              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 text-bravita-blue">
                <Thermometer className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-6 text-foreground">{t('usage.storage_title')}</h3>
              <ul className="space-y-4 relative z-10">
                <li className="flex items-start gap-3 bg-white/60 p-3 rounded-xl border border-blue-50/50">
                  <span className="text-bravita-blue font-bold mt-0.5">✓</span>
                  <span className="text-muted-foreground font-medium">{t('usage.storage_1')}</span>
                </li>
                <li className="flex items-start gap-3 bg-white/60 p-3 rounded-xl border border-blue-50/50">
                  <span className="text-bravita-blue font-bold mt-0.5">✓</span>
                  <span className="text-muted-foreground font-medium">{t('usage.storage_2')}</span>
                </li>
                <li className="flex items-start gap-3 bg-white/60 p-3 rounded-xl border border-blue-50/50">
                  <span className="text-bravita-blue font-bold mt-0.5">✓</span>
                  <span className="text-muted-foreground font-medium">{t('usage.storage_3')}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Warnings */}
          <div className="mt-12 max-w-5xl mx-auto">
            <div className="bg-red-50/80 backdrop-blur-sm border border-red-100 rounded-3xl p-8 shadow-sm">
              <div className="flex items-start gap-6">
                <div className="p-3 bg-red-100 rounded-2xl shrink-0">
                  <AlertTriangle className="w-8 h-8 text-bravita-red" />
                </div>
                <div>
                  <h4 className="font-bold text-xl mb-4 text-foreground">{t('usage.warnings_title')}</h4>
                  <ul className="grid md:grid-cols-2 gap-x-8 gap-y-3 text-muted-foreground text-sm md:text-base">
                    <li className="flex gap-2">
                      <span className="text-bravita-red">•</span>
                      <span>{t('usage.warning_1')}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-bravita-red">•</span>
                      <span>{t('usage.warning_2')}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-bravita-red">•</span>
                      <span>{t('usage.warning_3')}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-bravita-red">•</span>
                      <span>{t('usage.warning_4')}</span>
                    </li>
                    <li className="flex gap-2 md:col-span-2">
                      <span className="text-bravita-red">•</span>
                      <span>{t('usage.warning_5')}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom dissolved gradient for smooth transition - full width */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-96 pointer-events-none z-0"
        style={{
          background: `linear-gradient(to bottom, 
            transparent 0%, 
            transparent 10%,
            rgba(255, 251, 235, 0.15) 25%,
            rgba(255, 249, 240, 0.3) 40%,
            rgba(255, 241, 230, 0.5) 55%,
            rgba(254, 243, 199, 0.7) 70%,
            rgba(255, 251, 235, 0.85) 85%,
            hsl(45 100% 98%) 100%
          )`,
        }}
      />
    </section>
  );
};

export default Usage;
