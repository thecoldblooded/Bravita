import { Skeleton } from "@/components/ui/skeleton";

interface DashboardSkeletonProps {
    className?: string;
}

export function DashboardSkeleton({ className }: DashboardSkeletonProps) {
    return (
        <div className={className}>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-24" />
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-6 shadow-sm border">
                        <div className="flex items-center justify-between mb-4">
                            <Skeleton className="h-10 w-10 rounded-lg" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                        <Skeleton className="h-8 w-24 mb-2" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Area Chart Skeleton */}
                <div className="bg-white rounded-xl p-6 shadow-sm border">
                    <Skeleton className="h-6 w-40 mb-4" />
                    <div className="h-72 flex items-end gap-2">
                        {[...Array(12)].map((_, i) => (
                            <Skeleton
                                key={i}
                                className="flex-1 rounded-t"
                                style={{ height: `${Math.random() * 60 + 30}%` }}
                            />
                        ))}
                    </div>
                </div>

                {/* Bar Chart Skeleton */}
                <div className="bg-white rounded-xl p-6 shadow-sm border">
                    <Skeleton className="h-6 w-48 mb-4" />
                    <div className="h-72 flex items-end gap-3">
                        {[...Array(7)].map((_, i) => (
                            <Skeleton
                                key={i}
                                className="flex-1 rounded-t"
                                style={{ height: `${Math.random() * 70 + 20}%` }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
