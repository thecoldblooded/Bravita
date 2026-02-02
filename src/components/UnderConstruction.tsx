import Lottie from "lottie-react";
import { useEffect, useState } from "react";

/**
 * Under Construction Page
 * 
 * TEMPORARY COMPONENT - Displays "Site Under Construction" animation
 * 
 * To disable maintenance mode:
 * - Set MAINTENANCE_MODE = false in App.tsx
 * - Or remove the <UnderConstruction /> render condition
 */
const UnderConstruction = () => {
    const [animationData, setAnimationData] = useState<object | null>(null);

    useEffect(() => {
        // Fetch the Lottie animation JSON
        fetch("/under-construction.json")
            .then(res => res.json())
            .then(data => setAnimationData(data))
            .catch(err => console.error("Failed to load Lottie animation:", err));
    }, []);

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 z-[9999] flex flex-col items-center justify-center overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-20 -right-20 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-amber-200/40 rounded-full blur-3xl" />
                <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-orange-300/20 rounded-full blur-2xl" />
            </div>

            {/* Main content */}
            <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center max-w-2xl">
                {/* Lottie Animation */}
                <div className="w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] md:w-[420px] md:h-[420px] mb-6">
                    {animationData ? (
                        <Lottie
                            animationData={animationData}
                            loop
                            autoplay
                            className="w-full h-full"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="w-16 h-16 border-4 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
                        </div>
                    )}
                </div>

                {/* Title */}
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-orange-900 mb-3 tracking-tight">
                    Sitemiz Yapım Aşamasında
                </h1>
                <p className="text-orange-800/70 text-sm sm:text-base md:text-lg mb-2">
                    We're building something amazing for you!
                </p>

                {/* Subtitle */}
                <p className="text-orange-700/50 text-xs sm:text-sm max-w-md">
                    Çok yakında sizlerle buluşacağız. <br />
                    <span className="opacity-75">Coming soon...</span>
                </p>

                {/* Animated dots */}
                <div className="flex items-center gap-1.5 mt-8">
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
            </div>

            {/* Footer branding */}
            <div className="absolute bottom-6 text-orange-600/40 text-xs font-medium tracking-widest uppercase">
                Bravita
            </div>
        </div>
    );
};

export default UnderConstruction;
