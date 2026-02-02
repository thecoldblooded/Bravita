import { useEffect, useRef, useState, useCallback, memo } from "react";

interface LordIconProps {
    src: string;
    trigger?: string;
    stroke?: string;
    state?: string;
    colors?: string;
    size?: number;
    className?: string;
}

// Global flag to track if lord-icon is ready (shared across all instances)
let globalIsReady = false;
let globalReadyPromise: Promise<void> | null = null;

const waitForLordIcon = (): Promise<void> => {
    if (globalIsReady) return Promise.resolve();

    if (globalReadyPromise) return globalReadyPromise;

    globalReadyPromise = new Promise((resolve) => {
        // Check if already defined
        if (typeof customElements !== "undefined" && customElements.get("lord-icon")) {
            globalIsReady = true;
            resolve();
            return;
        }

        // Wait for definition
        if (typeof customElements !== "undefined") {
            customElements.whenDefined("lord-icon").then(() => {
                globalIsReady = true;
                resolve();
            }).catch(() => {
                // Fallback: check periodically for 5 seconds max
                let attempts = 0;
                const check = setInterval(() => {
                    attempts++;
                    if (customElements.get("lord-icon")) {
                        globalIsReady = true;
                        clearInterval(check);
                        resolve();
                    } else if (attempts > 50) {
                        clearInterval(check);
                        resolve(); // Give up but don't block
                    }
                }, 100);
            });
        } else {
            resolve(); // No customElements support
        }
    });

    return globalReadyPromise;
};

// Memoized component to prevent unnecessary re-renders
export const LordIcon = memo(function LordIcon({
    src,
    trigger = "hover",
    stroke = "bold",
    state,
    colors,
    size = 45,
    className = "",
}: LordIconProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isReady, setIsReady] = useState(globalIsReady);
    const mountedRef = useRef(true);

    // Initialize once
    useEffect(() => {
        mountedRef.current = true;

        if (!isReady) {
            waitForLordIcon().then(() => {
                if (mountedRef.current) {
                    setIsReady(true);
                }
            });
        }

        return () => {
            mountedRef.current = false;
        };
    }, []); // Empty deps - only run once

    // Create lord-icon element when ready
    const createIcon = useCallback(() => {
        if (!containerRef.current || !isReady) return;

        // Check if icon already exists
        const existingIcon = containerRef.current.querySelector("lord-icon");
        if (existingIcon) return;

        // Create lord-icon element
        const lordIcon = document.createElement("lord-icon");
        lordIcon.setAttribute("src", src);
        lordIcon.setAttribute("trigger", trigger);
        lordIcon.setAttribute("stroke", stroke);
        if (state) lordIcon.setAttribute("state", state);
        if (colors) lordIcon.setAttribute("colors", colors);
        lordIcon.style.width = `${size}px`;
        lordIcon.style.height = `${size}px`;
        lordIcon.style.display = "block";

        containerRef.current.appendChild(lordIcon);
    }, [src, trigger, stroke, state, colors, size, isReady]);

    useEffect(() => {
        createIcon();
    }, [createIcon]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                width: size,
                height: size,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
            }}
        />
    );
});
