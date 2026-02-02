"use client"

import React, { CSSProperties, forwardRef, useEffect, useMemo, useRef, useCallback } from "react"
import { motion, useMotionValue, transform, motionValue, MotionValue } from "framer-motion"

// Helper type that makes all properties of CSSProperties accept number | string
type CSSPropertiesWithValues = {
    [K in keyof CSSProperties]: string | number
}

interface StyleValue<T extends keyof CSSPropertiesWithValues> {
    from: CSSPropertiesWithValues[T]
    to: CSSPropertiesWithValues[T]
}

interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {
    label: string
    styles: Partial<{
        [K in keyof CSSPropertiesWithValues]: StyleValue<K>
    }>
    containerRef: React.RefObject<HTMLElement>
    radius?: number
    falloff?: "linear" | "exponential" | "gaussian"
}

interface LetterProps {
    char: string
    styles: Partial<{ [K in keyof CSSPropertiesWithValues]: StyleValue<K> }>
    radius: number
    falloff: "linear" | "exponential" | "gaussian"
    containerRef: React.RefObject<HTMLElement>
    mouseX: MotionValue<number>
    mouseY: MotionValue<number>
}

const Letter = ({
    char,
    styles,
    radius,
    falloff,
    containerRef,
    mouseX,
    mouseY
}: LetterProps) => {
    const ref = useRef<HTMLSpanElement>(null)
    const proximity = useMotionValue(0)

    // Create MotionValues for each style property
    const styleMVs = useMemo(() => {
        const mvs: Record<string, MotionValue<string | number>> = {}
        Object.keys(styles).forEach((key) => {
            const styleKey = key as keyof CSSPropertiesWithValues
            if (styles[styleKey]) {
                mvs[key] = motionValue(styles[styleKey]!.from)
            }
        })
        return mvs
    }, [styles])

    // Update styles when proximity changes
    useEffect(() => {
        const unsubscribe = proximity.on("change", (latestProximity) => {
            Object.keys(styles).forEach((key) => {
                const styleKey = key as keyof CSSPropertiesWithValues
                const config = styles[styleKey]
                if (config && styleMVs[key]) {
                    const value = transform(latestProximity, [0, 1], [config.from, config.to])
                    styleMVs[key].set(value)
                }
            })
        })
        return () => unsubscribe()
    }, [proximity, styles, styleMVs])

    const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
    }

    const calculateFalloff = useCallback((distance: number): number => {
        const normalizedDistance = Math.min(Math.max(1 - distance / radius, 0), 1)
        switch (falloff) {
            case "exponential":
                return Math.pow(normalizedDistance, 2)
            case "gaussian":
                return Math.exp(-Math.pow(distance / (radius / 2), 2) / 2)
            case "linear":
            default:
                return normalizedDistance
        }
    }, [radius, falloff])

    const updateProximity = useCallback(() => {
        if (!containerRef.current || !ref.current) return

        const containerRect = containerRef.current.getBoundingClientRect()
        const rect = ref.current.getBoundingClientRect()

        const letterCenterX = rect.left + rect.width / 2 - containerRect.left
        const letterCenterY = rect.top + rect.height / 2 - containerRect.top

        const distance = calculateDistance(
            mouseX.get(),
            mouseY.get(),
            letterCenterX,
            letterCenterY
        )

        const newProximity = calculateFalloff(distance)
        proximity.set(newProximity)
    }, [containerRef, mouseX, mouseY, proximity, calculateFalloff])

    // Subscribe to mouse position changes instead of using useAnimationFrame
    useEffect(() => {
        const unsubX = mouseX.on("change", updateProximity)
        const unsubY = mouseY.on("change", updateProximity)

        return () => {
            unsubX()
            unsubY()
        }
    }, [mouseX, mouseY, updateProximity])

    return (
        <motion.span
            ref={ref}
            className="inline-block"
            aria-hidden="true"
            style={styleMVs}
        >
            {char}
        </motion.span>
    )
}

const TextCursorProximity = forwardRef<HTMLSpanElement, TextProps>(
    (
        {
            label,
            styles,
            containerRef,
            radius = 50,
            falloff = "linear",
            className,
            onClick,
            ...props
        },
        ref
    ) => {
        const mouseX = useMotionValue(0)
        const mouseY = useMotionValue(0)
        const words = label.split(" ")

        // Track mouse position relative to container using MotionValues with throttle
        useEffect(() => {
            let rafId: number | null = null
            let lastX = 0
            let lastY = 0

            const updatePosition = () => {
                if (containerRef?.current) {
                    const rect = containerRef.current.getBoundingClientRect()
                    mouseX.set(lastX - rect.left)
                    mouseY.set(lastY - rect.top)
                }
                rafId = null
            }

            const scheduleUpdate = (x: number, y: number) => {
                lastX = x
                lastY = y
                if (!rafId) {
                    rafId = requestAnimationFrame(updatePosition)
                }
            }

            const handleMouseMove = (ev: MouseEvent) => {
                scheduleUpdate(ev.clientX, ev.clientY)
            }

            const handleTouchMove = (ev: TouchEvent) => {
                const touch = ev.touches[0]
                scheduleUpdate(touch.clientX, touch.clientY)
            }

            window.addEventListener("mousemove", handleMouseMove, { passive: true })
            window.addEventListener("touchmove", handleTouchMove, { passive: true })

            return () => {
                window.removeEventListener("mousemove", handleMouseMove)
                window.removeEventListener("touchmove", handleTouchMove)
                if (rafId) cancelAnimationFrame(rafId)
            }
        }, [containerRef, mouseX, mouseY])

        return (
            <span
                ref={ref}
                className={`${className} inline`}
                onClick={onClick}
                {...props}
            >
                {words.map((word, wordIndex) => (
                    <span key={wordIndex} className="inline-block whitespace-nowrap">
                        {word.split("").map((letter, letterIndex) => (
                            <Letter
                                key={`${wordIndex}-${letterIndex}`}
                                char={letter}
                                styles={styles}
                                radius={radius}
                                falloff={falloff}
                                containerRef={containerRef}
                                mouseX={mouseX}
                                mouseY={mouseY}
                            />
                        ))}
                        {wordIndex < words.length - 1 && (
                            <span className="inline-block">&nbsp;</span>
                        )}
                    </span>
                ))}
                <span className="sr-only">{label}</span>
            </span>
        )
    }
)

TextCursorProximity.displayName = "TextCursorProximity"
export default TextCursorProximity
