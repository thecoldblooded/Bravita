import { cn } from "../../lib/utils";

interface LoadingSkeletonProps {
  className?: string;
  progress?: number;
  showProgress?: boolean;
}

export function LoadingSkeleton({ 
  className, 
  progress, 
  showProgress = false 
}: LoadingSkeletonProps) {
  return (
    <div
      className={cn(
        "relative bg-linear-to-br from-bravita-yellow/10 via-bravita-orange/10 to-bravita-red/10 rounded-3xl overflow-hidden",
        className
      )}
    >
      {/* Animated shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-linear-to-r from-transparent via-white/20 to-transparent" />
      
      {/* Pulsing glow */}
      <div className="absolute inset-0 bg-linear-to-br from-bravita-yellow/20 to-bravita-orange/20 animate-pulse" />
      
      {/* Progress indicator */}
      {showProgress && progress !== undefined && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          {/* Circular progress */}
          <div className="relative w-16 h-16">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-gray-200/30"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${progress * 2.83} 283`}
                className="transition-all duration-300 ease-out"
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#facc15" />
                </linearGradient>
              </defs>
            </svg>
            {/* Percentage text */}
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-bravita-orange">
              {Math.round(progress)}%
            </span>
          </div>
          <span className="text-sm text-muted-foreground">Yükleniyor...</span>
        </div>
      )}
    </div>
  );
}

// Add shimmer animation to global CSS
export const shimmerKeyframes = `
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
`;
