import { Skeleton } from "@/components/ui/skeleton";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

interface ProductGridSkeletonProps {
    count?: number;
    className?: string;
}

export function ProductGridSkeleton({
    count = 6,
    className,
}: ProductGridSkeletonProps) {
    const { theme } = useAdminTheme();
    const isDark = theme === "dark";

    const cardClass = isDark
        ? "bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
        : "bg-white rounded-xl shadow-sm border overflow-hidden";
    const skeletonClass = isDark ? "bg-gray-700" : "";

    return (
        <div className={className}>
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <Skeleton className={`h-8 w-40 mb-2 ${skeletonClass}`} />
                    <Skeleton className={`h-4 w-80 ${skeletonClass}`} />
                </div>
                <Skeleton className={`h-10 w-36 ${skeletonClass}`} />
            </div>

            {/* Search */}
            <div className="mb-6">
                <Skeleton className={`h-10 w-full max-w-md ${skeletonClass}`} />
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(count)].map(() => (
                    <div key={crypto.randomUUID()} className={cardClass}>
                        {/* Product Image */}
                        <Skeleton className={`h-48 w-full ${skeletonClass}`} />

                        {/* Product Info */}
                        <div className="p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <Skeleton className={`h-5 w-3/4 mb-2 ${skeletonClass}`} />
                                    <Skeleton className={`h-4 w-1/2 ${skeletonClass}`} />
                                </div>
                                <Skeleton className={`h-6 w-16 rounded-full ${skeletonClass}`} />
                            </div>

                            {/* Price & Stock */}
                            <div className="flex items-center justify-between mb-4">
                                <Skeleton className={`h-6 w-20 ${skeletonClass}`} />
                                <Skeleton className={`h-4 w-24 ${skeletonClass}`} />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Skeleton className={`h-9 flex-1 ${skeletonClass}`} />
                                <Skeleton className={`h-9 w-9 ${skeletonClass}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
