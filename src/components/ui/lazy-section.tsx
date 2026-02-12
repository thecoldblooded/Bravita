import { type ReactNode, useEffect, useRef, useState } from "react";

interface LazySectionProps {
  children: ReactNode;
  placeholder?: ReactNode;
  rootMargin?: string;
  threshold?: number;
  className?: string;
  once?: boolean;
}

const LazySection = ({
  children,
  placeholder = null,
  rootMargin = "300px 0px",
  threshold = 0.01,
  className,
  once = true,
}: LazySectionProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible && once) {
      return;
    }

    const hostElement = hostRef.current;
    if (!hostElement) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) {
          return;
        }

        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.disconnect();
          }
          return;
        }

        if (!once) {
          setIsVisible(false);
        }
      },
      { root: null, rootMargin, threshold }
    );

    observer.observe(hostElement);

    return () => {
      observer.disconnect();
    };
  }, [isVisible, once, rootMargin, threshold]);

  return <div ref={hostRef} className={className}>{isVisible ? children : placeholder}</div>;
};

export default LazySection;
