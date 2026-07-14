import { useRef, useState, useEffect, type RefObject } from "react";
import { Star, Sparkles, ChevronDown } from "lucide-react";
import { m } from "framer-motion";
import TextCursorProximity from "@/components/ui/text-cursor-proximity";
import { useTranslation } from "react-i18next";
import bravitaBottle1 from "@/assets/bravita-bottle1.webp";
import bravitaBottle1Sm from "@/assets/bravita-bottle1-sm.webp";
import bravitaBottle1Md from "@/assets/bravita-bottle1-md.webp";

// Import from src so Vite includes the asset in the bundle and resolves the correct URL.
const HERO_LCP_IMAGE_SRC = bravitaBottle1;

type HeroTranslate = ReturnType<typeof useTranslation>["t"];

interface HeroStar {
  id: string;
  name: string;
  start: [number, number];
  mobileStart: [number, number];
  delay: number;
  duration: number;
  size: number;
  mobileSize: number;
  floatAmount: number;
}

interface AccentChar {
  id: string;
  char: string;
  color: string;
}

interface HeroBackgroundVisualsProps {
  safeStars: HeroStar[];
  stars: HeroStar[];
  target: [number, number];
}

function HeroBackgroundVisuals({ safeStars, stars, target }: HeroBackgroundVisualsProps) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;

  return (
    <>
      {/* Mobile-optimized: CSS-only keyframe styles */}
      {isMobile && (
        <style>{`
          @keyframes hero-star-float {
            0%, 100% { transform: translate(-50%, -50%) translateY(0); }
            50% { transform: translate(-50%, -50%) translateY(-10px); }
          }
          @keyframes hero-comet-pulse {
            0%, 100% { opacity: 0.03; }
            50% { opacity: 0.08; }
          }
          .hero-star-mobile {
            animation: hero-star-float var(--float-dur, 6s) ease-in-out infinite;
            animation-delay: var(--float-delay, 0s);
          }
          .hero-comet-mobile {
            animation: hero-comet-pulse var(--pulse-dur, 4s) ease-in-out infinite;
            animation-delay: var(--pulse-delay, 0s);
          }
        `}</style>
      )}

      <div className="absolute inset-0 z-0 pointer-events-none">
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="w-full h-full">
          {!isMobile && (
            <defs>
              {safeStars.map((star) => (
                <linearGradient
                  key={`comet-grad-${star.id}`}
                  id={`comet-grad-${star.id}`}
                  gradientUnits="userSpaceOnUse"
                  x1={star.start[0]}
                  y1={star.start[1]}
                  x2={target[0]}
                  y2={target[1]}
                >
                  <stop offset="0" stopColor="#f97316" stopOpacity="0">
                    <animate attributeName="offset" values="-0.6; 0.9" dur="2.5s" begin={`${star.delay}s`} repeatCount="indefinite" />
                  </stop>
                  <stop offset="0" stopColor="#f97316" stopOpacity="0.4">
                    <animate attributeName="offset" values="-0.3; 1.1" dur="2.5s" begin={`${star.delay}s`} repeatCount="indefinite" />
                  </stop>
                  <stop offset="0" stopColor="#f97316" stopOpacity="1">
                    <animate attributeName="offset" values="0; 1.3" dur="2.5s" begin={`${star.delay}s`} repeatCount="indefinite" />
                  </stop>
                  <stop offset="0" stopColor="#f97316" stopOpacity="0">
                    <animate attributeName="offset" values="0.01; 1.31" dur="2.5s" begin={`${star.delay}s`} repeatCount="indefinite" />
                  </stop>
                </linearGradient>
              ))}
            </defs>
          )}

          {safeStars.map((star) => {
            const controlX = (star.start[0] + target[0]) / 2;
            const controlY = (star.start[1] + target[1]) / 2 + (star.start[1] > 500 ? -20 : 20);
            const pathD = `M ${star.start[0]} ${star.start[1]} Q ${controlX} ${controlY} ${target[0]} ${target[1]}`;

            if (isMobile) {
              // CSS-only subtle pulse on the comet trail
              return (
                <g key={`group-${star.id}`}>
                  <path
                    className="hero-comet-mobile"
                    stroke="rgba(249, 115, 22, 0.06)"
                    strokeWidth="0.5"
                    fill="none"
                    d={pathD}
                    style={{
                      "--pulse-dur": `${star.duration}s`,
                      "--pulse-delay": `${star.delay}s`,
                    } as React.CSSProperties}
                  />
                </g>
              );
            }

            return (
              <g key={`group-${star.id}`}>
                <m.path
                  stroke="rgba(249, 115, 22, 0.1)"
                  strokeWidth="0.5"
                  fill="none"
                  initial={{ d: pathD }}
                  animate={{
                    d: [
                      pathD,
                      `M ${star.start[0]} ${star.start[1] - star.floatAmount} Q ${controlX} ${controlY - star.floatAmount / 2} ${target[0]} ${target[1]}`,
                      pathD,
                    ],
                  }}
                  transition={{
                    duration: star.duration,
                    repeat: Infinity,
                    delay: star.delay,
                    ease: "easeInOut",
                  }}
                />

                <m.path
                  stroke={`url(#comet-grad-${star.id})`}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ d: pathD }}
                  animate={{
                    d: [
                      pathD,
                      `M ${star.start[0]} ${star.start[1] - star.floatAmount} Q ${controlX} ${controlY - star.floatAmount / 2} ${target[0]} ${target[1]}`,
                      pathD,
                    ],
                  }}
                  transition={{
                    duration: star.duration,
                    repeat: Infinity,
                    delay: star.delay,
                    ease: "easeInOut",
                  }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
        {stars.map((star) => {
          if (isMobile) {
            // CSS-only float animation — no Framer Motion JS loops
            return (
              <div
                key={`star-dom-wrapper-${star.id}`}
                className="absolute flex items-center justify-center hero-star-mobile"
                style={{
                  left: `${star.start[0] / 10}%`,
                  top: `${star.start[1] / 10}%`,
                  width: `${star.size}px`,
                  height: `${star.size}px`,
                  "--float-dur": `${star.duration}s`,
                  "--float-delay": `${star.delay}s`,
                } as React.CSSProperties}
              >
                <Star
                  className="absolute inset-0 text-orange-300 fill-orange-50"
                  style={{ width: "100%", height: "100%" }}
                  strokeWidth={1.5}
                />
                <span
                  className="relative z-10 text-[11.5px] sm:text-[13px] font-bold text-orange-950 leading-tight text-center px-2 select-none"
                  style={{ backfaceVisibility: "hidden", transform: "translateZ(0)", WebkitFontSmoothing: "antialiased" }}
                >
                  {star.name}
                </span>
              </div>
            );
          }

          // Desktop: full Framer Motion float
          return (
            <div
              key={`star-dom-wrapper-${star.id}`}
              className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${star.start[0] / 10}%`,
                top: `${star.start[1] / 10}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
              }}
            >
              <m.div
                className="relative w-full h-full flex items-center justify-center pointer-events-auto group"
                style={{ willChange: "transform" }}
                animate={{
                  y: [0, -star.floatAmount, 0],
                }}
                transition={{
                  duration: star.duration,
                  repeat: Infinity,
                  delay: star.delay,
                  ease: "easeInOut",
                }}
              >
                <Star
                  className="absolute inset-0 text-orange-300 fill-orange-50 group-hover:scale-105 transition-transform duration-500"
                  style={{ width: "100%", height: "100%" }}
                  strokeWidth={1.5}
                />
                <span
                  className="relative z-10 text-[8.5px] sm:text-[10px] font-bold text-orange-950 leading-tight text-center px-4 select-none"
                  style={{ backfaceVisibility: "hidden", transform: "translateZ(0)", WebkitFontSmoothing: "antialiased" }}
                >
                  {star.name}
                </span>
              </m.div>
            </div>
          );
        })}
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-yellow-300/5 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute top-40 right-20 w-48 h-48 bg-orange-300/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>
    </>
  );
}

interface HeroMainContentProps {
  t: HeroTranslate;
  containerRef: RefObject<HTMLElement>;
  bottleRef: RefObject<HTMLDivElement>;
  accentChars: AccentChar[];
  ingredients: string[];
  isLG: boolean;
}

function HeroMainContent({ t, containerRef, bottleRef, accentChars, ingredients, isLG }: HeroMainContentProps) {
  return (
    <div className="container mx-auto px-4 lg:px-12 relative z-20 w-full">
      <div className="grid lg:grid-cols-2 gap-8 items-center">
        <div className="order-2 lg:order-1 text-center lg:text-left pt-32 md:pt-40 lg:pt-30">
          <div className="inline-flex items-center gap-2 bg-white/90 px-3 py-1.5 rounded-full border border-orange-100 shadow-sm mb-8">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">{t("hero.badge")}</span>
          </div>

          <h1
            className="text-4xl md:text-[84px] font-black text-[#2D334A] mb-8 leading-[1.05] tracking-tight min-h-35 md:min-h-45"
          >
            {isLG ? (
              <span className="inline-block mr-4 text-[#2D334A]">{t("hero.title_part1")}</span>
            ) : (
              <TextCursorProximity
                key={t("hero.title_part1")}
                label={t("hero.title_part1")}
                containerRef={containerRef}
                className="inline-block mr-4"
                styles={{
                  transform: { from: "scale(1) translateY(0px)", to: "scale(1.4) translateY(-20px)" },
                  color: { from: "#2D334A", to: "#ea580c" },
                }}
                falloff="gaussian"
                radius={100}
              />
            )}
            <br className="hidden md:block" />
            <span className="inline-flex flex-wrap justify-center lg:justify-start">
              {accentChars.map((item) => 
                isLG ? (
                  <span key={item.id} className="inline-block" style={{ color: item.color }}>
                    {item.char}
                  </span>
                ) : (
                  <TextCursorProximity
                    key={item.id}
                    label={item.char}
                    containerRef={containerRef}
                    className="inline-block"
                    styles={{
                      transform: { from: "scale(1) translateY(0px)", to: "scale(1.4) translateY(-20px)" },
                      color: { from: item.color, to: "#ea580c" },
                    }}
                    falloff="gaussian"
                    radius={100}
                  />
                )
              )}
            </span>
            <br />
            {isLG ? (
              <span className="inline-block text-[#2D334A]">{t("hero.title_part3")}</span>
            ) : (
              <TextCursorProximity
                key={t("hero.title_part3")}
                label={t("hero.title_part3")}
                containerRef={containerRef}
                className="inline-block"
                styles={{
                  transform: { from: "scale(1) translateY(0px)", to: "scale(1.4) translateY(-20px)" },
                  color: { from: "#2D334A", to: "#ea580c" },
                }}
                falloff="gaussian"
                radius={100}
              />
            )}
          </h1>

          <p
            className="text-base md:text-lg text-gray-500/80 mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed"
          >
            {t("hero.description")}
          </p>

          <div
            className="flex flex-wrap justify-center lg:justify-start gap-2.5 mb-12"
          >
            {ingredients.map((item, index) => (
              <span key={item} className="ingredient-badge shadow-sm" style={{ animationDelay: `${0.1 * index}s` }}>
                {item}
              </span>
            ))}
          </div>

          <div
            className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start w-full sm:w-auto"
          >
            <button
              type="button"
              onClick={() => {
                document.querySelector("#ingredients")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-[#f97316] text-white px-8 py-4 rounded-full font-bold text-base shadow-xl shadow-orange-200/50 hover:bg-orange-600 transition-all duration-300"
            >
              {t("hero.cta_more")}
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="order-1 lg:order-2 relative flex justify-center lg:justify-end lg:pr-12 translate-y-[15%] lg:translate-y-0">
          <div ref={bottleRef} className="relative w-max">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-orange-100/20 rounded-full blur-[80px]" />

            <div className="relative animate-float">
              <img
                src={HERO_LCP_IMAGE_SRC}
                srcSet={`${bravitaBottle1Sm} 320w, ${bravitaBottle1Md} 640w, ${bravitaBottle1} 800w`}
                sizes="(max-width: 768px) 100px, 320px"
                alt="Bravita Sıvı Takviye"
                loading="eager"
                decoding="async"
                width={320}
                height={566}
                className="w-45 md:w-65 lg:w-[320px] h-auto max-h-[75vh] object-contain relative z-10 drop-shadow-2xl"
              />

              <div className="absolute top-12 -right-2 bg-[#FFC529] text-[#2D334A] px-3 py-1 rounded-full font-bold text-[10px] md:text-xs shadow-lg z-20">
                {t("hero.bottle_meta")}
              </div>

              <div className="absolute -bottom-2 -left-4 bg-white/95 backdrop-blur-sm p-3 md:p-4 rounded-xl md:rounded-2xl shadow-xl z-20 border border-gray-50">
                <span className="text-[9px] md:text-[10px] font-bold text-gray-400 block mb-0.5">{t("hero.flavor")}</span>
                <p className="font-extrabold text-orange-600 text-xs md:text-sm">{t("hero.delicious")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroWaveDivider() {
  return (
    <div className="absolute left-0 right-0 z-30 pointer-events-none w-full leading-none text-background" style={{ bottom: "-1px" }}>
      <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto block">
        <path
          d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

const Hero = () => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLElement>(null);
  const bottleRef = useRef<HTMLDivElement>(null);
  const [layoutState, setLayoutState] = useState(() => ({
    isLG: typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches,
    targetPos: [820, 530] as [number, number],
  }));
  const { isLG, targetPos } = layoutState;

  useEffect(() => {
    const updateLayoutState = () => {
      const isMobile = window.matchMedia("(max-width: 1023px)").matches;

      if (!bottleRef.current || !containerRef.current) {
        setLayoutState((prev) => (prev.isLG === isMobile ? prev : { ...prev, isLG: isMobile }));
        return;
      }

      const bottleRect = bottleRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      const x = ((bottleRect.left + bottleRect.width / 2 - containerRect.left) / containerRect.width) * 1000;
      const y = ((bottleRect.top + bottleRect.height / 2 - containerRect.top) / containerRect.height) * 1000;

      setLayoutState((prev) => {
        if (prev.isLG === isMobile && prev.targetPos[0] === x && prev.targetPos[1] === y) {
          return prev;
        }

        return {
          isLG: isMobile,
          targetPos: [x, y],
        };
      });
    };

    updateLayoutState();
    const timerId = window.setTimeout(updateLayoutState, 100);

    const handleResize = () => {
      updateLayoutState();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const ingredients = [
    t("hero.ingredients.sitikolin"),
    t("hero.ingredients.arginine"),
    t("hero.ingredients.taurin"),
    t("hero.ingredients.phospho"),
    t("hero.ingredients.multimineral"),
    t("hero.ingredients.multivitamin"),
  ];

  const starsData: HeroStar[] = [
    {
      id: "phospho",
      name: t("hero.ingredients.phospho"),
      start: [380, 180],
      mobileStart: [150, 150],
      delay: 0,
      duration: 6,
      size: 119,
      mobileSize: 100,
      floatAmount: 15,
    },
    {
      id: "sitikolin",
      name: t("hero.ingredients.sitikolin"),
      start: [820, 920],
      mobileStart: [820, 180],
      delay: 0.5,
      duration: 7,
      size: 85,
      mobileSize: 100,
      floatAmount: 20,
    },
    {
      id: "taurin",
      name: t("hero.ingredients.taurin"),
      start: [580, 280],
      mobileStart: [100, 310],
      delay: 1,
      duration: 5.5,
      size: 102,
      mobileSize: 100,
      floatAmount: 12,
    },
    {
      id: "arginine",
      name: t("hero.ingredients.arginine"),
      start: [480, 480],
      mobileStart: [900, 310],
      delay: 1.5,
      duration: 8,
      size: 94,
      mobileSize: 100,
      floatAmount: 18,
    },
    {
      id: "multimineral",
      name: t("hero.ingredients.multimineral"),
      start: [960, 420],
      mobileStart: [850, 470],
      delay: 1.2,
      duration: 7.5,
      size: 106,
      mobileSize: 100,
      floatAmount: 16,
    },
    {
      id: "multivitamin",
      name: t("hero.ingredients.multivitamin"),
      start: [620, 860],
      mobileStart: [150, 470],
      delay: 2,
      duration: 6.5,
      size: 111,
      mobileSize: 100,
      floatAmount: 14,
    },
  ];

  const stars = starsData.map((star) => ({
    ...star,
    start: isLG ? star.mobileStart : star.start,
    size: isLG ? star.mobileSize : star.size,
  }));

  const target = targetPos;
  const safeStars = stars.filter(
    (star) =>
      Number.isFinite(star.start?.[0]) &&
      Number.isFinite(star.start?.[1]) &&
      Number.isFinite(target[0]) &&
      Number.isFinite(target[1]),
  );

  const rainbowColors = ["#e86e25", "#dcb036", "#c8c641", "#a9d256", "#88d969", "#88d969", "#88d969"];
  const accentWord = t("hero.title_part2") || "";
  const fallbackAccentColor = rainbowColors[0] ?? "#e86e25";
  const accentChars: AccentChar[] = accentWord.split("").map((char, index) => ({
    id: `${char}-${index}`,
    char,
    color: rainbowColors[index % rainbowColors.length] ?? fallbackAccentColor,
  }));

  return (
    <section ref={containerRef} id="hero" className="relative min-h-screen gradient-hero overflow-x-clip pt-12 pb-16 flex items-center">
      <HeroBackgroundVisuals safeStars={safeStars} stars={stars} target={target} />
      <HeroMainContent
        t={t}
        containerRef={containerRef}
        bottleRef={bottleRef}
        accentChars={accentChars}
        ingredients={ingredients}
        isLG={isLG}
      />
      <HeroWaveDivider />
    </section>
  );
};

export default Hero;
