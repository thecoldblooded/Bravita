import Lottie, { LottieRefCurrentProps } from "lottie-react";
import { UserRound } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";

interface LordIconProps {
  src: string;
  trigger?: string;
  stroke?: string;
  state?: string;
  colors?: string;
  size?: number;
  className?: string;
}

const animationCache = new Map<string, object>();

const isInteractiveTrigger = (trigger: string) => trigger === "hover" || trigger === "click";

export const LordIcon = memo(function LordIcon({
  src,
  trigger = "hover",
  size = 45,
  className = "",
}: LordIconProps) {
  const lottieRef = useRef<LottieRefCurrentProps | null>(null);
  const [animationData, setAnimationData] = useState<object | null>(() => animationCache.get(src) ?? null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isActive = true;

    const cachedAnimation = animationCache.get(src);
    if (cachedAnimation) {
      setAnimationData(cachedAnimation);
      setHasError(false);
      return () => {
        isActive = false;
      };
    }

    setAnimationData(null);
    setHasError(false);

    fetch(src, { cache: "force-cache" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load animation (${response.status})`);
        }
        return response.json();
      })
      .then((json: object) => {
        if (!isActive) {
          return;
        }

        animationCache.set(src, json);
        setAnimationData(json);
      })
      .catch((error) => {
        console.error("LordIcon animation load failed:", error);
        if (isActive) {
          setHasError(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, [src]);

  const handleMouseEnter = () => {
    if (trigger === "hover") {
      lottieRef.current?.goToAndPlay(0, true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === "hover") {
      lottieRef.current?.stop();
    }
  };

  const handleClick = () => {
    if (trigger === "click") {
      lottieRef.current?.goToAndPlay(0, true);
    }
  };

  if (hasError) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <UserRound className="text-gray-500" style={{ width: size * 0.55, height: size * 0.55 }} />
      </div>
    );
  }

  if (!animationData) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          className="animate-pulse rounded-full bg-gray-200/80"
          style={{ width: size * 0.8, height: size * 0.8 }}
        />
      </div>
    );
  }

  return (
    <div
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={!isInteractiveTrigger(trigger)}
        autoplay={!isInteractiveTrigger(trigger)}
        className="w-full h-full pointer-events-none"
      />
    </div>
  );
});
