import { useState, useEffect } from "react";


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
  const DISPLAY_DURATION = 8000; // Fixed 8 seconds

  useEffect(() => {
    let hideTimeout: NodeJS.Timeout | number | undefined;
    let intervalTimeout: NodeJS.Timeout | number | undefined;

    const showGif = () => {
      setIsVisible(true);
      // Hide after fixed duration
      hideTimeout = setTimeout(() => {
        setIsVisible(false);
        // After GIF hides, wait interval then show again
        intervalTimeout = setTimeout(showGif, intervalMs);
      }, DISPLAY_DURATION);
    };

    // Show first GIF immediately
    showGif();

    return () => {
      if (hideTimeout) clearTimeout(hideTimeout);
      if (intervalTimeout) clearTimeout(intervalTimeout);
    };
  }, [intervalMs]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-[38px] left-0 z-[9999]">
      <img
        src={gifSrc}
        alt={alt}
        className="
          w-24 h-24
          sm:w-32 sm:h-32
          md:w-36 md:h-36
          lg:w-40 lg:h-40
          object-contain
          hover:scale-110 transition-transform duration-300
          will-change-transform
        "
      />
    </div>
  );
};

export default PeriodicGif;
