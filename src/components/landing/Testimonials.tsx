import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  m,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import { Quote } from "lucide-react";
import { useTranslation } from "react-i18next";
import * as THREE from "three";
import FOG from "vanta/dist/vanta.fog.min";

import ScrollReveal from "@/components/ui/scroll-reveal";
import SegmentedRevealText from "@/components/ui/segmented-reveal-text";
import {
  CardTransformed,
  CardsContainer,
  ContainerScroll,
  ReviewStars,
} from "@/components/ui/animated-cards-stack";
import { cn } from "@/lib/utils";

interface TestimonialItem {
  name: string;
  comment: string;
  date: string;
  rating: number;
}

interface TestimonialCardProps {
  item: TestimonialItem;
  compact?: boolean;
  className?: string;
  active?: boolean;
}

function TestimonialCard({
  item,
  compact = false,
  className,
  active,
}: TestimonialCardProps) {
  return (
    <div className={cn("relative flex h-full max-w-full flex-col overflow-hidden", className)}>
      <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-bravita-yellow/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-28 w-28 rounded-full bg-bravita-orange/10 blur-3xl" />

      <div className="relative flex h-full flex-col">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap sm:gap-4">
          <ReviewStars rating={item.rating} />
          <span className="shrink-0 rounded-full border border-orange-200/80 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2D334A]/55">
            {item.date}
          </span>
        </div>

        <div className={cn("min-h-0 flex-1 overflow-hidden", compact ? "mt-5" : "mt-8")}>
          <Quote
            className={cn(
              "shrink-0 rotate-180 text-bravita-orange/70",
              compact ? "h-8 w-8" : "h-9 w-9",
            )}
            aria-hidden="true"
          />
          <blockquote
            className={cn(
              "mt-5 font-semibold tracking-[-0.02em] text-[#2D334A]",
              compact
                ? "text-base leading-7 wrap-anywhere sm:text-lg sm:leading-8"
                : "text-[1.24rem] leading-[1.95rem] wrap-anywhere xl:text-[1.38rem] xl:leading-[2.1rem]",
            )}
          >
            <SegmentedRevealText
              text={item.comment}
              active={active}
              once={compact}
              segmentSize={compact ? 1 : 2}
              blurAmount={10}
              stagger={0.04}
            />
          </blockquote>
        </div>

        <div className="mt-auto flex shrink-0 items-center justify-between gap-3 border-t border-orange-200/60 pt-5">
          <span className="min-w-0 flex-1 truncate text-base font-bold text-[#2D334A]">{item.name}</span>
          <Quote
            className="h-7 w-7 shrink-0 text-bravita-orange/60"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}

function VantaBackground() {
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<ReturnType<typeof FOG> | null>(null);

  const initVanta = useCallback(() => {
    if (!vantaRef.current || vantaEffect.current) return;
    vantaEffect.current = FOG({
      el: vantaRef.current,
      THREE,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200,
      minWidth: 200,
      highlightColor: 0x0,
      midtoneColor: 0xec772c,
      lowlightColor: 0x3d1c0a,
      baseColor: 0x1a0f0a,
      blurFactor: 0.5,
      speed: 0.5,
      zoom: 1.0,
    });
  }, []);

  useEffect(() => {
    initVanta();
    return () => {
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
        vantaEffect.current = null;
      }
    };
  }, [initVanta]);

  return (
    <div
      ref={vantaRef}
      className="relative z-0 h-screen w-full min-[1025px]:sticky min-[1025px]:top-0"
    />
  );
}

const Testimonials = () => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const rawTestimonials = t("about.testimonials.items", {
    returnObjects: true,
  }) as unknown;
  const testimonials = useMemo(
    () =>
      Array.isArray(rawTestimonials)
        ? (rawTestimonials as TestimonialItem[])
        : [],
    [rawTestimonials],
  );
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const handleMobileStackDragEnd = useCallback(
    (offsetX: number) => {
      const swipeThreshold = 70;

      if (offsetX <= -swipeThreshold) {
        setActiveCardIndex((current) =>
          Math.min(testimonials.length - 1, current + 1),
        );
        return;
      }

      if (offsetX >= swipeThreshold) {
        setActiveCardIndex((current) => Math.max(0, current - 1));
      }
    },
    [testimonials.length],
  );

  const { scrollYProgress } = useScroll({
    target: stageRef,
    offset: ["start center", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (prefersReducedMotion || !testimonials.length) return;

    const nextIndex = Math.min(
      testimonials.length - 1,
      Math.floor(Math.max(0, latest) * testimonials.length),
    );

    setActiveCardIndex((current) =>
      current === nextIndex ? current : nextIndex,
    );
  });

  if (!testimonials.length) {
    return null;
  }

  return (
    <section id="testimonials" className="relative overflow-x-visible overflow-y-hidden min-[1025px]:overflow-x-clip min-[1025px]:overflow-y-visible">
      {/* Vanta.js fog background — sticky so it stays fixed during card scroll */}
      <VantaBackground />

      <div className="relative z-10 -mt-[100vh] container mx-auto px-4 pt-10 pb-12 md:pt-16 md:pb-16 min-[1025px]:hidden">
        <div className="mx-auto max-w-6xl md:grid md:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)] md:items-center md:gap-8">
          <div>
            <ScrollReveal delay={0.05}>
              <div className="mx-auto max-w-3xl text-center md:mx-0 md:max-w-xl md:text-left">
                <span className="mb-2 block text-sm font-bold uppercase tracking-[0.24em] text-bravita-orange">
                  {t("about.testimonials.badge")}
                </span>
                <h3 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                  {t("about.testimonials.title")} {" "}
                  <span className="bg-linear-to-r from-bravita-yellow via-bravita-orange to-bravita-red bg-clip-text text-transparent">
                    {t("about.testimonials.title_accent")}
                  </span>
                </h3>
                <p className="mt-4 text-base leading-relaxed text-white/65 md:text-lg">
                  {t("about.testimonials.description")}
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.12}>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur">
                  {`${testimonials.length} ${t("about.testimonials.count_label")}`}
                </span>
                <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 shadow-sm backdrop-blur">
                  {t("about.testimonials.scroll_hint")}
                </span>
              </div>
            </ScrollReveal>
          </div>

          <div className="mt-10 md:mt-0">
            <div className="relative mx-auto h-116 w-full max-w-94 overflow-visible px-4 sm:h-120 sm:max-w-108 sm:px-5 md:ml-auto md:mr-0 md:h-120 md:max-w-115 md:px-6">
              {testimonials.map((testimonial, index) => {
                const offset = index - activeCardIndex;
                const absOffset = Math.abs(offset);
                const isActive = offset === 0;
                const isVisible = absOffset < 3;

                return (
                  <m.div
                    key={`${testimonial.name}-${index}`}
                    className="absolute inset-0"
                    initial={{ opacity: 0, y: 24, scale: 0.92 }}
                    whileInView={{ opacity: 1, y: 0, scale: 0.92 }}
                    viewport={{ once: true, amount: 0.25 }}
                    animate={{
                      x: offset * 12,
                      y: absOffset * 10,
                      scale: 0.9 - absOffset * 0.035,
                      rotate: isActive ? 0 : offset > 0 ? 2.5 : -2.5,
                      opacity: isVisible ? 1 - absOffset * 0.18 : 0,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 28,
                      mass: 0.9,
                    }}
                    style={{
                      zIndex: testimonials.length - absOffset,
                      pointerEvents: isActive ? "auto" : "none",
                    }}
                  >
                    <m.div
                      drag={isActive ? "x" : false}
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.16}
                      onDragEnd={(_, info) => handleMobileStackDragEnd(info.offset.x)}
                      className="h-full"
                      style={{ touchAction: "pan-y" }}
                    >
                      <TestimonialCard
                        item={testimonial}
                        compact
                        active={isActive}
                        className="h-full overflow-hidden rounded-4xl border border-white/70 bg-white/80 p-5 shadow-[0_20px_60px_-35px_rgba(236,119,44,0.28)] backdrop-blur-xl sm:p-6"
                      />
                    </m.div>
                  </m.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div ref={stageRef} className="relative z-10 -mt-[100vh] hidden min-[1025px]:block">
        <ContainerScroll className="h-[300vh] xl:h-[320vh]">
          <div className="sticky left-0 top-0 flex h-screen items-center px-4">
            <div className="container mx-auto grid w-full items-center gap-12 xl:grid-cols-[0.84fr_1fr] xl:gap-14">
              <div className="space-y-6 self-center">
                <div className="rounded-4xl border border-white/15 bg-white/8 p-8 shadow-[0_20px_70px_-45px_rgba(0,0,0,0.5)] backdrop-blur-xl xl:p-10">
                  <span className="mb-3 block text-sm font-bold uppercase tracking-[0.24em] text-bravita-orange">
                    {t("about.testimonials.badge")}
                  </span>
                  <h3 className="text-4xl font-extrabold tracking-tight text-white xl:text-5xl">
                    {t("about.testimonials.title")} {" "}
                    <span className="bg-linear-to-r from-bravita-yellow via-bravita-orange to-bravita-red bg-clip-text text-transparent">
                      {t("about.testimonials.title_accent")}
                    </span>
                  </h3>
                  <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/65">
                    {t("about.testimonials.description")}
                  </p>
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm">
                      {`${testimonials.length} ${t("about.testimonials.count_label")}`}
                    </span>
                    <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 shadow-sm">
                      {t("about.testimonials.scroll_hint")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center self-center">
                <CardsContainer className="mx-auto h-130 w-full max-w-137.5 xl:h-140 xl:max-w-137.5">
                  {testimonials.map((testimonial, index) => {
                    const isActive = activeCardIndex === index;

                    return (
                      <CardTransformed
                        key={`${testimonial.name}-${index}`}
                        arrayLength={testimonials.length}
                        index={index + 1}
                        activeIndex={activeCardIndex}
                        incrementY={14}
                        incrementZ={10}
                        incrementRotation={index === 0 ? 0 : index % 2 === 0 ? 4 : -4}
                        variant={index % 2 === 0 ? "brand" : "muted"}
                      >
                        <TestimonialCard
                          item={testimonial}
                          active={isActive}
                        />
                      </CardTransformed>
                    );
                  })}
                </CardsContainer>
              </div>
            </div>
          </div>
        </ContainerScroll>
      </div>
    </section>
  );
};

export default Testimonials;
