import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Generate frame URLs - 81 frames
const frameCount = 81;
const frameUrls = Array.from({ length: frameCount }, (_, i) => 
  `/src/assets/frames/ezgif-frame-${String(i + 1).padStart(3, '0')}.png`
);

interface ScrollImageSequenceProps {
  className?: string;
}

const ScrollImageSequence = ({ className = "" }: ScrollImageSequenceProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Preload all images first
    const images: HTMLImageElement[] = [];
    let loadedCount = 0;
    
    // Display dimensions
    let displayWidth = 0;
    let displayHeight = 0;
    
    // Set canvas size - responsive with viewport constraints
    const setCanvasSize = () => {
      const viewportWidth = window.innerWidth;
      
      // Responsive sizes that fit within viewport
      if (viewportWidth < 640) {
        // Mobile: fit within viewport, then scale visually
        displayWidth = Math.min(viewportWidth * 0.95, 400);
      } else if (viewportWidth < 768) {
        // Small tablet: fit within viewport
        displayWidth = Math.min(viewportWidth * 0.9, 600);
      } else if (viewportWidth < 1024) {
        // Tablet: 3x large
        displayWidth = 1350;
      } else {
        // Desktop: 3x large
        displayWidth = 1800;
      }
      
      displayHeight = displayWidth * (9 / 16);
      
      // High resolution canvas for sharp rendering
      const dpr = window.devicePixelRatio || 1;
      canvas.width = displayWidth * dpr * 2;
      canvas.height = displayHeight * dpr * 2;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      
      // Reset and scale context
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr * 2, dpr * 2);
      
      // Redraw current frame if images loaded
      if (images.length > 0 && images[0].complete) {
        drawFrame(currentFrame);
      }
    };
    
    let currentFrame = 0;
    
    // Draw a specific frame
    const drawFrame = (frameIndex: number) => {
      const img = images[frameIndex];
      if (!img || !img.complete) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      
      // Calculate draw dimensions to fit canvas while maintaining aspect ratio
      const imgAspect = img.width / img.height;
      const canvasAspect = displayWidth / displayHeight;
      
      let drawWidth, drawHeight, drawX, drawY;
      
      if (imgAspect > canvasAspect) {
        // Image is wider - fit to height
        drawHeight = displayHeight;
        drawWidth = drawHeight * imgAspect;
        drawX = (displayWidth - drawWidth) / 2;
        drawY = 0;
      } else {
        // Image is taller - fit to width
        drawWidth = displayWidth;
        drawHeight = drawWidth / imgAspect;
        drawX = 0;
        drawY = (displayHeight - drawHeight) / 2;
      }
      
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    };
    
    // Load all images
    frameUrls.forEach((url, i) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === frameUrls.length) {
          setIsReady(true);
          drawFrame(0);
        } else if (i === 0) {
          // Draw first frame as soon as it loads
          drawFrame(0);
        }
      };
      images[i] = img;
    });
    
    // Set initial size
    setCanvasSize();
    
    // Create GSAP animation with responsive scroll trigger
    const playhead = { frame: 0 };
    const viewportWidth = window.innerWidth;
    
    // Responsive scroll trigger settings
    let scrollConfig;
    if (viewportWidth < 640) {
      // Mobile: start earlier
      scrollConfig = { start: "top 50%", end: "top 0%" };
    } else if (viewportWidth < 768) {
      // Small tablet (640-768): start much later
      scrollConfig = { start: "top 50%", end: "bottom 0%" };
    } else {
      // Desktop/Tablet
      scrollConfig = { start: "top 50%", end: "bottom 0%" };
    }
    
    const tween = gsap.to(playhead, {
      frame: frameUrls.length - 1,
      ease: "none",
      onUpdate: () => {
        const frame = Math.round(playhead.frame);
        if (frame !== currentFrame) {
          currentFrame = frame;
          drawFrame(frame);
        }
      },
      scrollTrigger: {
        trigger: container,
        start: scrollConfig.start,
        end: scrollConfig.end,
        scrub: 0.3,
      },
    });

    // Handle resize
    const handleResize = () => {
      setCanvasSize();
      ScrollTrigger.refresh();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      tween?.kill();
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Glow effect behind the bottle */}
      <div className="absolute inset-0 bg-linear-to-br from-bravita-yellow/40 to-bravita-orange/40 rounded-full blur-3xl scale-90" />
      
      {/* Canvas for image sequence */}
      <canvas
        ref={canvasRef}
        className="relative z-10"
        style={{
          opacity: isReady ? 1 : 0,
          transition: "opacity 0.3s ease-out",
        }}
      />

      {/* Loading placeholder */}
      {!isReady && (
        <div 
          className="absolute inset-0 z-10 bg-linear-to-br from-bravita-yellow/20 to-bravita-orange/20 rounded-3xl animate-pulse"
          style={{ aspectRatio: "16/9" }}
        />
      )}
    </div>
  );
};

export default ScrollImageSequence;
