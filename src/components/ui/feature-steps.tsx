"use client"

import React, { useEffect, useRef, useState } from "react"
import { m } from "framer-motion"

import SegmentedRevealText from "@/components/ui/segmented-reveal-text"
import ShineBorder from "@/components/ui/shine-border"
import { cn } from "@/lib/utils"

interface Feature {
  step: string
  title?: string
  content: string
  image: string
}

type FeatureStepsMode = "auto" | "scroll"

interface FeatureStepsProps {
  features: Feature[]
  className?: string
  title?: string
  autoPlayInterval?: number
  imageHeight?: string
  mode?: FeatureStepsMode
}

export function FeatureSteps({
  features,
  className,
  title = "How to get Started",
  autoPlayInterval = 3000,
  imageHeight = "h-[400px]",
  mode = "auto",
}: FeatureStepsProps) {
  const [currentFeature, setCurrentFeature] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isInView, setIsInView] = useState(false)
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: "300px" },
    )

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (mode !== "auto" || !isInView) return

    const timer = setInterval(() => {
      if (progress < 100) {
        setProgress((prev) => prev + 100 / (autoPlayInterval / 100))
      } else {
        setCurrentFeature((prev) => (prev + 1) % features.length)
        setProgress(0)
      }
    }, 100)

    return () => clearInterval(timer)
  }, [progress, features.length, autoPlayInterval, isInView, mode])

  useEffect(() => {
    if (mode !== "scroll" || !isInView) return

    const items = itemRefs.current.filter(
      (item): item is HTMLDivElement => item !== null,
    )

    if (!items.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (!mostVisible) return

        const nextIndex = Number(
          (mostVisible.target as HTMLElement).dataset.index ?? 0,
        )

        if (!Number.isNaN(nextIndex)) {
          setCurrentFeature(nextIndex)
        }
      },
      {
        rootMargin: "-15% 0px -35% 0px",
        threshold: [0.2, 0.35, 0.5, 0.7, 0.9],
      },
    )

    items.forEach((item) => observer.observe(item))

    return () => observer.disconnect()
  }, [features.length, isInView, mode])

  const handleImageLoad = (index: number) => {
    setLoadedImages((prev) => new Set(prev).add(index))
  }

  const isScrollMode = mode === "scroll"

  return (
    <div ref={containerRef} className={cn("p-8 md:p-12", className)}>
      <div className="mx-auto w-full max-w-7xl">
        <h2 className="mb-10 text-center text-3xl font-bold md:text-4xl lg:text-5xl">
          {title}
        </h2>

        <div
          className={cn(
            "flex flex-col gap-6 md:grid md:gap-10",
            isScrollMode
              ? "md:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.88fr)] md:items-start"
              : "md:grid-cols-2 md:items-center",
          )}
        >
          <div
            className={cn(
              "order-2 md:order-1",
              isScrollMode ? "space-y-6 md:space-y-8 md:pr-6" : "space-y-8",
            )}
          >
            {features.map((feature, index) => {
              const isActive = index === currentFeature

              return (
                <m.div
                  key={feature.step}
                  ref={(node) => {
                    itemRefs.current[index] = node
                  }}
                  data-index={index}
                  className={cn(
                    "flex items-center gap-6 md:gap-8",
                    isScrollMode &&
                    "min-h-33 rounded-[1.75rem] border border-white/45 bg-white/55 px-4 py-5 shadow-[0_20px_60px_-45px_rgba(45,51,74,0.25)] backdrop-blur-sm md:min-h-40 md:px-6",
                    isScrollMode &&
                    isActive &&
                    "border-bravita-orange/30 bg-white/88 shadow-[0_24px_70px_-40px_rgba(236,119,44,0.35)]",
                  )}
                  initial={
                    isScrollMode
                      ? { opacity: 0, y: 28, filter: "blur(10px)" }
                      : { opacity: 0.3 }
                  }
                  whileInView={
                    isScrollMode
                      ? { opacity: 1, y: 0, filter: "blur(0px)" }
                      : undefined
                  }
                  viewport={
                    isScrollMode ? { once: true, amount: 0.35 } : undefined
                  }
                  animate={
                    !isScrollMode ? { opacity: isActive ? 1 : 0.3 } : undefined
                  }
                  transition={{
                    duration: 0.55,
                    ease: [0.21, 0.47, 0.32, 0.98],
                  }}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-transform duration-300 md:h-10 md:w-10",
                      isActive
                        ? "scale-110 border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground bg-muted",
                    )}
                  >
                    {index <= currentFeature ? (
                      <span className="text-lg font-bold">✓</span>
                    ) : (
                      <span className="text-lg font-semibold">{index + 1}</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3
                      className={cn(
                        "text-xl font-semibold md:text-2xl",
                        isScrollMode && isActive && "text-[#2D334A]",
                      )}
                    >
                      {feature.title || feature.step}
                    </h3>
                    <p className="text-sm text-muted-foreground md:text-lg">
                      <SegmentedRevealText
                        text={feature.content}
                        active={isActive}
                        once={false}
                        segmentSize={3}
                        blurAmount={10}
                        baseDelay={0.04}
                      />
                    </p>
                  </div>
                </m.div>
              )
            })}
          </div>

          <div
            className={cn(
              "order-1 relative aspect-square md:order-2",
              imageHeight,
              isScrollMode && "md:sticky md:top-28",
            )}
          >
            <ShineBorder
              borderRadius={16}
              borderWidth={10}
              duration={4}
              color={["#FF6B35", "#FFD93D", "#6BCB77", "#FF6B35"]}
              className="h-full w-full"
            >
              {!loadedImages.has(currentFeature) && (
                <div className="absolute inset-0 animate-pulse bg-linear-to-br from-bravita-yellow/20 to-bravita-orange/20" />
              )}
              {isInView && (
                <img
                  src={features[currentFeature].image}
                  alt={features[currentFeature].step}
                  loading="lazy"
                  decoding="async"
                  onLoad={() => handleImageLoad(currentFeature)}
                  className={cn(
                    "h-full w-full object-cover transition-opacity duration-300",
                    loadedImages.has(currentFeature) ? "opacity-100" : "opacity-0",
                  )}
                />
              )}
            </ShineBorder>
          </div>
        </div>
      </div>
    </div>
  )
}
