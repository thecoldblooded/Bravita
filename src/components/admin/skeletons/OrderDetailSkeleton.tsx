import { Skeleton } from "@/components/ui/skeleton";

interface OrderDetailSkeletonProps {
    className?: string;
}

export function OrderDetailSkeleton({ className }: OrderDetailSkeletonProps) {
    return (
        <div className={className}>
            {/* Back Button & Header */}
            <div className="mb-6">
                <Skeleton className="h-4 w-24 mb-4" />
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-8 w-56 mb-2" />
                        <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="h-8 w-24 rounded-full" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Order Items Card */}
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <Skeleton className="h-6 w-32 mb-4" />

                        {/* Items */}
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="flex gap-4 py-4 border-b last:border-0">
                                <Skeleton className="h-20 w-20 rounded-lg" />
                                <div className="flex-1">
                                    <Skeleton className="h-5 w-48 mb-2" />
                                    <Skeleton className="h-4 w-24 mb-2" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                                <Skeleton className="h-6 w-20" />
                            </div>
                        ))}

                        {/* Totals */}
                        <div className="mt-4 pt-4 border-t space-y-2">
                            <div className="flex justify-between">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                            <div className="flex justify-between">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                            <div className="flex justify-between">
                                <Skeleton className="h-5 w-16" />
                                <Skeleton className="h-5 w-28" />
                            </div>
                        </div>
                    </div>

                    {/* Customer Info Card */}
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <Skeleton className="h-6 w-36 mb-4" />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Skeleton className="h-4 w-16 mb-2" />
                                <Skeleton className="h-5 w-40" />
                            </div>
                            <div>
                                <Skeleton className="h-4 w-16 mb-2" />
                                <Skeleton className="h-5 w-48" />
                            </div>
                            <div>
                                <Skeleton className="h-4 w-16 mb-2" />
                                <Skeleton className="h-5 w-32" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar - Status Timeline */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <Skeleton className="h-6 w-28 mb-6" />

                        {/* Timeline */}
                        <div className="space-y-6">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                        {i < 3 && <Skeleton className="h-12 w-0.5 my-2" />}
                                    </div>
                                    <div className="flex-1 pt-1">
                                        <Skeleton className="h-4 w-24 mb-1" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <Skeleton className="h-6 w-24 mb-4" />
                        <div className="space-y-3">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
