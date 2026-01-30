import { useState, useRef, useEffect } from "react";
import { cn } from "../../lib/utils";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  placeholderColor?: string;
  rootMargin?: string;
}

export function LazyImage({
  src,
  alt,
  className,
  placeholderColor = "bg-gradient-to-br from-bravita-yellow/20 to-bravita-orange/20",
  rootMargin = "200px",
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Placeholder */}
      {!isLoaded && (
        <div
          className={cn(
            "absolute inset-0 animate-pulse",
            placeholderColor
          )}
        />
      )}
      
      {/* Actual image - only load src when in view */}
      <img
        ref={imgRef}
        src={isInView ? src : undefined}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        className={cn(
          "transition-opacity duration-500",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...props}
      />
    </div>
  );
}
