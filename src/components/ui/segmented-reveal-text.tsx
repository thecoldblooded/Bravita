import * as React from "react"
import { m, useInView, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"

interface SegmentedRevealTextProps
    extends React.HTMLAttributes<HTMLSpanElement> {
    text: string
    segmentSize?: number
    active?: boolean
    once?: boolean
    blurAmount?: number
    baseDelay?: number
    stagger?: number
}

function splitIntoSegments(text: string, segmentSize: number) {
    const words = text.trim().split(/\s+/).filter(Boolean)
    const segments: string[] = []

    for (let index = 0; index < words.length; index += segmentSize) {
        segments.push(words.slice(index, index + segmentSize).join(" "))
    }

    return segments
}

export default function SegmentedRevealText({
    text,
    className,
    segmentSize = 2,
    active,
    once = true,
    blurAmount = 10,
    baseDelay = 0,
    stagger = 0.045,
    ...props
}: SegmentedRevealTextProps) {
    const ref = React.useRef<HTMLSpanElement>(null)
    const prefersReducedMotion = useReducedMotion()
    const isInView = useInView(ref, {
        once,
        amount: 0.25,
        margin: "0px 0px -10% 0px",
    })

    const segments = React.useMemo(
        () => splitIntoSegments(text, Math.max(1, segmentSize)),
        [segmentSize, text],
    )

    const shouldShow = prefersReducedMotion
        ? true
        : typeof active === "boolean"
            ? active
            : isInView

    return (
        <span
            ref={ref}
            className={cn("inline max-w-full whitespace-normal wrap-anywhere", className)}
            {...props}
        >
            {segments.map((segment, index) => (
                <m.span
                    key={`${segment}-${index}`}
                    className="inline-block max-w-full whitespace-pre-wrap wrap-anywhere align-top"
                    initial={false}
                    animate={
                        shouldShow
                            ? { opacity: 1, y: 0, filter: "blur(0px)" }
                            : { opacity: 0, y: 12, filter: `blur(${blurAmount}px)` }
                    }
                    transition={{
                        duration: 0.5,
                        delay: baseDelay + index * stagger,
                        ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{ willChange: "opacity, transform, filter" }}
                >
                    {segment}
                    {index < segments.length - 1 ? " " : ""}
                </m.span>
            ))}
        </span>
    )
}
