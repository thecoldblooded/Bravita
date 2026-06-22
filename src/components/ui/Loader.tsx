import { useState } from "react";
import { cn } from "@/lib/utils";
const bravitaVideo = "/bravita-optimized.mp4";
const bravitaGif = "/bravita.webp";

interface LoaderProps {
  size?: string;
  noMargin?: boolean;
  className?: string;
}

export default function Loader({ size = "240px", noMargin = false, className }: LoaderProps) {
  const [videoError, setVideoError] = useState(false);

  return (
    <div
      className={cn("flex w-full items-center justify-center", noMargin ? "m-0" : "my-8", className)}
      role="status"
      aria-live="polite"
      aria-label="Yukleniyor"
    >
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-full",
          noMargin ? "bg-transparent shadow-none" : "bg-white shadow-[0_10px_30px_-10px_rgba(246,139,40,0.2)]"
        )}
        style={{ width: size, height: size }}
      >
        {!videoError ? (
          <video
            src={bravitaVideo}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="h-[88%] w-[88%] object-contain"
            onError={() => setVideoError(true)}
          />
        ) : (
          <img
            src={bravitaGif}
            alt="Bravita Loader"
            loading="eager"
            decoding="async"
            className="h-[88%] w-[88%] object-contain"
          />
        )}
        <span className="pointer-events-none absolute inset-0 bg-white/10" />
      </div>
    </div>
  );
}
