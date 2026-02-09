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
    }, [isReady]); // Re-run if isReady changes

    // Create or update lord-icon element
    const updateIcon = useCallback(() => {
        if (!containerRef.current || !isReady) return;

        // Check if icon already exists
        let lordIcon = containerRef.current.querySelector("lord-icon") as any;

        if (!lordIcon) {
            // Create lord-icon element
            lordIcon = document.createElement("lord-icon");
            containerRef.current.appendChild(lordIcon);
        }

        // Update attributes if they changed
        if (lordIcon.getAttribute("src") !== src) lordIcon.setAttribute("src", src);
        if (lordIcon.getAttribute("trigger") !== trigger) lordIcon.setAttribute("trigger", trigger);
        if (lordIcon.getAttribute("stroke") !== stroke) lordIcon.setAttribute("stroke", stroke);
        if (state && lordIcon.getAttribute("state") !== state) lordIcon.setAttribute("state", state);
        if (colors && lordIcon.getAttribute("colors") !== colors) lordIcon.setAttribute("colors", colors);

        lordIcon.style.width = `${size}px`;
        lordIcon.style.height = `${size}px`;
        lordIcon.style.display = "block";
    }, [src, trigger, stroke, state, colors, size, isReady]);

    useEffect(() => {
        updateIcon();
    }, [updateIcon]);

    // Cleanup to prevent LordIcon player from accessing destroyed elements
    useEffect(() => {
        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = "";
            }
        };
    }, []);

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
