"use client";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export const BackgroundGradientAnimation = ({
    gradientBackgroundStart = "rgb(108, 0, 162)",
    gradientBackgroundEnd = "rgb(0, 17, 82)",
    firstColor = "18, 113, 255",
    secondColor = "221, 74, 255",
    thirdColor = "100, 220, 255",
    fourthColor = "200, 50, 50",
    fifthColor = "180, 180, 50",
    pointerColor = "140, 100, 255",
    size = "80%",
    blendingValue = "hard-light",
    children,
    className,
    interactive = true,
    containerClassName,
}: {
    gradientBackgroundStart?: string;
    gradientBackgroundEnd?: string;
    firstColor?: string;
    secondColor?: string;
    thirdColor?: string;
    fourthColor?: string;
    fifthColor?: string;
    pointerColor?: string;
    size?: string;
    blendingValue?: string;
    children?: React.ReactNode;
    className?: string;
    interactive?: boolean;
    containerClassName?: string;
}) => {
    const interactiveRef = useRef<HTMLDivElement>(null);
    const curXRef = useRef(0);
    const curYRef = useRef(0);
    const tgXRef = useRef(0);
    const tgYRef = useRef(0);

    // Detect mobile once on mount — no re-renders needed
    const [isMobile] = useState(
        () => typeof window !== "undefined" && (window.innerWidth < 1024 || window.matchMedia("(hover: none)").matches)
    );

    useEffect(() => {
        document.body.style.setProperty(
            "--gradient-background-start",
            gradientBackgroundStart
        );
        document.body.style.setProperty(
            "--gradient-background-end",
            gradientBackgroundEnd
        );
        document.body.style.setProperty("--first-color", firstColor);
        document.body.style.setProperty("--second-color", secondColor);
        document.body.style.setProperty("--third-color", thirdColor);
        document.body.style.setProperty("--fourth-color", fourthColor);
        document.body.style.setProperty("--fifth-color", fifthColor);
        document.body.style.setProperty("--pointer-color", pointerColor);
        document.body.style.setProperty("--size", size);
        document.body.style.setProperty("--blending-value", blendingValue);
    }, [gradientBackgroundStart, gradientBackgroundEnd, firstColor, secondColor, thirdColor, fourthColor, fifthColor, pointerColor, size, blendingValue]);

    // Desktop-only: rAF loop for interactive cursor tracking using refs (no setState)
    useEffect(() => {
        if (isMobile) return;

        let animationFrameId: number;

        function move() {
            if (!interactiveRef.current) {
                animationFrameId = requestAnimationFrame(move);
                return;
            }

            curXRef.current += (tgXRef.current - curXRef.current) / 20;
            curYRef.current += (tgYRef.current - curYRef.current) / 20;

            interactiveRef.current.style.transform = `translate(${Math.round(curXRef.current)}px, ${Math.round(curYRef.current)}px)`;

            animationFrameId = requestAnimationFrame(move);
        }

        move();
        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [isMobile]);

    const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        if (interactiveRef.current) {
            const rect = interactiveRef.current.getBoundingClientRect();
            tgXRef.current = event.clientX - rect.left;
            tgYRef.current = event.clientY - rect.top;
        }
    };

    const [isSafari, setIsSafari] = useState(false);
    useEffect(() => {
        if (isMobile) return;
        const checkSafari = () => /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const result = checkSafari();
        queueMicrotask(() => setIsSafari(result));
    }, [isMobile]);

    // Mobile: render a simple static gradient — no blur, no rAF, no SVG filters
    if (isMobile) {
        return (
            <div
                className={cn(
                    "h-screen w-screen relative overflow-hidden top-0 left-0",
                    containerClassName
                )}
                style={{
                    background: `linear-gradient(135deg, ${gradientBackgroundStart} 0%, ${gradientBackgroundEnd} 100%)`,
                }}
            >
                <div className={cn("", className)}>{children}</div>
                {/* Static soft gradient orbs — CSS only, no JS animation */}
                <div className="absolute inset-0 opacity-30 pointer-events-none">
                    <div
                        className="absolute w-[60%] h-[60%] top-[10%] left-[15%] rounded-full"
                        style={{ background: `radial-gradient(circle, rgba(${firstColor}, 0.5) 0%, transparent 70%)` }}
                    />
                    <div
                        className="absolute w-[50%] h-[50%] bottom-[10%] right-[10%] rounded-full"
                        style={{ background: `radial-gradient(circle, rgba(${secondColor}, 0.4) 0%, transparent 70%)` }}
                    />
                </div>
            </div>
        );
    }

    // Desktop: full animated gradient with interactive cursor
    return (
        <div
            className={cn(
                "h-screen w-screen relative overflow-hidden top-0 left-0 bg-[linear-gradient(40deg,var(--gradient-background-start),var(--gradient-background-end))]",
                containerClassName
            )}
        >
            <svg className="hidden">
                <defs>
                    <filter id="blurMe">
                        <feGaussianBlur
                            in="SourceGraphic"
                            stdDeviation="10"
                            result="blur"
                        />
                        <feColorMatrix
                            in="blur"
                            mode="matrix"
                            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
                            result="goo"
                        />
                        <feBlend in="SourceGraphic" in2="goo" />
                    </filter>
                </defs>
            </svg>
            <div className={cn("", className)}>{children}</div>
            <div
                className={cn(
                    "gradients-container h-full w-full blur-lg",
                    isSafari ? "blur-2xl" : "filter-[url(#blurMe)_blur(40px)]"
                )}
            >
                <div
                    className={cn(
                        `absolute [background:radial-gradient(circle_at_center,var(--first-color)_0,var(--first-color)_50%)_no-repeat]`,
                        `mix-blend-(--blending-value) w-(--size) h-(--size) top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
                        `origin-[center_center]`,
                        `animate-first`,
                        `opacity-100`
                    )}
                ></div>
                <div
                    className={cn(
                        `absolute [background:radial-gradient(circle_at_center,rgba(var(--second-color),0.8)_0,rgba(var(--second-color),0)_50%)_no-repeat]`,
                        `mix-blend-(--blending-value) w-(--size) h-(--size) top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
                        `origin-[calc(50%-400px)]`,
                        `animate-second`,
                        `opacity-100`
                    )}
                ></div>
                <div
                    className={cn(
                        `absolute [background:radial-gradient(circle_at_center,rgba(var(--third-color),0.8)_0,rgba(var(--third-color),0)_50%)_no-repeat]`,
                        `mix-blend-(--blending-value) w-(--size) h-(--size) top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
                        `origin-[calc(50%+400px)]`,
                        `animate-third`,
                        `opacity-100`
                    )}
                ></div>
                <div
                    className={cn(
                        `absolute [background:radial-gradient(circle_at_center,rgba(var(--fourth-color),0.8)_0,rgba(var(--fourth-color),0)_50%)_no-repeat]`,
                        `mix-blend-(--blending-value) w-(--size) h-(--size) top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
                        `origin-[calc(50%-200px)]`,
                        `animate-fourth`,
                        `opacity-70`
                    )}
                ></div>
                <div
                    className={cn(
                        `absolute [background:radial-gradient(circle_at_center,rgba(var(--fifth-color),0.8)_0,rgba(var(--fifth-color),0)_50%)_no-repeat]`,
                        `mix-blend-(--blending-value) w-(--size) h-(--size) top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
                        `origin-[calc(50%-800px)_calc(50%+800px)]`,
                        `animate-fifth`,
                        `opacity-100`
                    )}
                ></div>

                {interactive && (
                    <div
                        ref={interactiveRef}
                        onMouseMove={handleMouseMove}
                        className={cn(
                            `absolute [background:radial-gradient(circle_at_center,rgba(var(--pointer-color),0.8)_0,rgba(var(--pointer-color),0)_50%)_no-repeat]`,
                            `mix-blend-(--blending-value) w-full h-full -top-1/2 -left-1/2`,
                            `opacity-70`
                        )}
                    ></div>
                )}
            </div>
        </div>
    );
};
