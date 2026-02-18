"use client"

import React, { useState, useEffect, useRef } from "react"
import { m } from "framer-motion"
import { cn } from "@/lib/utils"
import ShineBorder from "@/components/ui/shine-border"

interface Feature {
    step: string
    title?: string
    content: string
    image: string
}

interface FeatureStepsProps {
    features: Feature[]
    className?: string
    title?: string
    autoPlayInterval?: number
    imageHeight?: string
}

export function FeatureSteps({
    features,
    className,
    title = "How to get Started",
    autoPlayInterval = 3000,
    imageHeight = "h-[400px]",
}: FeatureStepsProps) {
    const [currentFeature, setCurrentFeature] = useState(0)
    const [progress, setProgress] = useState(0)
    const [isInView, setIsInView] = useState(false)
    const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set())
    const containerRef = useRef<HTMLDivElement>(null)

    // Intersection Observer - start loading only when near viewport
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
            { rootMargin: "300px" }
        )

        observer.observe(container)
        return () => observer.disconnect()
    }, [])

    // Only run autoplay when in view
    useEffect(() => {
        if (!isInView) return

        const timer = setInterval(() => {
            if (progress < 100) {
                setProgress((prev) => prev + 100 / (autoPlayInterval / 100))
            } else {
                setCurrentFeature((prev) => (prev + 1) % features.length)
                setProgress(0)
            }
        }, 100)

        return () => clearInterval(timer)
    }, [progress, features.length, autoPlayInterval, isInView])

    // Track loaded images
    const handleImageLoad = (index: number) => {
        setLoadedImages(prev => new Set(prev).add(index))
    }

    return (
        <div ref={containerRef} className={cn("p-8 md:p-12", className)}>
            <div className="max-w-7xl mx-auto w-full">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-10 text-center">
                    {title}
                </h2>

                <div className="flex flex-col md:grid md:grid-cols-2 gap-6 md:gap-10 md:items-center">
                    <div className="order-2 md:order-1 space-y-8">
                        {features.map((feature, index) => (
                            <m.div
                                key={feature.step}
                                className="flex items-center gap-6 md:gap-8"
                                initial={{ opacity: 0.3 }}
                                animate={{ opacity: index === currentFeature ? 1 : 0.3 }}
                                transition={{ duration: 0.5 }}
                            >
                                <div
                                    className={cn(
                                        "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 shrink-0 transition-transform duration-300",
                                        index === currentFeature
                                            ? "bg-primary border-primary text-primary-foreground scale-110"
                                            : "bg-muted border-muted-foreground",
                                    )}
                                >
                                    {index <= currentFeature ? (
                                        <span className="text-lg font-bold">✓</span>
                                    ) : (
                                        <span className="text-lg font-semibold">{index + 1}</span>
                                    )}
                                </div>

                                <div className="flex-1">
                                    <h3 className="text-xl md:text-2xl font-semibold">
                                        {feature.title || feature.step}
                                    </h3>
                                    <p className="text-sm md:text-lg text-muted-foreground">
                                        {feature.content}
                                    </p>
                                </div>
                            </m.div>
                        ))}
                    </div>

                    <div
                        className={cn(
                            "order-1 md:order-2 relative aspect-square",
                            imageHeight
                        )}
                    >
                        <ShineBorder
                            borderRadius={16}
                            borderWidth={10}
                            duration={4}
                            color={["#FF6B35", "#FFD93D", "#6BCB77", "#FF6B35"]}
                            className="w-full h-full"
                        >
                            {/* Placeholder while loading */}
                            {!loadedImages.has(currentFeature) && (
                                <div className="absolute inset-0 bg-linear-to-br from-bravita-yellow/20 to-bravita-orange/20 animate-pulse" />
                            )}
                            {/* Only load image when in view */}
                            {isInView && (
                                <img
                                    src={features[currentFeature].image}
                                    alt={features[currentFeature].step}
                                    loading="lazy"
                                    decoding="async"
                                    onLoad={() => handleImageLoad(currentFeature)}
                                    className={cn(
                                        "w-full h-full object-cover transition-opacity duration-300",
                                        loadedImages.has(currentFeature) ? "opacity-100" : "opacity-0"
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
