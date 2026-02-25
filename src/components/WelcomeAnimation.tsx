import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WelcomeAnimationProps {
    onComplete: () => void;
}

const svgPaths = [
    "M346.692 590.518C349.075 573.148 359.794 555.53 377.422 555.53C395.05 555.53 400.052 571.908 395.526 593.744C392.429 609.377 390.047 625.506 385.045 650.071",
    "M389.913 624.633C397.695 581.527 415.774 554.042 437.69 554.042C455.556 554.042 462.702 568.185 461.749 587.292C460.796 600.195 456.27 625.506 452.459 650.071",
    "M456.653 623.865C463.616 580.657 480.33 554.042 504.39 554.042C520.826 554.042 529.164 567.937 527.258 584.811C526.067 596.722 523.209 610.865 522.256 622.528C521.303 639.401 527.179 651.312 547.623 651.312C575.549 651.312 615.34 633.469 633.238 605.877C639.338 596.473 641.819 588.037 642.067 579.848C642.315 564.96 633.879 553.794 618.99 553.794C600.132 553.794 585.74 575.133 585.74 602.429C585.74 631.709 601.62 652.305 634.067 652.305C675.652 652.305 704.967 612.267 718.246 552.801",
    "M716.285 561.227C747.054 562.716 760.677 568.93 760.677 583.57C760.677 593.744 755.715 609.376 754.226 620.791C751.496 640.642 757.203 651.56 777.433 651.56C808.367 651.56 839.382 593.555 866.331 557.071C885.064 531.709 894.175 509.035 894.672 490.966C894.92 477.567 888.469 467.402 876.31 467.402C862.911 467.402 854.474 477.567 849.263 500.9C843.556 526.543 839.337 555.967 828.667 650.319",
    "M829.713 641.098C834.977 594.824 855.962 558.012 882.513 558.012C898.394 558.012 908.487 570.667 905.621 588.781C904.008 599.451 901.093 611.858 899.428 624.017C897.402 639.401 903.19 651.312 921.113 651.312C946.478 651.312 961.675 623.876 969.912 594.995",
    "M1048.17 572.794C1043.31 561.599 1032.97 554.042 1016.51 554.042C989.212 554.042 968.698 581.337 967.351 610.617C966.178 637.416 978.544 652.481 996.157 652.305C1021.16 652.055 1039.53 627.499 1047.74 575.541C1048.75 569.131 1049.8 562.437 1050.81 556.027",
    "M1050.81 556.027C1049.79 562.529 1048.76 569.032 1047.74 575.534C1043.26 603.974 1041.19 615.194 1041.41 622.528C1041.93 639.649 1048.09 651.312 1067.69 651.312C1101.91 651.312 1144.28 584.914 1171.22 528.459C1178.41 513.383 1181.01 499.124 1181.76 488.192C1182.51 474.28 1176.81 464.31 1165.64 464.31C1154.47 464.31 1147.03 472.334 1138.84 489.357C1129.16 509.783 1123.46 534.101 1120.48 558.419C1112.79 626.265 1128.92 651.312 1155.96 651.312C1178.3 651.312 1192.44 631.213 1194.18 604.662C1195.17 582.329 1185.74 564.96 1168.87 556.771",
    "M1183.65 568.471C1210.59 601.91 1248.36 589.737 1265.13 570.406",
    "M1330.31 572.794C1325.44 561.599 1315.1 554.042 1298.64 554.042C1271.35 554.042 1250.83 581.337 1249.49 610.617C1248.31 637.416 1260.68 652.481 1278.29 652.305C1303.29 652.055 1321.67 627.499 1329.87 575.541C1330.88 569.131 1331.93 562.437 1332.94 556.027",
    "M1332.94 556.027C1331.92 562.529 1330.9 569.032 1329.87 575.534C1325.39 603.974 1323.32 615.194 1323.54 622.528C1324.06 639.649 1330.22 651.312 1345.6 651.312C1364.96 651.312 1375.81 638.161 1381.02 623.769"
];

export default function WelcomeAnimation({ onComplete }: WelcomeAnimationProps) {
    const [isFinished, setIsFinished] = useState(false);
    const hasFinishedRef = useRef(false);
    const onCompleteRef = useRef(onComplete);
    const completionCallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        return () => {
            if (completionCallbackTimerRef.current) {
                clearTimeout(completionCallbackTimerRef.current);
                completionCallbackTimerRef.current = null;
            }
        };
    }, []);

    const finishAnimation = useCallback(() => {
        if (hasFinishedRef.current) return;

        hasFinishedRef.current = true;
        setIsFinished(true);

        if (completionCallbackTimerRef.current) {
            clearTimeout(completionCallbackTimerRef.current);
        }

        completionCallbackTimerRef.current = setTimeout(() => {
            onCompleteRef.current();
            completionCallbackTimerRef.current = null;
        }, 500); // Fade out duration
    }, []);

    useEffect(() => {
        // Fallback timeout inside useEffect to avoid blocking state
        const fallbackTimeout = setTimeout(() => {
            finishAnimation();
        }, 5000);

        return () => clearTimeout(fallbackTimeout);
    }, [finishAnimation]);

    return (
        <AnimatePresence>
            {!isFinished && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeIn" }}
                    className="fixed inset-0 z-100 bg-[#FFFBF7] flex items-center justify-center p-6"
                >
                    <div className="w-full max-w-225 flex justify-center items-center">
                        <svg
                            className="w-full h-auto block"
                            viewBox="0 0 1728 1117"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-label="merhaba"
                        >
                            <defs>
                                <clipPath id="clip0_2002_2">
                                    <rect width="1728" height="1117" fill="white" />
                                </clipPath>

                                {/* Bravita Logo Gradient Left to Right */}
                                <linearGradient id="bravita-rainbow" x1="346" y1="0" x2="1381" y2="0" gradientUnits="userSpaceOnUse">
                                    <stop offset="0%" stopColor="#ef4444" /> {/* Red */}
                                    <stop offset="16.6%" stopColor="#f97316" /> {/* Orange */}
                                    <stop offset="33.3%" stopColor="#facc15" /> {/* Yellow */}
                                    <stop offset="50%" stopColor="#a3e635" /> {/* Lime */}
                                    <stop offset="66.6%" stopColor="#22c55e" /> {/* Green */}
                                    <stop offset="83.3%" stopColor="#0ea5e9" /> {/* Blue */}
                                    <stop offset="100%" stopColor="#9c27b0" /> {/* Mor */}
                                </linearGradient>
                            </defs>

                            <g clipPath="url(#clip0_2002_2)">
                                {svgPaths.map((pathData, index) => {
                                    // Make different paths take different times (some are longer)
                                    // A uniform duration is fine, but shorter paths could be faster
                                    const baseDuration = (index === 2 || index === 3 || index === 6) ? 1.0 : 0.6;
                                    const delay = index * 0.22;

                                    // On the last path, wait a tiny bit then finish
                                    const isLast = index === svgPaths.length - 1;

                                    return (
                                        <motion.path
                                            key={index}
                                            d={pathData}
                                            stroke="url(#bravita-rainbow)"
                                            strokeLinecap="round"
                                            className="stroke-[8px] sm:stroke-[10px] md:stroke-[12px] lg:stroke-[14.8883px]"
                                            strokeLinejoin="round"
                                            fill="transparent"
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: 1 }}
                                            transition={{
                                                pathLength: { duration: baseDuration, delay: delay, ease: "easeInOut" },
                                                opacity: { duration: 0.01, delay: delay }
                                            }}
                                            onAnimationComplete={() => {
                                                if (isLast) {
                                                    // Add a small pause to admire the artwork before dispatching finish
                                                    setTimeout(() => {
                                                        finishAnimation();
                                                    }, 600);
                                                }
                                            }}
                                        />
                                    );
                                })}
                            </g>
                        </svg>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
