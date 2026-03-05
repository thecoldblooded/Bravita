import { Skeleton } from "@/components/ui/skeleton";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

interface DashboardSkeletonProps {
    className?: string;
}

export function DashboardSkeleton({ className }: DashboardSkeletonProps) {
    const { theme } = useAdminTheme();
    const isDark = theme === "dark";
    const cardClass = isDark ? "bg-gray-800 rounded-2xl p-5 border border-gray-700" : "bg-white rounded-2xl p-5 shadow-sm border border-gray-100";
    const skeletonClass = isDark ? "bg-gray-700" : "";

    return (
        <div className={className}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Skeleton className={`h-8 w-48 mb-2 ${skeletonClass}`} />
                    <Skeleton className={`h-4 w-72 ${skeletonClass}`} />
                </div>
                <div className="flex gap-2">
                    <Skeleton className={`h-9 w-24 ${skeletonClass}`} />
                    <Skeleton className={`h-9 w-28 ${skeletonClass}`} />
                    <Skeleton className={`h-9 w-24 ${skeletonClass}`} />
                    <Skeleton className={`h-9 w-24 ${skeletonClass}`} />
                </div>
            </div>

            {/* 6 Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className={cardClass}>
                        <div className="flex items-center justify-between mb-3">
                            <Skeleton className={`h-10 w-10 md:h-12 md:w-12 rounded-xl ${skeletonClass}`} />
                            <Skeleton className={`h-5 w-14 rounded-lg ${skeletonClass}`} />
                        </div>
                        <Skeleton className={`h-3 w-20 mb-2 ${skeletonClass}`} />
                        <Skeleton className={`h-7 w-28 ${skeletonClass}`} />
                    </div>
                ))}
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
                <div className={cardClass}>
                    <Skeleton className={`h-5 w-36 mb-4 ${skeletonClass}`} />
                    <div className="h-64 md:h-72 flex items-end gap-1">
                        {[...Array(12)].map((_, i) => (
                            <Skeleton
                                key={i}
                                className={`flex-1 rounded-t ${skeletonClass}`}
                                style={{ height: `${(i * 13) % 60 + 30}%` }}
                            />
                        ))}
                    </div>
                </div>
                <div className={cardClass}>
                    <Skeleton className={`h-5 w-48 mb-4 ${skeletonClass}`} />
                    <div className="h-64 md:h-72 flex items-center justify-center">
                        <Skeleton className={`h-40 w-40 rounded-full ${skeletonClass}`} />
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
                <div className={cardClass}>
                    <Skeleton className={`h-5 w-36 mb-4 ${skeletonClass}`} />
                    <div className="h-64 md:h-72 flex items-end gap-2">
                        {[...Array(7)].map((_, i) => (
                            <Skeleton
                                key={i}
                                className={`flex-1 rounded-t ${skeletonClass}`}
                                style={{ height: `${(i * 17) % 70 + 20}%` }}
                            />
                        ))}
                    </div>
                </div>
                <div className={cardClass}>
                    <Skeleton className={`h-5 w-48 mb-4 ${skeletonClass}`} />
                    <div className="h-64 md:h-72 flex flex-col gap-4 justify-center">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Skeleton className={`h-4 w-24 shrink-0 ${skeletonClass}`} />
                                <Skeleton className={`h-5 flex-1 rounded ${skeletonClass}`} style={{ width: `${80 - i * 12}%` }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Activity Feeds */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className={cardClass}>
                        <Skeleton className={`h-5 w-32 mb-4 ${skeletonClass}`} />
                        {[...Array(5)].map((_, j) => (
                            <div key={j} className="flex items-center justify-between py-2">
                                <div className="flex-1">
                                    <Skeleton className={`h-4 w-28 mb-1 ${skeletonClass}`} />
                                    <Skeleton className={`h-3 w-20 ${skeletonClass}`} />
                                </div>
                                <Skeleton className={`h-4 w-16 ${skeletonClass}`} />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
