import { useRef, useState, useEffect } from "react";
import { Star, Sparkles, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import TextCursorProximity from "./ui/text-cursor-proximity";
import { useTranslation } from "react-i18next";

// Keep source stable so it can be preloaded from index.html
const HERO_LCP_IMAGE_SRC = "/bravita-bottle.webp";

const Hero = () => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLElement>(null);
  const bottleRef = useRef<HTMLDivElement>(null);
  const [isLG, setIsLG] = useState(false);
  const [targetPos, setTargetPos] = useState([820, 530]);

  useEffect(() => {
    const checkIsLG = () => {
      const isMobile = window.matchMedia("(max-width: 1023px)").matches;
      setIsLG(isMobile);
    };

    const updateTarget = () => {
      if (!bottleRef.current || !containerRef.current) return;
      const bottleRect = bottleRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      const x = ((bottleRect.left + bottleRect.width / 2 - containerRect.left) / containerRect.width) * 1000;
      const y = ((bottleRect.top + bottleRect.height / 2 - containerRect.top) / containerRect.height) * 1000;

      setTargetPos([x, y]);
    };

    checkIsLG();
    setTimeout(updateTarget, 100); // Initial delay for layout stabilization

    window.addEventListener("resize", () => {
      checkIsLG();
      updateTarget();
    });
    return () => window.removeEventListener("resize", updateTarget);
  }, []);

  const ingredients = [
    t('hero.ingredients.sitikolin'),
    t('hero.ingredients.arginine'),
    t('hero.ingredients.taurin'),
    t('hero.ingredients.phospho'),
    t('hero.ingredients.amino'),
    t('hero.ingredients.multimineral'),
    t('hero.ingredients.multivitamin'),
  ];

  // Coordinates scaled to 1000x1000 for better precision and text rendering
  const starsData = [
    { name: t('hero.ingredients.phospho'), start: [380, 180], mobileStart: [150, 150], delay: 0, duration: 6, size: 119, mobileSize: 50, floatAmount: 15 },
    { name: t('hero.ingredients.sitikolin'), start: [820, 920], mobileStart: [820, 180], delay: 0.5, duration: 7, size: 85, mobileSize: 50, floatAmount: 20 },
    { name: t('hero.ingredients.taurin'), start: [580, 280], mobileStart: [100, 310], delay: 1, duration: 5.5, size: 102, mobileSize: 50, floatAmount: 12 },
    { name: t('hero.ingredients.arginine'), start: [480, 480], mobileStart: [900, 310], delay: 1.5, duration: 8, size: 94, mobileSize: 50, floatAmount: 18 },
    { name: t('hero.ingredients.amino'), start: [620, 860], mobileStart: [150, 470], delay: 1.8, duration: 6, size: 105, mobileSize: 50, floatAmount: 14 },
    { name: t('hero.ingredients.multimineral'), start: [960, 420], mobileStart: [850, 470], delay: 1.2, duration: 7.5, size: 106, mobileSize: 50, floatAmount: 16 },
    { name: t('hero.ingredients.multivitamin'), start: [960, 850], mobileStart: [500, 520], delay: 2, duration: 6.5, size: 111, mobileSize: 50, floatAmount: 14 },
  ];

  const stars = starsData.map(star => ({
    ...star,
    start: isLG ? star.mobileStart : star.start,
    size: isLG ? star.mobileSize : star.size
  }));

  const target = targetPos; // Dynamically tracked bottle center relative to 1000x1000
  const safeStars = stars.filter((star) => (
    Number.isFinite(star.start?.[0]) &&
    Number.isFinite(star.start?.[1]) &&
    Number.isFinite(target[0]) &&
    Number.isFinite(target[1])
  ));

  // Colors for the rainbow text part
  const rainbowColors = ["#e86e25", "#dcb036", "#c8c641", "#a9d256", "#88d969", "#88d969", "#88d969"];
  const accentWord = t('hero.title_part2') || '';
  const accentChars = accentWord.split('').map((char, index) => ({
    char,
    color: rainbowColors[index % rainbowColors.length]
  }));

  return (
    <section ref={containerRef} id="hero" className="relative min-h-screen gradient-hero overflow-hidden pt-12 pb-16 flex items-center">
      {/* 1. Background SVG Layer for Ropes & Beams */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <svg
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <defs>
            {safeStars.map((star, i) => (
              <linearGradient
                key={`comet-grad-${i}`}
                id={`comet-grad-${i}`}
                gradientUnits="userSpaceOnUse"
                x1={star.start[0]} y1={star.start[1]}
                x2={target[0]} y2={target[1]}
              >
                {/* Tail (Transparent - Fading Trace End) */}
                <stop offset="0" stopColor="#f97316" stopOpacity="0">
                  <animate attributeName="offset" values="-0.6; 0.9" dur="2.5s" begin={`${star.delay}s`} repeatCount="indefinite" />
                </stop>
                {/* Body (Semi-Transparent Trace) */}
                <stop offset="0" stopColor="#f97316" stopOpacity="0.4">
                  <animate attributeName="offset" values="-0.3; 1.1" dur="2.5s" begin={`${star.delay}s`} repeatCount="indefinite" />
                </stop>
                {/* Head (Bright Opaque Tip) */}
                <stop offset="0" stopColor="#f97316" stopOpacity="1">
                  <animate attributeName="offset" values="0; 1.3" dur="2.5s" begin={`${star.delay}s`} repeatCount="indefinite" />
                </stop>
                {/* Sharp Front Cutoff */}
                <stop offset="0" stopColor="#f97316" stopOpacity="0">
                  <animate attributeName="offset" values="0.01; 1.31" dur="2.5s" begin={`${star.delay}s`} repeatCount="indefinite" />
                </stop>
              </linearGradient>
            ))}

            {/* Removed heavy blur filter for performance */}
          </defs>

          {safeStars.map((star, i) => {
            // Straighter lines for "Ray" effect
            const controlX = (star.start[0] + target[0]) / 2;
            const controlY = (star.start[1] + target[1]) / 2 + (star.start[1] > 500 ? -20 : 20);

            return (
              <g key={`group-${i}`}>
                {/* Rope */}
                <motion.path
                  stroke="rgba(249, 115, 22, 0.1)"
                  strokeWidth="0.5"
                  fill="none"
                  initial={{
                    d: `M ${star.start[0]} ${star.start[1]} Q ${controlX} ${controlY} ${target[0]} ${target[1]}`
                  }}
                  animate={{
                    d: [
                      `M ${star.start[0]} ${star.start[1]} Q ${controlX} ${controlY} ${target[0]} ${target[1]}`,
                      `M ${star.start[0]} ${star.start[1] - star.floatAmount} Q ${controlX} ${controlY - star.floatAmount / 2} ${target[0]} ${target[1]}`,
                      `M ${star.start[0]} ${star.start[1]} Q ${controlX} ${controlY} ${target[0]} ${target[1]}`
                    ]
                  }}
                  transition={{
                    duration: star.duration,
                    repeat: Infinity,
                    delay: star.delay,
                    ease: "easeInOut"
                  }}
                />

                {/* Beam - Simplified for performance */}
                <motion.path
                  stroke={`url(#comet-grad-${i})`}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  fill="none"
                  initial={{
                    d: `M ${star.start[0]} ${star.start[1]} Q ${controlX} ${controlY} ${target[0]} ${target[1]}`
                  }}
                  animate={{
                    d: [
                      `M ${star.start[0]} ${star.start[1]} Q ${controlX} ${controlY} ${target[0]} ${target[1]}`,
                      `M ${star.start[0]} ${star.start[1] - star.floatAmount} Q ${controlX} ${controlY - star.floatAmount / 2} ${target[0]} ${target[1]}`,
                      `M ${star.start[0]} ${star.start[1]} Q ${controlX} ${controlY} ${target[0]} ${target[1]}`
                    ]
                  }}
                  transition={{
                    duration: star.duration,
                    repeat: Infinity,
                    delay: star.delay,
                    ease: "easeInOut"
                  }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* 2. Foreground Stars Layer (DOM Elements for perfect 1:1 Aspect Ratio) */}
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
        {stars.map((star, i) => (
          <motion.div
            key={`star-dom-${i}`}
            className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${star.start[0] / 10}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
            }}
            animate={{
              top: [
                `${star.start[1] / 10}%`,
                `${(star.start[1] - star.floatAmount) / 10}%`,
                `${star.start[1] / 10}%`
              ]
            }}
            transition={{
              duration: star.duration,
              repeat: Infinity,
              delay: star.delay,
              ease: "easeInOut"
            }}
          >
            <div
              className="relative w-full h-full flex items-center justify-center pointer-events-auto group"
            >
              {/* Star Icon - Solid Fill, Darker Border */}
              <Star
                className="absolute inset-0 text-orange-300 fill-orange-50 group-hover:scale-105 transition-transform duration-500"
                style={{ width: '100%', height: '100%' }}
                strokeWidth={1.5}
              />
              {/* Label - High Contrast */}
              <span className="relative z-10 text-[8.5px] sm:text-[10px] font-bold text-orange-950 leading-tight text-center px-4 select-none">
                {star.name}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-yellow-300/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-20 w-48 h-48 bg-orange-300/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto px-4 lg:px-12 relative z-20 w-full">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div className="order-2 lg:order-1 text-center lg:text-left pt-32 md:pt-40 lg:pt-30">
            <div className="inline-flex items-center gap-2 bg-white/90 px-3 py-1.5 rounded-full border border-orange-100 shadow-sm mb-8 animate-fade-in-up">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">{t('hero.badge')}</span>
            </div>

            <h1 className="text-4xl md:text-[84px] font-black text-[#2D334A] mb-8 leading-[1.05] tracking-tight animate-fade-in-up min-h-35 md:min-h-45" style={{ animationDelay: '0.2s' }}>
              <TextCursorProximity
                key={t('hero.title_part1')} // Force remount when text changes to prevent hook mismatches
                label={t('hero.title_part1')}
                containerRef={containerRef}
                className="inline-block mr-4"
                styles={{
                  transform: { from: "scale(1) translateY(0px)", to: "scale(1.4) translateY(-20px)" },
                  color: { from: "#2D334A", to: "#ea580c" }
                }}
                falloff="gaussian"
                radius={100}
              />
              <br className="hidden md:block" />
              <span className="inline-flex flex-wrap justify-center lg:justify-start">
                {accentChars.map((item, index) => (
                  <TextCursorProximity
                    key={`${index}-${item.char}`} // Compounded key for safety
                    label={item.char}
                    containerRef={containerRef}
                    className="inline-block"
                    styles={{
                      transform: { from: "scale(1) translateY(0px)", to: "scale(1.4) translateY(-20px)" },
                      color: { from: item.color, to: "#ea580c" }
                    }}
                    falloff="gaussian"
                    radius={100}
                  />
                ))}
              </span>
              <br />
              <TextCursorProximity
                key={t('hero.title_part3')} // Force remount when text changes
                label={t('hero.title_part3')}
                containerRef={containerRef}
                className="inline-block"
                styles={{
                  transform: { from: "scale(1) translateY(0px)", to: "scale(1.4) translateY(-20px)" },
                  color: { from: "#2D334A", to: "#ea580c" }
                }}
                falloff="gaussian"
                radius={100}
              />
            </h1>

            <p className="text-base md:text-lg text-gray-500/80 mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              {t('hero.description')}
            </p>

            <div className="flex flex-wrap justify-center lg:justify-start gap-2.5 mb-12 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              {ingredients.map((item, index) => (
                <span
                  key={item}
                  className="ingredient-badge shadow-sm"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start w-full sm:w-auto animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
              <a
                href="#ingredients"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('#ingredients')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-[#f97316] text-white px-8 py-4 rounded-full font-bold text-base shadow-xl shadow-orange-200/50 hover:bg-orange-600 transition-all duration-300"
              >
                {t('hero.cta_more')}
                <ChevronDown className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="order-1 lg:order-2 relative flex justify-center lg:justify-end lg:pr-12 translate-y-[15%] lg:translate-y-0">
            <div ref={bottleRef} className="relative w-max">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-orange-100/20 rounded-full blur-[80px]" />

              <div className="relative animate-float">
                <img
                  src={HERO_LCP_IMAGE_SRC}
                  alt="Bravita Sıvı Takviye"
                  loading="eager"
                  decoding="async"
                  // @ts-expect-error - React doesn't recognize fetchpriority but it's a valid HTML attribute
                  fetchpriority="high"
                  className="w-45 md:w-65 lg:w-[320px] h-auto max-h-[75vh] object-contain relative z-10 drop-shadow-2xl"
                />

                <div className="absolute top-12 -right-2 bg-[#FFC529] text-[#2D334A] px-3 py-1 rounded-full font-bold text-[10px] md:text-xs shadow-lg z-20">
                  {t('hero.bottle_meta')}
                </div>

                <div className="absolute -bottom-2 -left-4 bg-white/95 backdrop-blur-sm p-3 md:p-4 rounded-xl md:rounded-2xl shadow-xl z-20 border border-gray-50">
                  <span className="text-[9px] md:text-[10px] font-bold text-gray-400 block mb-0.5">{t('hero.flavor')}</span>
                  <p className="font-extrabold text-orange-600 text-xs md:text-sm">{t('hero.delicious')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="white"
          />
        </svg>
      </div>
    </section>
  );
};

export default Hero;
