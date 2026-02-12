import { cn } from "@/lib/utils";

interface LoaderProps {
  size?: string;
  noMargin?: boolean;
  className?: string;
}

const LOADER_IMAGE_SRC = "/bravita-bottle.webp";

export default function Loader({ size = "240px", noMargin = false, className }: LoaderProps) {
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
        <img
          src={LOADER_IMAGE_SRC}
          alt="Bravita Loader"
          loading="eager"
          decoding="async"
          className="h-[88%] w-[88%] object-contain animate-pulse"
        />
        <span className="pointer-events-none absolute inset-0 bg-white/10" />
      </div>
    </div>
  );
}
