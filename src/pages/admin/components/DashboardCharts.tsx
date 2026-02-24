import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, ShoppingBag } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { DashboardStats } from "@/lib/admin";

interface DashboardChartsProps {
    stats: DashboardStats | null;
    isDark: boolean;
    cardClass: string;
    textPrimary: string;
    gridColor: string;
    axisColor: string;
}

export default function DashboardCharts({
    stats,
    isDark,
    cardClass,
    textPrimary,
    gridColor,
    axisColor
}: DashboardChartsProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={cardClass}>
                <h3 className={`text-lg font-bold ${textPrimary} mb-6 flex items-center gap-2`}>
                    <TrendingUp className="w-5 h-5 text-orange-500" />
                    Satış Grafiği
                </h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats?.daily_sales}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(date) => formatDate(date, { day: "numeric", month: "short", year: undefined })}
                                stroke={axisColor}
                                tick={{ fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                stroke={axisColor}
                                tick={{ fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value) => `₺${value}`}
                            />
                            <Tooltip
                                formatter={(value) => [`₺${Number(value).toLocaleString("tr-TR")}`, "Ciro"]}
                                labelFormatter={(date) => formatDate(date)}
                                contentStyle={{
                                    borderRadius: "12px",
                                    border: "none",
                                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                    backgroundColor: isDark ? "#1f2937" : "#ffffff",
                                    color: isDark ? "#f3f4f6" : "#111827"
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="#f97316"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className={cardClass}>
                <h3 className={`text-lg font-bold ${textPrimary} mb-6 flex items-center gap-2`}>
                    <ShoppingBag className="w-5 h-5 text-blue-500" />
                    Günlük Sipariş
                </h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats?.daily_sales}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(date) => formatDate(date, { day: "numeric", month: "short", year: undefined })}
                                stroke={axisColor}
                                tick={{ fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                allowDecimals={false}
                                stroke={axisColor}
                                tick={{ fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: "12px",
                                    border: "none",
                                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                    backgroundColor: isDark ? "#1f2937" : "#ffffff",
                                    color: isDark ? "#f3f4f6" : "#111827"
                                }}
                                labelFormatter={(date) => formatDate(date)}
                            />
                            <Bar dataKey="count" name="Sipariş" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
