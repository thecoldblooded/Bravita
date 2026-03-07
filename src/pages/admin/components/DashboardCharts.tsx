import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import { TrendingUp, ShoppingBag, PieChart as PieChartIcon, Package } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { DashboardStats } from "@/lib/admin";

const STATUS_LABELS: Record<string, string> = {
    pending: "Beklemede",
    processing: "İşleniyor",
    preparing: "Hazırlanıyor",
    shipped: "Kargoda",
    delivered: "Teslim Edildi",
    cancelled: "İptal Edildi",
};

const STATUS_COLORS: Record<string, string> = {
    pending: "#eab308",
    processing: "#3b82f6",
    preparing: "#6366f1",
    shipped: "#f97316",
    delivered: "#22c55e",
    cancelled: "#ef4444",
};

const TOP_PRODUCT_COLORS = ["#f97316", "#3b82f6", "#22c55e", "#eab308", "#ef4444"];

interface DashboardChartsProps {
    stats: DashboardStats | null;
    isDark: boolean;
    cardClass: string;
    textPrimary: string;
    textSecondary: string;
    gridColor: string;
    axisColor: string;
}

interface PieLabelProps {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
}

function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: PieLabelProps) {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
}

export default function DashboardCharts({
    stats,
    isDark,
    cardClass,
    textPrimary,
    textSecondary,
    gridColor,
    axisColor
}: DashboardChartsProps) {
    const statusData = (stats?.order_status_distribution ?? []).map(item => ({
        ...item,
        name: STATUS_LABELS[item.status] || item.status,
        fill: STATUS_COLORS[item.status] || "#94a3b8",
    }));

    const topProducts = stats?.top_products ?? [];

    return (
        <div className="space-y-6">
            {/* Row 1: Revenue Area Chart + Order Status Donut */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Revenue Area Chart */}
                <div className={cardClass}>
                    <h3 className={`text-base font-bold ${textPrimary} mb-4 flex items-center gap-2`}>
                        <TrendingUp className="w-5 h-5 text-orange-500" />
                        Satış Grafiği
                    </h3>
                    <div className="h-64 md:h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats?.daily_sales}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(date) => formatDate(date, { day: "numeric", month: "short", year: undefined })}
                                    stroke={axisColor}
                                    tick={{ fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke={axisColor}
                                    tick={{ fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value) => `₺${value}`}
                                    width={55}
                                />
                                <Tooltip
                                    formatter={(value) => [`₺${Number(value).toLocaleString("tr-TR")}`, "Ciro"]}
                                    labelFormatter={(date) => formatDate(date)}
                                    contentStyle={{
                                        borderRadius: "12px",
                                        border: "none",
                                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                        backgroundColor: isDark ? "#1f2937" : "#ffffff",
                                        color: isDark ? "#f3f4f6" : "#111827",
                                        fontSize: "13px",
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#f97316"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Order Status Donut */}
                <div className={cardClass}>
                    <h3 className={`text-base font-bold ${textPrimary} mb-4 flex items-center gap-2`}>
                        <PieChartIcon className="w-5 h-5 text-blue-500" />
                        Sipariş Durum Dağılımı
                    </h3>
                    <div className="h-64 md:h-72">
                        {statusData.length === 0 ? (
                            <div className={`h-full flex items-center justify-center ${textSecondary}`}>
                                <p className="text-sm">Bu dönemde sipariş yok</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={50}
                                        outerRadius={85}
                                        paddingAngle={3}
                                        dataKey="count"
                                        label={renderCustomLabel}
                                        labelLine={false}
                                    >
                                        {statusData.map((entry) => (
                                            <Cell key={`status-${entry.status}`} fill={entry.fill} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value, _name, props) => [
                                            `${value} sipariş`,
                                            props.payload?.name || ""
                                        ]}
                                        contentStyle={{
                                            borderRadius: "12px",
                                            border: "none",
                                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                            backgroundColor: isDark ? "#1f2937" : "#ffffff",
                                            color: isDark ? "#f3f4f6" : "#111827",
                                            fontSize: "13px",
                                        }}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        iconType="circle"
                                        iconSize={8}
                                        formatter={(value) => (
                                            <span style={{ color: isDark ? "#94a3b8" : "#64748b", fontSize: "12px" }}>{value}</span>
                                        )}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 2: Daily Orders Bar + Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Daily Orders Bar */}
                <div className={cardClass}>
                    <h3 className={`text-base font-bold ${textPrimary} mb-4 flex items-center gap-2`}>
                        <ShoppingBag className="w-5 h-5 text-blue-500" />
                        Günlük Sipariş
                    </h3>
                    <div className="h-64 md:h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats?.daily_sales}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(date) => formatDate(date, { day: "numeric", month: "short", year: undefined })}
                                    stroke={axisColor}
                                    tick={{ fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    stroke={axisColor}
                                    tick={{ fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={30}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: "12px",
                                        border: "none",
                                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                        backgroundColor: isDark ? "#1f2937" : "#ffffff",
                                        color: isDark ? "#f3f4f6" : "#111827",
                                        fontSize: "13px",
                                    }}
                                    labelFormatter={(date) => formatDate(date)}
                                />
                                <Bar dataKey="count" name="Sipariş" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Products Horizontal Bar */}
                <div className={cardClass}>
                    <h3 className={`text-base font-bold ${textPrimary} mb-4 flex items-center gap-2`}>
                        <Package className="w-5 h-5 text-amber-500" />
                        En Çok Satan Ürünler
                    </h3>
                    <div className="h-64 md:h-72">
                        {topProducts.length === 0 ? (
                            <div className={`h-full flex items-center justify-center ${textSecondary}`}>
                                <p className="text-sm">Bu dönemde satış yok</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topProducts} layout="vertical" margin={{ left: 10, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                                    <XAxis
                                        type="number"
                                        allowDecimals={false}
                                        stroke={axisColor}
                                        tick={{ fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        dataKey="product_name"
                                        type="category"
                                        stroke={axisColor}
                                        tick={{ fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={100}
                                        tickFormatter={(name: string) => name.length > 15 ? name.slice(0, 15) + "…" : name}
                                    />
                                    <Tooltip
                                        formatter={(value, name) => {
                                            if (name === "Adet") return [`${value} adet`, "Adet"];
                                            return [`₺${Number(value).toLocaleString("tr-TR")}`, "Ciro"];
                                        }}
                                        contentStyle={{
                                            borderRadius: "12px",
                                            border: "none",
                                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                            backgroundColor: isDark ? "#1f2937" : "#ffffff",
                                            color: isDark ? "#f3f4f6" : "#111827",
                                            fontSize: "13px",
                                        }}
                                    />
                                    <Bar dataKey="total_quantity" name="Adet" radius={[0, 4, 4, 0]} barSize={20}>
                                        {topProducts.map((entry, index) => (
                                            <Cell
                                                key={`product-${entry.product_name}`}
                                                fill={TOP_PRODUCT_COLORS[index % TOP_PRODUCT_COLORS.length]}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
