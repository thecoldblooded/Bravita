"use client"

import { cn } from "../../lib/utils"

type TColorProp = string | string[]

interface ShineBorderProps {
    borderRadius?: number
    borderWidth?: number
    duration?: number
    color?: TColorProp
    className?: string
    children: React.ReactNode
}

/**
 * @name Shine Border
 * @description It is an animated background border effect component with easy to use and configurable props.
 * @param borderRadius defines the radius of the border.
 * @param borderWidth defines the width of the border.
 * @param duration defines the animation duration to be applied on the shining border
 * @param color a string or string array to define border color.
 * @param className defines the class name to be applied to the component
 * @param children contains react node elements.
 */
export default function ShineBorder({
    borderRadius = 8,
    borderWidth = 10,
    duration = 14,
    color = "#000000",
    className,
    children,
}: ShineBorderProps) {
    const colors = color instanceof Array ? color : [color]
    const gradientColors = [...colors, ...colors].join(", ")

    return (
        <div
            className={cn(
                "relative",
                className,
            )}
            style={{
                borderRadius: `${borderRadius}px`,
                padding: `${borderWidth}px`,
            }}
        >
            {/* Animated rotating gradient with feathered outer edge */}
            <div
                className="absolute inset-0 overflow-hidden"
                style={{
                    borderRadius: `${borderRadius}px`,
                    maskImage: `radial-gradient(ellipse at center, black 60%, transparent 100%)`,
                    WebkitMaskImage: `radial-gradient(ellipse at center, black 60%, transparent 100%)`,
                }}
            >
                <div
                    className="absolute"
                    style={{
                        inset: '-50%',
                        background: `conic-gradient(from 0deg, ${gradientColors})`,
                        animation: `spin ${duration}s linear infinite`,
                        filter: 'blur(3px)',
                    }}
                />
            </div>
            {/* Content container - stays fixed */}
            <div 
                className="relative w-full h-full overflow-hidden bg-background"
                style={{
                    borderRadius: `${borderRadius - borderWidth}px`,
                }}
            >
                {children}
            </div>
        </div>
    )
}
