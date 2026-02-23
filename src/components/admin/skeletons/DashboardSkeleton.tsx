import { Skeleton } from "@/components/ui/skeleton";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

interface DashboardSkeletonProps {
    className?: string;
}

export function DashboardSkeleton({ className }: DashboardSkeletonProps) {
    const { theme } = useAdminTheme();
    const isDark = theme === "dark";
    const cardClass = isDark ? "bg-gray-800 rounded-xl p-6 border border-gray-700" : "bg-white rounded-xl p-6 shadow-sm border";
    const skeletonClass = isDark ? "bg-gray-700" : "";

    return (
        <div className={className}>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
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

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[...Array(4)].map(() => (
                    <div key={crypto.randomUUID()} className={cardClass}>
                        <div className="flex items-center justify-between mb-4">
                            <Skeleton className={`h-10 w-10 rounded-lg ${skeletonClass}`} />
                            <Skeleton className={`h-4 w-16 ${skeletonClass}`} />
                        </div>
                        <Skeleton className={`h-8 w-24 mb-2 ${skeletonClass}`} />
                        <Skeleton className={`h-4 w-32 ${skeletonClass}`} />
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Area Chart Skeleton */}
                <div className={cardClass}>
                    <Skeleton className={`h-6 w-40 mb-4 ${skeletonClass}`} />
                    <div className="h-72 flex items-end gap-2">
                        {[...Array(12)].map((_, i) => (
                            <Skeleton
                                key={crypto.randomUUID()}
                                className={`flex-1 rounded-t ${skeletonClass}`}
                                style={{ height: `${(i * 13) % 60 + 30}%` }}
                            />
                        ))}
                    </div>
                </div>

                {/* Bar Chart Skeleton */}
                <div className={cardClass}>
                    <Skeleton className={`h-6 w-48 mb-4 ${skeletonClass}`} />
                    <div className="h-72 flex items-end gap-3">
                        {[...Array(7)].map((_, i) => (
                            <Skeleton
                                key={crypto.randomUUID()}
                                className={`flex-1 rounded-t ${skeletonClass}`}
                                style={{ height: `${(i * 17) % 70 + 20}%` }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
