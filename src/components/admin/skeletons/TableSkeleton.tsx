import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
    showHeader?: boolean;
    showSearch?: boolean;
    className?: string;
}

export function TableSkeleton({
    rows = 5,
    columns = 6,
    showHeader = true,
    showSearch = true,
    className,
}: TableSkeletonProps) {
    return (
        <div className={className}>
            {/* Page Header */}
            {showHeader && (
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Skeleton className="h-8 w-40 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>
            )}

            {/* Search Bar */}
            {showSearch && (
                <div className="mb-6">
                    <Skeleton className="h-10 w-full max-w-md" />
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {/* Table Header */}
                <div className="border-b bg-gray-50 px-6 py-4">
                    <div className="flex gap-4">
                        {[...Array(columns)].map((_, i) => (
                            <Skeleton
                                key={i}
                                className="h-4"
                                style={{ width: `${100 / columns}%` }}
                            />
                        ))}
                    </div>
                </div>

                {/* Table Rows */}
                {[...Array(rows)].map((_, rowIndex) => (
                    <div
                        key={rowIndex}
                        className="border-b last:border-b-0 px-6 py-4"
                    >
                        <div className="flex gap-4 items-center">
                            {[...Array(columns)].map((_, colIndex) => (
                                <Skeleton
                                    key={colIndex}
                                    className="h-5"
                                    style={{ width: `${100 / columns}%` }}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-9 w-9" />
                </div>
            </div>
        </div>
    );
}
