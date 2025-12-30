import { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LoadingSkeleton } from "./loading-skeleton";

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Generate frame URLs - 81 frames (from public folder for production)
const frameCount = 81;
const frameUrls = Array.from({ length: frameCount }, (_, i) =>
  `/frames/ezgif-frame-${String(i + 1).padStart(3, '0')}.webp`
);

// Priority frames - first, middle, and last for smooth initial experience
const PRIORITY_FRAMES = [0, 1, 2, 20, 40, 60, 80];
const BATCH_SIZE = 10;

interface ScrollImageSequenceProps {
  className?: string;
}

const ScrollImageSequence = ({ className = "" }: ScrollImageSequenceProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isFirstFrameReady, setIsFirstFrameReady] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isInView, setIsInView] = useState(false);

  // Keep images in a ref to avoid re-renders during loading
  const imagesRef = useRef<(HTMLImageElement | null)[]>(new Array(frameCount).fill(null));
  const loadedSetRef = useRef<Set<number>>(new Set());
  const currentFrameRef = useRef(0);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dimensionsRef = useRef({ displayWidth: 0, displayHeight: 0 });
  const hasStartedLoading = useRef(false);

  // Intersection Observer to detect when component is near viewport
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStartedLoading.current) {
          setIsInView(true);
          hasStartedLoading.current = true;
          observer.disconnect();
        }
      },
      { rootMargin: "100px" } // Strict lazy loading: Only start when almost in view
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Calculate canvas dimensions based on viewport
  const calculateDimensions = useCallback(() => {
    const viewportWidth = window.innerWidth;
    let displayWidth: number;

    if (viewportWidth < 640) {
      displayWidth = Math.min(viewportWidth * 0.95, 400);
    } else if (viewportWidth < 768) {
      displayWidth = Math.min(viewportWidth * 0.9, 600);
    } else if (viewportWidth < 1024) {
      displayWidth = 1350;
    } else {
      displayWidth = 1800;
    }

    const displayHeight = displayWidth * (9 / 16);
    dimensionsRef.current = { displayWidth, displayHeight };
    return { displayWidth, displayHeight };
  }, []);

  // Setup canvas size
  const setCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { displayWidth, displayHeight } = calculateDimensions();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = displayWidth * dpr * 2;
    canvas.height = displayHeight * dpr * 2;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr * 2, dpr * 2);
      ctxRef.current = ctx;
    }
  }, [calculateDimensions]);

  // Draw a specific frame
  const drawFrame = useCallback((frameIndex: number) => {
    const ctx = ctxRef.current;
    const img = imagesRef.current[frameIndex];
    if (!ctx || !img || !img.complete) return;

    const { displayWidth, displayHeight } = dimensionsRef.current;

    ctx.clearRect(0, 0, displayWidth, displayHeight);

    const imgAspect = img.width / img.height;
    const canvasAspect = displayWidth / displayHeight;

    let drawWidth, drawHeight, drawX, drawY;

    if (imgAspect > canvasAspect) {
      drawHeight = displayHeight;
      drawWidth = drawHeight * imgAspect;
      drawX = (displayWidth - drawWidth) / 2;
      drawY = 0;
    } else {
      drawWidth = displayWidth;
      drawHeight = drawWidth / imgAspect;
      drawX = 0;
      drawY = (displayHeight - drawHeight) / 2;
    }

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  }, []);

  // Find nearest loaded frame for interpolation
  const findNearestLoadedFrame = useCallback((targetFrame: number): number => {
    if (loadedSetRef.current.has(targetFrame)) return targetFrame;

    // Search both directions for nearest loaded frame
    for (let offset = 1; offset < frameCount; offset++) {
      if (targetFrame - offset >= 0 && loadedSetRef.current.has(targetFrame - offset)) {
        return targetFrame - offset;
      }
      if (targetFrame + offset < frameCount && loadedSetRef.current.has(targetFrame + offset)) {
        return targetFrame + offset;
      }
    }

    return 0;
  }, []);

  // Load single image
  const loadImage = useCallback((index: number): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      if (imagesRef.current[index]) {
        resolve(imagesRef.current[index]!);
        return;
      }

      const img = new Image();
      img.onload = () => {
        imagesRef.current[index] = img;
        loadedSetRef.current.add(index);
        resolve(img);
      };
      img.onerror = reject;
      img.src = frameUrls[index];
    });
  }, []);

  // Combined setup and loading effect - only runs when in view
  useEffect(() => {
    if (!isInView) return; // Don't start until in view

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let isMounted = true;

    // Step 1: Setup canvas first
    setCanvasSize();

    // Step 2: Setup GSAP scroll trigger
    const playhead = { frame: 0 };
    const viewportWidth = window.innerWidth;

    let scrollConfig;
    if (viewportWidth < 640) {
      scrollConfig = { start: "top 50%", end: "top 0%" };
    } else if (viewportWidth < 768) {
      scrollConfig = { start: "top 50%", end: "bottom 0%" };
    } else {
      scrollConfig = { start: "top 50%", end: "bottom 0%" };
    }

    const tween = gsap.to(playhead, {
      frame: frameCount - 1,
      ease: "none",
      onUpdate: () => {
        const targetFrame = Math.round(playhead.frame);
        if (targetFrame !== currentFrameRef.current) {
          currentFrameRef.current = targetFrame;
          const frameToShow = findNearestLoadedFrame(targetFrame);
          drawFrame(frameToShow);
        }
      },
      scrollTrigger: {
        trigger: container,
        start: scrollConfig.start,
        end: scrollConfig.end,
        scrub: 0.3,
      },
    });

    // Step 3: Progressive image loading (after canvas is ready)
    const loadProgressively = async () => {
      // Phase 1: Load first frame immediately
      try {
        await loadImage(0);
        if (!isMounted) return;
        setIsFirstFrameReady(true);
        setLoadingProgress(1);
        drawFrame(0);
      } catch (e) {
        console.warn("Failed to load first frame");
      }

      // Phase 2: Load priority frames
      for (const index of PRIORITY_FRAMES) {
        if (!isMounted || index === 0) continue;
        try {
          await loadImage(index);
          if (!isMounted) return;
          setLoadingProgress((loadedSetRef.current.size / frameCount) * 100);
        } catch (e) {
          console.warn(`Failed to load priority frame ${index}`);
        }
      }

      // Phase 3: Load remaining frames in batches with throttling
      const remainingFrames = frameUrls
        .map((_, i) => i)
        .filter(i => !PRIORITY_FRAMES.includes(i));

      // Throttling: Wait 200ms between batches to let other requests breathe
      const THROTTLE_DELAY = 200;

      for (let i = 0; i < remainingFrames.length; i += BATCH_SIZE) {
        if (!isMounted) break;

        const batch = remainingFrames.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(index => loadImage(index).catch(() => null)));

        if (!isMounted) return;
        setLoadingProgress((loadedSetRef.current.size / frameCount) * 100);

        // Artificial delay to prevent network congestion
        await new Promise(resolve => setTimeout(resolve, THROTTLE_DELAY));
      }

      if (isMounted) {
        setIsReady(true);
        setLoadingProgress(100);
      }
    };

    loadProgressively();

    // Handle resize
    const handleResize = () => {
      setCanvasSize();
      drawFrame(currentFrameRef.current);
      ScrollTrigger.refresh();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener("resize", handleResize);
      tween?.kill();
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, [isInView, setCanvasSize, drawFrame, findNearestLoadedFrame, loadImage]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Glow effect behind the bottle */}
      <div className="absolute inset-0 bg-linear-to-br from-bravita-yellow/40 to-bravita-orange/40 rounded-full blur-3xl scale-90" />

      {/* Canvas for image sequence */}
      <canvas
        ref={canvasRef}
        className="relative z-10"
        style={{
          opacity: isFirstFrameReady ? 1 : 0,
          transition: "opacity 0.5s ease-out",
        }}
      />

      {/* Loading skeleton with progress */}
      {!isFirstFrameReady && (
        <LoadingSkeleton
          className="absolute inset-0 z-10"
          progress={loadingProgress}
          showProgress={true}
        />
      )}

      {/* Subtle loading indicator when not fully loaded but first frame is shown */}
      {isFirstFrameReady && !isReady && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-bravita-orange animate-pulse" />
          <span className="text-xs text-white/80">{Math.round(loadingProgress)}%</span>
        </div>
      )}
    </div>
  );
};

export default ScrollImageSequence;
