import { Skeleton } from "@/components/ui/skeleton";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

interface OrderDetailSkeletonProps {
    className?: string;
}

export function OrderDetailSkeleton({ className }: OrderDetailSkeletonProps) {
    const { theme } = useAdminTheme();
    const isDark = theme === "dark";

    const cardClass = isDark
        ? "bg-gray-800 rounded-xl border border-gray-700 p-6"
        : "bg-white rounded-xl shadow-sm border p-6";
    const borderClass = isDark ? "border-gray-700" : "";
    const skeletonClass = isDark ? "bg-gray-700" : "";

    return (
        <div className={className}>
            {/* Back Button & Header */}
            <div className="mb-6">
                <Skeleton className={`h-4 w-24 mb-4 ${skeletonClass}`} />
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className={`h-8 w-56 mb-2 ${skeletonClass}`} />
                        <Skeleton className={`h-4 w-40 ${skeletonClass}`} />
                    </div>
                    <Skeleton className={`h-8 w-24 rounded-full ${skeletonClass}`} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Order Items Card */}
                    <div className={cardClass}>
                        <Skeleton className={`h-6 w-32 mb-4 ${skeletonClass}`} />

                        {/* Items */}
                        {[...Array(2)].map((_, i) => (
                            <div key={`item-skeleton-${i}`} className={`flex gap-4 py-4 border-b last:border-0 ${borderClass}`}>
                                <Skeleton className={`h-20 w-20 rounded-lg ${skeletonClass}`} />
                                <div className="flex-1">
                                    <Skeleton className={`h-5 w-48 mb-2 ${skeletonClass}`} />
                                    <Skeleton className={`h-4 w-24 mb-2 ${skeletonClass}`} />
                                    <Skeleton className={`h-4 w-32 ${skeletonClass}`} />
                                </div>
                                <Skeleton className={`h-6 w-20 ${skeletonClass}`} />
                            </div>
                        ))}

                        {/* Totals */}
                        <div className={`mt-4 pt-4 border-t space-y-2 ${borderClass}`}>
                            <div className="flex justify-between">
                                <Skeleton className={`h-4 w-20 ${skeletonClass}`} />
                                <Skeleton className={`h-4 w-24 ${skeletonClass}`} />
                            </div>
                            <div className="flex justify-between">
                                <Skeleton className={`h-4 w-16 ${skeletonClass}`} />
                                <Skeleton className={`h-4 w-20 ${skeletonClass}`} />
                            </div>
                            <div className="flex justify-between">
                                <Skeleton className={`h-5 w-16 ${skeletonClass}`} />
                                <Skeleton className={`h-5 w-28 ${skeletonClass}`} />
                            </div>
                        </div>
                    </div>

                    {/* Customer Info Card */}
                    <div className={cardClass}>
                        <Skeleton className={`h-6 w-36 mb-4 ${skeletonClass}`} />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Skeleton className={`h-4 w-16 mb-2 ${skeletonClass}`} />
                                <Skeleton className={`h-5 w-40 ${skeletonClass}`} />
                            </div>
                            <div>
                                <Skeleton className={`h-4 w-16 mb-2 ${skeletonClass}`} />
                                <Skeleton className={`h-5 w-48 ${skeletonClass}`} />
                            </div>
                            <div>
                                <Skeleton className={`h-4 w-16 mb-2 ${skeletonClass}`} />
                                <Skeleton className={`h-5 w-32 ${skeletonClass}`} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar - Status Timeline */}
                <div className="space-y-6">
                    <div className={cardClass}>
                        <Skeleton className={`h-6 w-28 mb-6 ${skeletonClass}`} />

                        {/* Timeline */}
                        <div className="space-y-6">
                            {[...Array(4)].map((_, i) => (
                                <div key={`timeline-step-${i}`} className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <Skeleton className={`h-8 w-8 rounded-full ${skeletonClass}`} />
                                        {i < 3 && <Skeleton className={`h-12 w-0.5 my-2 ${skeletonClass}`} />}
                                    </div>
                                    <div className="flex-1 pt-1">
                                        <Skeleton className={`h-4 w-24 mb-1 ${skeletonClass}`} />
                                        <Skeleton className={`h-3 w-32 ${skeletonClass}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className={cardClass}>
                        <Skeleton className={`h-6 w-24 mb-4 ${skeletonClass}`} />
                        <div className="space-y-3">
                            <Skeleton className={`h-10 w-full ${skeletonClass}`} />
                            <Skeleton className={`h-10 w-full ${skeletonClass}`} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
