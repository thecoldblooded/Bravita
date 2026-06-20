import { type ReactNode, useEffect, useRef, useState } from "react";

interface LazySectionProps {
  children: ReactNode;
  placeholder?: ReactNode;
  rootMargin?: string;
  threshold?: number;
  className?: string;
  once?: boolean;
  id?: string;
}

const LazySection = ({
  children,
  placeholder = null,
  rootMargin = "300px 0px",
  threshold = 0.01,
  className,
  once = true,
  id,
}: LazySectionProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(() => typeof window !== "undefined" && !("IntersectionObserver" in window));
  const hasIntersected = useRef(isVisible);

  useEffect(() => {
    if (hasIntersected.current && once) {
      return;
    }

    const hostElement = hostRef.current;
    if (!hostElement) {
      return;
    }

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) {
          return;
        }

        if (entry.isIntersecting) {
          hasIntersected.current = true;
          setIsVisible(true);
          if (once) {
            observer.disconnect();
          }
          return;
        }

        if (!once) {
          hasIntersected.current = false;
          setIsVisible(false);
        }
      },
      { root: null, rootMargin, threshold }
    );

    observer.observe(hostElement);

    return () => {
      observer.disconnect();
    };
  }, [once, rootMargin, threshold]);

  return <div ref={hostRef} id={id} className={className}>{isVisible ? children : placeholder}</div>;
};

export default LazySection;
