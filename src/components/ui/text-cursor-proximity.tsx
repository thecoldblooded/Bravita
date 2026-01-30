"use client"

import React, { CSSProperties, forwardRef, useEffect, useMemo, useRef } from "react"
import { motion, useAnimationFrame, useMotionValue, transform, motionValue, MotionValue } from "framer-motion"
import { useMousePositionRef } from "../../hooks/use-mouse-position-ref"

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

const Letter = ({
    char,
    styles,
    radius = 50,
    falloff = "linear",
    mousePositionRef,
    containerRef
}: {
    char: string
    styles: Partial<{ [K in keyof CSSPropertiesWithValues]: StyleValue<K> }>
    radius?: number
    falloff?: "linear" | "exponential" | "gaussian"
    mousePositionRef: React.MutableRefObject<{ x: number, y: number }>
    containerRef: React.RefObject<HTMLElement>
}) => {
    const ref = useRef<HTMLSpanElement>(null)
    const proximity = useMotionValue(0)

    // Create MotionValues for each style property manually
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

    // Update style MotionValues when proximity changes
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

    const calculateDistance = (
        x1: number,
        y1: number,
        x2: number,
        y2: number
    ): number => {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
    }

    const calculateFalloff = (distance: number): number => {
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
    }

    useAnimationFrame(() => {
        if (!containerRef.current || !ref.current) return

        // Note: For high performance with many letters, caching containerRect in parent is better.
        // But for typical usage (short text), this is acceptable.
        const containerRect = containerRef.current.getBoundingClientRect()
        const rect = ref.current.getBoundingClientRect()

        const letterCenterX = rect.left + rect.width / 2 - containerRect.left
        const letterCenterY = rect.top + rect.height / 2 - containerRect.top

        const distance = calculateDistance(
            mousePositionRef.current.x,
            mousePositionRef.current.y,
            letterCenterX,
            letterCenterY
        )

        const newProximity = calculateFalloff(distance)
        proximity.set(newProximity)
    })

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
        const mousePositionRef = useMousePositionRef(containerRef)
        const words = label.split(" ")

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
                                mousePositionRef={mousePositionRef}
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
