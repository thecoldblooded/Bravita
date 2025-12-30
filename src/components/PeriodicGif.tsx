import { useState, useEffect } from "react";
import { getGifDurationFromUrl } from "@/lib/getGifDuration";

interface PeriodicGifProps {
  gifSrc: string;
  intervalMs?: number; // Default: 60000 (1 minute)
  alt?: string;
}

const PeriodicGif = ({
  gifSrc,
  intervalMs = 60000, // 1 minute
  alt = "Periodic animation",
}: PeriodicGifProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [gifDuration, setGifDuration] = useState<number>(2000); // fallback: 2s
  // Removed unused ref

  useEffect(() => {
    // Get GIF duration dynamically using gifuct-js
    getGifDurationFromUrl(gifSrc)
      .then(duration => {
        // Clamp duration to max 8 seconds (8000ms) to avoid it staying too long
        // Add a small buffer (e.g. 100ms) but cap at 8s
        const safeDuration = Math.min(Math.max(duration, 2000), 8000);
        setGifDuration(safeDuration);
      })
      .catch(() => setGifDuration(2000));
  }, [gifSrc]);

  useEffect(() => {
    let hideTimeout: NodeJS.Timeout | number | undefined;
    let intervalTimeout: NodeJS.Timeout | number | undefined;

    const showGif = () => {
      setIsVisible(true);
      // Hide after duration
      hideTimeout = setTimeout(() => {
        setIsVisible(false);
        // After GIF hides, wait interval then show again
        intervalTimeout = setTimeout(showGif, intervalMs);
      }, gifDuration);
    };

    // Show first GIF immediately
    showGif();

    return () => {
      if (hideTimeout) clearTimeout(hideTimeout);
      if (intervalTimeout) clearTimeout(intervalTimeout);
    };
  }, [intervalMs, gifDuration]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 z-[9999]">
      <img
        src={gifSrc}
        alt={alt}
        className="
          w-24 h-24
          sm:w-32 sm:h-32
          md:w-36 md:h-36
          lg:w-40 lg:h-40
          object-contain
          drop-shadow-2xl
          hover:scale-110 transition-transform duration-300
        "
      />
    </div>
  );
};

export default PeriodicGif;
