import React, { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion, useSpring } from "framer-motion";

const infographicImage = new URL("@/assets/bravita-infographic.webp", import.meta.url).href;

export default function ScrollFeatureGallery() {
    const sectionRef = useRef(null);
    const reduceMotion = Boolean(useReducedMotion());

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end end"],
    });

    // --- GECİKMESİZ (NO LAG) PÜRÜZSÜZLÜK AYARI ---
    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 400,
        damping: 60,
        mass: 0.05,
        restDelta: 0.0001
    });

    // --- ZAMAN ÇİZELGESİ AYARLARI ---
    const y = useTransform(
        smoothProgress,
        [0, 0.5, 0.7, 0.9, 1],
        reduceMotion ? ["0vh", "0vh", "0vh", "0vh", "0vh"] : ["80vh", "0vh", "-5vh", "-15vh", "-25vh"]
    );

    const scale = useTransform(
        smoothProgress,
        [0, 0.2, 0.5, 0.7, 0.9, 1],
        reduceMotion ? [1, 1, 1, 1, 1, 1] : [4, 2, 1.1, 0.95, 0.8, 0.75]
    );

    const rotateX = useTransform(
        smoothProgress,
        [0, 0.5],
        reduceMotion ? [0, 0] : [45, 0]
    );

    const filter = useTransform(
        smoothProgress,
        [0, 0.2, 0.5, 0.7, 0.9],
        [
            "brightness(0) saturate(0) blur(10px)",
            "brightness(0.3) saturate(0.5) blur(4px)",
            "brightness(1) saturate(1) blur(0px)",
            "brightness(1) saturate(1) blur(0px)",
            "brightness(0.2) saturate(0.5) blur(4px)"
        ]
    );

    const imageOpacity = useTransform(
        smoothProgress,
        [0, 0.2, 1],
        [0, 1, 1]
    );

    // --- METİN ANİMASYONLARI ---
    const textOpacity = useTransform(
        smoothProgress,
        [0.7, 0.85, 1],
        [0, 1, 1]
    );

    const textY = useTransform(
        smoothProgress,
        [0.7, 0.85, 1],
        ["35vh", "15vh", "5vh"]
    );

    const textScale = useTransform(smoothProgress, [0.7, 0.85], [0.85, 1]);

    return (
        <section
            ref={sectionRef}
            aria-label="Bravita Detaylı İnceleme"
            className="relative min-h-[280vh] bg-black"
        >
            <div className="sticky top-0 flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-black [perspective:1400px]">

                {/* Arkaplan Işığı */}
                <motion.div
                    className="absolute top-1/2 left-1/2 h-[40vh] w-[60vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF6B00]/10 blur-[150px]"
                    style={{ opacity: useTransform(smoothProgress, [0.3, 0.5, 0.9], [0, 1, 0]) }}
                />

                {/* Ana Görsel */}
                <motion.div
                    className="relative z-10 flex w-[95vw] max-w-7xl items-center justify-center"
                    style={{
                        y,
                        scale,
                        rotateX,
                        opacity: imageOpacity,
                        filter: reduceMotion ? "none" : filter,
                        transformOrigin: "bottom center",
                        willChange: "transform, filter, opacity"
                    }}
                >
                    <div className="relative w-full overflow-hidden rounded-xl border border-white/5 bg-black shadow-2xl md:rounded-[2rem]">
                        <img
                            src={infographicImage}
                            alt="Bravita Ürün İnfografiği"
                            className="h-auto w-full object-cover"
                            loading="lazy"
                        />
                    </div>
                </motion.div>

                {/* Metin ve CTA Alanı */}
                <motion.div
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center"
                    style={{
                        opacity: textOpacity,
                        y: textY,
                        scale: textScale,
                        paddingTop: "25vh",
                        willChange: "transform, opacity"
                    }}
                >
                    <h2 className="mb-4 text-5xl font-extrabold tracking-tight text-white md:text-7xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
                        Her Damlasında <br className="hidden md:block" /> Sağlık Var!
                    </h2>
                    <p className="mb-8 max-w-2xl text-lg font-medium text-neutral-300 md:text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                        Çocuğunuzun fiziksel ve zihinsel gelişimini destekleyen, uzmanlarca hazırlanmış özel formül. Bravita dünyasını ve zengin içeriğimizi
                    </p>

                    {/* BUTON GÜNCELLEMESİ: Padding (px-10 py-4) ve yazı boyutu (text-base md:text-lg) büyütüldü */}
                    <div className="group relative inline-flex items-center justify-center gap-3 rounded-full bg-[#CC5500] px-10 py-4 text-base font-semibold text-white shadow-lg cursor-default md:text-lg">
                        Keşfetmeye devam edin
                        {/* İkon boyutu büyütüldü (h-5 w-5) */}
                        <motion.svg
                            animate={{ y: [0, 4, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </motion.svg>
                    </div>
                </motion.div>

                <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-32 bg-gradient-to-b from-black to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-16 bg-gradient-to-t from-black to-transparent" />
            </div>
        </section>
    );
}