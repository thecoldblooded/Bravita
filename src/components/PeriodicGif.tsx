import { useState, useEffect, useCallback } from "react";


interface PeriodicGifProps {
  gifSrc: string;
  videoSrc?: string; // Optional optimized video (MP4 H.265)
  intervalMs?: number; // Default: 60000 (1 minute)
  initialDelayMs?: number;
  alt?: string;
}

const PeriodicGif = ({
  gifSrc,
  videoSrc,
  intervalMs = 60000, // 1 minute
  initialDelayMs,
  alt = "Periodic animation",
}: PeriodicGifProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const DISPLAY_DURATION = 8000; // Fixed 8 seconds
  const videoRef = useCallback((ref: HTMLVideoElement | null) => {
    if (ref) ref.muted = true;
  }, []);

  const isAnyDialogOpen = useCallback(() => {
    if (typeof document === "undefined") return false;

    return Boolean(
      document.querySelector(
        '[role="dialog"], [aria-modal="true"], [data-radix-dialog-content], [data-radix-alert-dialog-content]'
      )
    );
  }, []);

  useEffect(() => {
    const syncModalState = () => setIsModalOpen(isAnyDialogOpen());

    syncModalState();

    const observer = new MutationObserver(syncModalState);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "open", "aria-hidden", "class"],
    });

    return () => {
      observer.disconnect();
    };
  }, [isAnyDialogOpen]);

  useEffect(() => {
    if (isModalOpen) {
      setIsVisible(false);
    }
  }, [isModalOpen]);

  useEffect(() => {
    let hideTimeout: ReturnType<typeof setTimeout> | undefined;
    let intervalTimeout: ReturnType<typeof setTimeout> | undefined;

    const showGif = () => {
      if (isAnyDialogOpen()) {
        intervalTimeout = setTimeout(showGif, intervalMs);
        return;
      }

      setIsVisible(true);
      // Hide after fixed duration
      hideTimeout = setTimeout(() => {
        setIsVisible(false);
        // After GIF hides, wait interval then show again
        intervalTimeout = setTimeout(showGif, intervalMs);
      }, DISPLAY_DURATION);
    };

    const firstDelay = Math.max(0, initialDelayMs ?? 12000);
    const initialTimeout = setTimeout(showGif, firstDelay);

    return () => {
      if (initialTimeout) clearTimeout(initialTimeout);
      if (hideTimeout) clearTimeout(hideTimeout);
      if (intervalTimeout) clearTimeout(intervalTimeout);
    };
  }, [initialDelayMs, intervalMs, isAnyDialogOpen]);

  return (
    <div
      className={`fixed bottom-24 left-0 z-90 pointer-events-none transition-opacity duration-500 md:bottom-20 md:left-0 ${isVisible && !isModalOpen ? "opacity-100" : "opacity-0"}`}
      aria-hidden={!isVisible || isModalOpen}
    >
      {videoSrc ? (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="
            w-24 h-24
            sm:w-32 sm:h-32
            md:w-36 md:h-36
            lg:w-40 lg:h-40
            object-contain object-left
            translate-x-0
            transition-transform duration-300
          "
        >
          <source src={videoSrc} type="video/mp4" />
          <img
            src={gifSrc}
            alt={alt}
            loading="eager"
            decoding="sync"
            className="w-full h-full"
          />
        </video>
      ) : (
        <img
          src={gifSrc}
          alt={alt}
          loading="eager"
          decoding="sync"
          className="
            w-24 h-24
            sm:w-32 sm:h-32
            md:w-36 md:h-36
            lg:w-40 lg:h-40
            object-contain object-left
            translate-x-0
            transition-transform duration-300
          "
        />
      )}
    </div>
  );
};

export default PeriodicGif;
