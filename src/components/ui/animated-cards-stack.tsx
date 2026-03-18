import * as React from "react";
import { VariantProps, cva } from "class-variance-authority";
import {
  HTMLMotionProps,
  MotionValue,
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "absolute left-0 top-0 flex h-full w-full flex-col overflow-hidden rounded-[2rem] border p-6 will-change-transform md:p-8",
  {
    variants: {
      variant: {
        brand:
          "border-orange-200/80 bg-gradient-to-br from-white via-white to-orange-50/60 text-[#2D334A] shadow-[0_12px_48px_-8px_rgba(236,119,44,0.30),0_4px_12px_-2px_rgba(236,119,44,0.12)]",
        muted:
          "border-amber-200/60 bg-gradient-to-br from-[#fffaf4] via-[#fff7ed] to-amber-50/50 text-[#2D334A] shadow-[0_12px_40px_-8px_rgba(245,158,11,0.20),0_4px_10px_-2px_rgba(236,119,44,0.10)]",
      },
    },
    defaultVariants: {
      variant: "brand",
    },
  },
);

interface ReviewStarsProps extends React.HTMLAttributes<HTMLDivElement> {
  rating: number;
  maxRating?: number;
}

interface CardStickyProps
  extends HTMLMotionProps<"div">,
    VariantProps<typeof cardVariants> {
  arrayLength: number;
  index: number;
  activeIndex?: number;
  incrementY?: number;
  incrementZ?: number;
  incrementRotation?: number;
}

interface ContainerScrollContextValue {
  scrollYProgress: MotionValue<number>;
}

const ContainerScrollContext = React.createContext<
  ContainerScrollContextValue | undefined
>(undefined);

function useContainerScrollContext() {
  const context = React.useContext(ContainerScrollContext);

  if (!context) {
    throw new Error(
      "useContainerScrollContext must be used within a ContainerScroll provider",
    );
  }

  return context;
}

export const ContainerScroll: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  style,
  className,
  ...props
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start center", "end end"],
  });

  return (
    <ContainerScrollContext.Provider value={{ scrollYProgress }}>
      <div
        ref={scrollRef}
        className={cn("relative min-h-svh w-full", className)}
        style={style}
        {...props}
      >
        {children}
      </div>
    </ContainerScrollContext.Provider>
  );
};
ContainerScroll.displayName = "ContainerScroll";

export const CardsContainer: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  style,
  ...props
}) => {
  return (
    <div
      className={cn("relative", className)}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
};
CardsContainer.displayName = "CardsContainer";

export const CardTransformed = React.forwardRef<HTMLDivElement, CardStickyProps>(
  (
    {
      arrayLength,
      index,
      activeIndex = 0,
      incrementY = 14,
      incrementZ = 10,
      incrementRotation = 6,
      className,
      variant,
      children,
      style,
      ...props
    },
    ref,
  ) => {
    const { scrollYProgress } = useContainerScrollContext();
    const prefersReducedMotion = useReducedMotion();

    const safeLength = Math.max(arrayLength, 1);
    const safeIndex = Math.max(index, 1);
    const start = safeIndex / (safeLength + 1);
    const end = Math.min((safeIndex + 1) / (safeLength + 1), 1);
    const range = React.useMemo(() => [start, end], [start, end]);
    const rotateRange = React.useMemo(
      () => [Math.max(0, start - 1.5), end / 1.5],
      [end, start],
    );

    const stackProgress = useTransform(
      scrollYProgress,
      [0, 1],
      [0, Math.max(safeLength - 1, 0)],
    );
    const relativeDepth = useTransform(
      stackProgress,
      (latest) => Math.abs((safeIndex - 1) - latest),
    );

    const isLast = safeIndex === safeLength;
    const y = useTransform(scrollYProgress, range, ["0%", isLast ? "0%" : "-180%"]);
    const rotate = useTransform(scrollYProgress, rotateRange, [
      incrementRotation,
      0,
    ]);
    const depthScale = useTransform(
      relativeDepth,
      [0, 1, 2, 3, 4],
      [1, 0.965, 0.93, 0.895, 0.86],
    );
    const depthOpacity = useTransform(
      relativeDepth,
      [0, 1, 2, 3, 4],
      [1, 0.7, 0.45, 0.25, 0.12],
    );
    const depthBlur = useTransform(
      relativeDepth,
      [0, 1, 2, 3, 4],
      [0, 0.5, 1.5, 3, 5],
    );

    const dx = useTransform(scrollYProgress, rotateRange, [4, 0]);
    const dy = useTransform(scrollYProgress, rotateRange, [4, 12]);
    const shadowBlur = useTransform(scrollYProgress, rotateRange, [2, 24]);
    const shadowAlpha = useTransform(scrollYProgress, rotateRange, [0.15, 0.2]);

    const filter =
      variant === "brand"
        ? useMotionTemplate`blur(${depthBlur}px) drop-shadow(${dx}px ${dy}px ${shadowBlur}px rgba(45,51,74,${shadowAlpha}))`
        : useMotionTemplate`blur(${depthBlur}px) drop-shadow(${dx}px ${dy}px ${shadowBlur}px rgba(45,51,74,0.12))`;

    const transform = useMotionTemplate`translateY(${y}) rotate(${rotate}deg) scale(${depthScale})`;

    // z-index: active card on top. Cards closer to activeIndex get higher z.
    const distFromActive = Math.abs((safeIndex - 1) - activeIndex);
    const computedZIndex = (safeLength - distFromActive) * incrementZ;

    const cardStyle = prefersReducedMotion
      ? {
          top: safeIndex * incrementY,
          zIndex: computedZIndex,
          backfaceVisibility: "hidden" as const,
          ...style,
        }
      : {
          top: safeIndex * incrementY,
          transform,
          opacity: depthOpacity,
          zIndex: computedZIndex,
          backfaceVisibility: "hidden" as const,
          filter,
          ...style,
        };

    return (
      <motion.div
        ref={ref}
        style={cardStyle}
        className={cn(cardVariants({ variant, className }))}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);
CardTransformed.displayName = "CardTransformed";

export const ReviewStars = React.forwardRef<HTMLDivElement, ReviewStarsProps>(
  ({ rating, maxRating = 5, className, ...props }, ref) => {
    return (
      <div
        className={cn("flex items-center gap-1.5", className)}
        ref={ref}
        aria-label={`${rating}/${maxRating}`}
        {...props}
      >
        {Array.from({ length: maxRating }).map((_, index) => {
          const isFilled = index < rating;

          return (
            <Star
              key={`${rating}-${index}`}
              className={cn(
                "h-4 w-4 transition-colors",
                isFilled
                  ? "fill-current text-[#FFB547]"
                  : "text-orange-200/90",
              )}
              aria-hidden="true"
            />
          );
        })}
      </div>
    );
  },
);
ReviewStars.displayName = "ReviewStars";
