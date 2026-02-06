import { Skeleton } from "@/components/ui/skeleton";

interface ProductGridSkeletonProps {
    count?: number;
    className?: string;
}

export function ProductGridSkeleton({
    count = 6,
    className,
}: ProductGridSkeletonProps) {
    return (
        <div className={className}>
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <Skeleton className="h-8 w-40 mb-2" />
                    <Skeleton className="h-4 w-80" />
                </div>
                <Skeleton className="h-10 w-36" />
            </div>

            {/* Search */}
            <div className="mb-6">
                <Skeleton className="h-10 w-full max-w-md" />
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(count)].map((_, i) => (
                    <div
                        key={i}
                        className="bg-white rounded-xl shadow-sm border overflow-hidden"
                    >
                        {/* Product Image */}
                        <Skeleton className="h-48 w-full" />

                        {/* Product Info */}
                        <div className="p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <Skeleton className="h-5 w-3/4 mb-2" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                                <Skeleton className="h-6 w-16 rounded-full" />
                            </div>

                            {/* Price & Stock */}
                            <div className="flex items-center justify-between mb-4">
                                <Skeleton className="h-6 w-20" />
                                <Skeleton className="h-4 w-24" />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Skeleton className="h-9 flex-1" />
                                <Skeleton className="h-9 w-9" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
