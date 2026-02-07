import { supabase, getSessionSafe, safeQuery } from "@/lib/supabase";

// Order status types
export type OrderStatus = "pending" | "processing" | "preparing" | "shipped" | "delivered" | "cancelled";

export interface OrderItem {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
}

export interface OrderDetails {
    items: OrderItem[];
    subtotal: number;
    vat_amount: number;
    total: number;
    discount?: number;
    promo_code?: string;
}

export interface Order {
    id: string;
    user_id: string;
    order_details: OrderDetails;
    status: OrderStatus;
    payment_method: string;
    payment_status: string;
    shipping_address_id: string;
    tracking_number: string | null;
    shipping_company?: string | null;
    created_at: string;
    updated_at: string;
    cancellation_reason?: string | null;
    // Joined data
    profiles?: {
        full_name: string | null;
        email: string;
        phone: string | null;
    };
    addresses?: {
        street: string;
        city: string;
        postal_code: string;
    };
}

export interface OrderStatusHistoryItem {
    id: string;
    order_id: string;
    status: string;
    note: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface OrderStats {
    pending: number;
    processing: number;
    preparing: number;
    shipped: number;
    delivered: number;
    total: number;
    totalRevenue: number;
}

// Status display config
export const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
    pending: { label: "Beklemede", color: "text-yellow-700", bgColor: "bg-yellow-100" },
    processing: { label: "İşleniyor", color: "text-blue-700", bgColor: "bg-blue-100" },
    preparing: { label: "Hazırlanıyor", color: "text-indigo-700", bgColor: "bg-indigo-100" },
    shipped: { label: "Kargoda", color: "text-orange-700", bgColor: "bg-orange-100" },
    delivered: { label: "Teslim Edildi", color: "text-green-700", bgColor: "bg-green-100" },
    cancelled: { label: "İptal Edildi", color: "text-red-700", bgColor: "bg-red-100" },
};

export interface DashboardStats {
    total_revenue: number;
    order_count: number;
    cancelled_count: number;
    daily_sales: {
        date: string;
        count: number;
        revenue: number;
    }[];
}

/**
 * Get all orders with customer info (admin only)
 */
// Helper to get local orders
function getLocalOrders() {
    const stored = localStorage.getItem("test_user_orders");
    return stored ? JSON.parse(stored) : [];
}

/**
 * Get all orders with customer info (admin only)
 */
export async function getAllOrders(filters?: {
    status?: OrderStatus;
    search?: string;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
    sortBy?: "created_at" | "total";
    sortOrder?: "asc" | "desc";
    limit?: number;
    offset?: number;
}): Promise<{ orders: Order[]; count: number }> {
    // Check for test user session
    const { data: sessionData } = await getSessionSafe();
    const isTestUser = sessionData.session?.user?.id === "test-user-id-12345";

    if (isTestUser) {
        let orders = getLocalOrders();

        // Apply filters locally
        if (filters?.status) {
            orders = orders.filter((o: Order) => o.status === filters.status);
        }
        if (filters?.search) {
            const search = filters.search.toLowerCase();
            orders = orders.filter((o: Order) =>
                o.id.toLowerCase().includes(search) ||
                (o.profiles?.full_name?.toLowerCase().includes(search))
            );
        }
        if (filters?.startDate) {
            orders = orders.filter((o: Order) => new Date(o.created_at) >= new Date(filters.startDate!));
        }
        if (filters?.endDate) {
            orders = orders.filter((o: Order) => new Date(o.created_at) <= new Date(filters.endDate!));
        }
        if (filters?.minAmount) {
            orders = orders.filter((o: Order) => (o.order_details?.total || 0) >= filters.minAmount!);
        }
        if (filters?.maxAmount) {
            orders = orders.filter((o: Order) => (o.order_details?.total || 0) <= filters.maxAmount!);
        }

        // Sort
        const sortBy = filters?.sortBy || "created_at";
        const sortOrder = filters?.sortOrder || "desc";

        orders.sort((a: Order, b: Order) => {
            const valA = sortBy === "total" ? (a.order_details?.total || 0) : new Date(a.created_at).getTime();
            const valB = sortBy === "total" ? (b.order_details?.total || 0) : new Date(b.created_at).getTime();
            return sortOrder === "asc" ? valA - valB : valB - valA;
        });

        const totalCount = orders.length;

        // Pagination
        if (filters?.limit) {
            const offset = filters.offset || 0;
            orders = orders.slice(offset, offset + filters.limit);
        }

        // Add dummy profile/address info if missing
        orders = orders.map((o: Order) => ({
            ...o,
            profiles: o.profiles || { full_name: "Test Müşteri", email: "test@musteri.com", phone: "+905550000000" },
            addresses: o.addresses || { street: "Test Mah. Test Sok.", city: "İstanbul", postal_code: "34000" }
        }));

        return { orders, count: totalCount };
    }

    let query = supabase
        .from("orders")
        .select(`
            *,
            profiles!orders_user_id_fkey (
                full_name,
                email,
                phone
            ),
            addresses!orders_shipping_address_id_fkey (
                street,
                city,
                postal_code
            )
        `, { count: "exact" });

    // Status filter
    if (filters?.status) {
        query = query.eq("status", filters.status);
    }

    // Search filter
    if (filters?.search) {
        query = query.or(`id.ilike.%${filters.search}%,profiles.full_name.ilike.%${filters.search}%`);
    }

    // Date filters
    if (filters?.startDate) {
        query = query.gte("created_at", filters.startDate);
    }
    if (filters?.endDate) {
        query = query.lte("created_at", filters.endDate);
    }

    // Amount filters (using jsonb operator)
    if (filters?.minAmount) {
        query = query.gte("order_details->total", filters.minAmount);
    }
    if (filters?.maxAmount) {
        query = query.lte("order_details->total", filters.maxAmount);
    }

    // Sorting
    const sortBy = filters?.sortBy || "created_at";
    const sortOrder = filters?.sortOrder || "desc";

    if (sortBy === "total") {
        query = query.order("order_details->total", { ascending: sortOrder === "asc" });
    } else {
        query = query.order(sortBy, { ascending: sortOrder === "asc" });
    }

    // Pagination
    if (filters?.limit) {
        query = query.limit(filters.limit);
    }
    if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error, count } = await safeQuery<Order[]>(query);

    if (error) {
        if (error.isAborted) return { orders: [], count: 0 };
        throw error;
    }
    return { orders: (data as Order[]) || [], count: count || 0 };
}

/**
 * Get single order by ID with full details
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
    // Check for test user session
    const { data: sessionData } = await supabase.auth.getSession();
    const isTestUser = sessionData.session?.user?.id === "test-user-id-12345";

    if (isTestUser) {
        const orders = getLocalOrders();
        let order = orders.find((o: Order) => o.id === orderId);
        if (order) {
            order = {
                ...order,
                profiles: order.profiles || { full_name: "Test Müşteri", email: "test@musteri.com", phone: "+905550000000" },
                addresses: order.addresses || { street: "Test Mah. Test Sok.", city: "İstanbul", postal_code: "34000" }
            };
            return order;
        }
    }

    const { data, error } = await supabase
        .from("orders")
        .select(`
            *,
            profiles!orders_user_id_fkey (
                full_name,
                email,
                phone
            ),
            addresses!orders_shipping_address_id_fkey (
                street,
                city,
                postal_code
            )
        `)
        .eq("id", orderId)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update order status and create history record using atomic RPC
 */
export async function updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    note?: string
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    // Test user bypass
    if (user?.id === "test-user-id-12345") {
        const orders = getLocalOrders();
        const index = orders.findIndex((o: Order) => o.id === orderId);
        if (index !== -1) {
            if (orders[index].status === "cancelled") {
                throw new Error("İptal edilen sipariş güncellenemez.");
            }
            orders[index].status = status;
            orders[index].updated_at = new Date().toISOString();
            if (status === "cancelled") {
                orders[index].cancellation_reason = note || null;
                if (orders[index].payment_status === "paid") {
                    orders[index].payment_status = "refunded";
                }
            }
            localStorage.setItem("test_user_orders", JSON.stringify(orders));
            return;
        }
    }

    if (!user) throw new Error("Not authenticated");

    // Atomic RPC call handles:
    // 1. Admin verification
    // 2. Status update
    // 4. Stock restoration (on cancellation)
    // 5. Payment status update (refund)
    // 6. Order status history record
    // 7. Admin audit logging
    const { error: rpcError } = await supabase.rpc("admin_update_order_status", {
        p_order_id: orderId,
        p_new_status: status,
        p_note: note || null
    });

    if (rpcError) {
        console.error("RPC Error (admin_update_order_status):", rpcError);
        throw new Error(rpcError.message || "Sipariş durumu güncellenemedi.");
    }
}

/**
 * Update tracking number
 */
export async function updateTrackingNumber(
    orderId: string,
    trackingNumber: string,
    shippingCompany?: string
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    // Test user bypass
    if (user?.id === "test-user-id-12345") {
        const orders = getLocalOrders();
        const index = orders.findIndex((o: Order) => o.id === orderId);
        if (index !== -1) {
            orders[index].tracking_number = trackingNumber;
            orders[index].shipping_company = shippingCompany || null;
            orders[index].updated_at = new Date().toISOString();
            localStorage.setItem("test_user_orders", JSON.stringify(orders));
            return;
        }
    }

    const { error } = await supabase
        .from("orders")
        .update({
            tracking_number: trackingNumber,
            shipping_company: shippingCompany || null,
            updated_at: new Date().toISOString()
        })
        .eq("id", orderId);

    if (error) throw error;
}

/**
 * Get order status history
 */
export async function getOrderStatusHistory(orderId: string): Promise<OrderStatusHistoryItem[]> {
    // Check for test user session
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user?.id === "test-user-id-12345") {
        // Mock history
        return [{
            id: "mock-history-1",
            order_id: orderId,
            status: "pending",
            note: "Sipariş alındı (Test)",
            created_by: "test-user-id-12345",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }];
    }

    const { data, error } = await supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Get dashboard statistics using secure RPC
 */
export async function getDashboardStats(startDate: Date, endDate: Date): Promise<DashboardStats> {
    const { data: { session } } = await getSessionSafe();
    const user = session?.user;

    // Test User Bypass
    if (user?.id === "test-user-id-12345") {
        return {
            total_revenue: 15420,
            order_count: 12,
            cancelled_count: 3,
            daily_sales: Array.from({ length: 7 }).map((_, i) => ({
                date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
                count: Math.floor(Math.random() * 5),
                revenue: Math.floor(Math.random() * 5000)
            })).reverse()
        };
    }

    const { data, error } = await supabase
        .rpc('get_dashboard_stats', {
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
        });

    if (error) throw error;

    // Fill missing dates in daily_sales
    if (data && Array.isArray(data.daily_sales)) {
        const salesMap = new Map();
        data.daily_sales.forEach((item: { date: string; count: number; revenue: number }) => {
            // item.date is expected to be ISO string from DB
            const dateStr = item.date.split('T')[0];
            salesMap.set(dateStr, item);
        });

        const filledData = [];
        const loopCurrent = new Date(startDate);

        // Loop until loopCurrent is greater than endDate
        // Comparison involves time, but since startDate is 00:00 and loop steps by day,
        // it generates 00:00 for each day.
        // endDate is 23:59 so it includes the last day.
        while (loopCurrent.getTime() <= endDate.getTime()) {
            // Use local date to construct the key because loopCurrent is iterating in local time
            // toISOString() converts to UTC, causing a day shift (e.g. 00:00 TRT -> 21:00 UTC previous day)
            const year = loopCurrent.getFullYear();
            const month = String(loopCurrent.getMonth() + 1).padStart(2, '0');
            const day = String(loopCurrent.getDate()).padStart(2, '0');
            const isoKey = `${year}-${month}-${day}`;

            if (salesMap.has(isoKey)) {
                // We found data for this day. 
                // Important: The DB returns UTC 00:00 for that day.
                // loopCurrent is Local 00:00. 
                // We prefer the DB object but its 'date' property is UTC. 
                // Recharts handles ISO strings well usually.
                filledData.push(salesMap.get(isoKey));
            } else {
                filledData.push({
                    date: loopCurrent.toISOString(), // Use the loop's timestamp
                    count: 0,
                    revenue: 0
                });
            }
            loopCurrent.setDate(loopCurrent.getDate() + 1);
        }

        // Sort explicitly just in case
        data.daily_sales = filledData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    return data;
}

/**
 * Get all admin users
 */
export async function getAdminUsers(): Promise<{ id: string; email: string; full_name: string | null }[]> {
    const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("is_admin", true);

    if (error) throw error;
    return data || [];
}

/**
 * Set user as admin
 */
export async function setUserAdmin(userId: string, isAdmin: boolean): Promise<void> {
    const { error } = await supabase.rpc('sync_user_admin_status', {
        p_user_id: userId,
        p_is_admin: isAdmin
    });

    if (error) {
        console.error("RPC Error (sync_user_admin_status):", error);
        throw error;
    }
}

/**
 * Search users by email (for adding admins)
 */
export async function searchUsersByEmail(email: string): Promise<{ id: string; email: string; full_name: string | null; is_admin: boolean }[]> {
    const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, is_admin")
        .ilike("email", `%${email}%`)
        .limit(10);

    if (error) throw error;
    return data || [];
}

export interface Product {
    id: string;
    name: string;
    slug: string;
    price: number;
    original_price?: number;
    stock: number;
    reserved_stock: number;
    max_quantity_per_order: number;
    is_active: boolean;
    description?: string;
    image_url?: string;
    created_at: string;
    updated_at: string;
}

/**
 * Get all products
 */
export async function getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name");

    if (error) throw error;
    return data || [];
}

/**
 * Add new product
 */
export async function addProduct(product: Omit<Product, "id" | "created_at" | "updated_at" | "reserved_stock">): Promise<Product> {
    const { data, error } = await supabase
        .from("products")
        .insert({
            ...product,
            reserved_stock: 0
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete product
 */
export async function deleteProduct(productId: string): Promise<void> {
    const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

    if (error) throw error;
}

/**
 * Update product stock
 */
export async function updateProductStock(
    productId: string,
    newStock: number
): Promise<void> {
    const { error } = await supabase
        .from("products")
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq("id", productId);

    if (error) throw error;
}

/**
 * Update product details
 */
export async function updateProduct(
    productId: string,
    updates: Partial<Omit<Product, "id" | "created_at" | "updated_at">>
): Promise<void> {
    const { error } = await supabase
        .from("products")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", productId);

    if (error) throw error;
}

// Promo Code Types
export interface PromoCode {
    id: string;
    code: string;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number;
    min_order_amount?: number;
    max_discount_amount?: number;
    start_date?: string;
    end_date?: string;
    usage_limit?: number;
    usage_count: number;
    is_active: boolean;
}

// Promo Code Functions
export async function getPromoCodes(): Promise<PromoCode[]> {
    const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching promo codes:', error);
        throw error;
    }

    return data || [];
}

export async function addPromoCode(promoCode: Omit<PromoCode, 'id' | 'usage_count'>): Promise<PromoCode> {
    const { data, error } = await supabase
        .from('promo_codes')
        .insert(promoCode)
        .select()
        .single();

    if (error) {
        console.error('Error adding promo code:', error);
        throw error;
    }

    return data;
}

export async function updatePromoCode(id: string, updates: Partial<PromoCode>): Promise<PromoCode> {
    const { data, error } = await supabase
        .from('promo_codes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating promo code:', error);
        throw error;
    }

    return data;
}

export async function deletePromoCode(id: string): Promise<void> {
    const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting promo code:', error);
        throw error;
    }
}
