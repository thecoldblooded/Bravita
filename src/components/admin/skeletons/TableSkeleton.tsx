import { Skeleton } from "@/components/ui/skeleton";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

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
    const { theme } = useAdminTheme();
    const isDark = theme === "dark";

    const tableContainerClass = isDark
        ? "bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
        : "bg-white rounded-xl shadow-sm border overflow-hidden";
    const tableHeaderBg = isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50";
    const rowBorder = isDark ? "border-gray-700" : "";
    const skeletonClass = isDark ? "bg-gray-700" : "";

    return (
        <div className={className}>
            {/* Page Header */}
            {showHeader && (
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Skeleton className={`h-8 w-40 mb-2 ${skeletonClass}`} />
                        <Skeleton className={`h-4 w-64 ${skeletonClass}`} />
                    </div>
                    <Skeleton className={`h-10 w-32 ${skeletonClass}`} />
                </div>
            )}

            {/* Search Bar */}
            {showSearch && (
                <div className="mb-6">
                    <Skeleton className={`h-10 w-full max-w-md ${skeletonClass}`} />
                </div>
            )}

            {/* Table */}
            <div className={tableContainerClass}>
                {/* Table Header */}
                <div className={`border-b ${tableHeaderBg} px-6 py-4`}>
                    <div className="flex gap-4">
                        {[...Array(columns)].map((_, i) => (
                            <Skeleton
                                key={`head-col-${i}`}
                                className={`h-4 ${skeletonClass}`}
                                style={{ width: `${100 / columns}%` }}
                            />
                        ))}
                    </div>
                </div>

                {/* Table Rows */}
                {[...Array(rows)].map((_, rowIndex) => (
                    <div
                        key={`row-${rowIndex}`}
                        className={`border-b last:border-b-0 px-6 py-4 ${rowBorder}`}
                    >
                        <div className="flex gap-4 items-center">
                            {[...Array(columns)].map((_, colIndex) => (
                                <Skeleton
                                    key={`col-${rowIndex}-${colIndex}`}
                                    className={`h-5 ${skeletonClass}`}
                                    style={{ width: `${100 / columns}%` }}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
                <Skeleton className={`h-4 w-32 ${skeletonClass}`} />
                <div className="flex gap-2">
                    <Skeleton className={`h-9 w-9 ${skeletonClass}`} />
                    <Skeleton className={`h-9 w-9 ${skeletonClass}`} />
                    <Skeleton className={`h-9 w-9 ${skeletonClass}`} />
                </div>
            </div>
        </div>
    );
}
