import { supabase, getSessionSafe, safeQuery } from "@/lib/supabase";
import { getFunctionAuthHeaders } from "@/lib/functionAuth";

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
    vat_rate?: number;
    total: number;

    shipping_cost?: number;
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
    payment_intent_id?: string | null;
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

export interface CardVoidResult {
    success: boolean;
    pending: boolean;
    message: string;
    error?: string;
}

export type CardRefundResult = CardVoidResult;

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

export interface SiteSettings {
    vat_rate: number;
    shipping_cost: number;
    free_shipping_threshold: number;
    bank_name: string;
    bank_iban: string;
    bank_account_holder: string;
}

/**
 * Get current site settings
 */
export async function getSiteSettings(): Promise<SiteSettings> {
    const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 1)
        .single();

    if (error) {
        console.error('Error fetching site settings:', error);
        // Fallback to defaults
        return {
            vat_rate: 0.20,
            shipping_cost: 49.90,
            free_shipping_threshold: 1500.00,
            bank_name: "Ziraat Bankası",
            bank_iban: "TR00 0000 0000 0000 0000 0000 00",
            bank_account_holder: "Bravita Sağlık A.Ş."
        };
    }

    return {
        vat_rate: Number(data.vat_rate),
        shipping_cost: Number(data.shipping_cost),
        free_shipping_threshold: Number(data.free_shipping_threshold),
        bank_name: data.bank_name || "",
        bank_iban: data.bank_iban || "",
        bank_account_holder: data.bank_account_holder || ""
    };
}

/**
 * Update site settings
 */
export async function updateSiteSettings(settings: SiteSettings): Promise<void> {
    const { error } = await supabase
        .from('site_settings')
        .update({
            ...settings,
            updated_at: new Date().toISOString()
        })
        .eq('id', 1);

    if (error) {
        throw error;
    }

    // Also log this change
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase.from('admin_audit_log').insert({
            admin_user_id: user.id,
            action: 'UPDATE_SETTINGS',
            target_table: 'site_settings',
            details: settings
        });
    }
}

/**
 * Confirm a bank transfer payment and advance order status
 */
export async function confirmPayment(orderId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Start a transaction-like update
    // 1. Update order payment status and order status
    const { error: orderError } = await supabase
        .from('orders')
        .update({
            payment_status: 'paid',
            status: 'processing', // Automatically move to processing after payment
            updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

    if (orderError) throw orderError;

    // 2. Add history entry
    await updateOrderStatus(orderId, 'processing', 'Ödeme havale ile alındı, onaylandı.');

    // 3. Log the action
    await supabase.from('admin_audit_log').insert({
        admin_user_id: user.id,
        action: 'CONFIRM_PAYMENT',
        target_table: 'orders',
        target_id: orderId,
        details: { method: 'bank_transfer', new_status: 'preparing' }
    });
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
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters.search);
        if (isUUID) {
            query = query.eq("id", filters.search);
        } else {
            query = query.or(`id.ilike.%${filters.search}%,profiles.full_name.ilike.%${filters.search}%`);
        }
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

    if (!user) throw new Error("Not authenticated");

    // Atomic RPC call handles:
    // 1. Admin verification
    // 2. Status update
    // 3. Stock restoration (on cancellation)
    // 4. Order status history record
    // 5. Admin audit logging
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

export async function voidCardPayment(orderId: string): Promise<CardVoidResult> {
    const headers = await getFunctionAuthHeaders();
    const { data, error } = await supabase.functions.invoke("bakiyem-void", {
        body: { orderId },
        headers,
    });

    if (error) {
        return {
            success: false,
            pending: false,
            message: "Void istegi gonderilemedi",
            error: error.message || "FUNCTION_ERROR",
        };
    }

    const success = data?.success === true;
    const pending = data?.pending === true;
    return {
        success,
        pending,
        message: data?.message || (success ? "Void basarili" : (pending ? "Void manuel incelemeye alindi" : "Void basarisiz")),
        error: data?.error,
    };
}

export async function refundCardPayment(orderId: string, amountCents?: number): Promise<CardRefundResult> {
    const headers = await getFunctionAuthHeaders();
    const body: { orderId: string; amountCents?: number } = { orderId };

    if (Number.isFinite(amountCents) && Number(amountCents) > 0) {
        body.amountCents = Number(amountCents);
    }

    const { data, error } = await supabase.functions.invoke("bakiyem-refund", {
        body,
        headers,
    });

    if (error) {
        return {
            success: false,
            pending: false,
            message: "Refund istegi gonderilemedi",
            error: error.message || "FUNCTION_ERROR",
        };
    }

    const success = data?.success === true;
    const pending = data?.pending === true;

    return {
        success,
        pending,
        message: data?.message || (success ? "Refund basarili" : (pending ? "Refund manuel incelemeye alindi" : "Refund basarisiz")),
        error: data?.error,
    };
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

    if (!user) throw new Error("Not authenticated");

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
export async function getAdminUsers(): Promise<{ id: string; email: string; full_name: string | null; is_superadmin?: boolean }[]> {
    const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, is_superadmin")
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
export async function searchUsersByEmail(email: string): Promise<{ id: string; email: string; full_name: string | null; is_admin: boolean; is_superadmin?: boolean }[]> {
    const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, is_admin, is_superadmin")
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

// Audit Logs
export interface AuditLogEntry {
    id: string;
    admin_user_id: string;
    action: string;
    target_table: string | null;
    target_id: string | null;
    details: Record<string, unknown> | null;
    created_at: string;
    admin_name?: string;
    admin_email?: string;
}

export async function getAuditLogs(limit = 50, offset = 0): Promise<AuditLogEntry[]> {
    try {
        const { data, error } = await safeQuery<AuditLogEntry[]>(supabase
            .from("admin_audit_log")
            .select("*")
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1));

        if (error) throw error;
        if (!data || data.length === 0) return [];

        // Fetch admin details
        const uniqueAdminIds = [...new Set(data.map(log => log.admin_user_id).filter(Boolean))];

        if (uniqueAdminIds.length > 0) {
            const { data: profiles, error: profileError } = await safeQuery<{ id: string, full_name: string | null, email: string }[]>(supabase
                .from("profiles")
                .select("id, full_name, email")
                .in("id", uniqueAdminIds));

            if (!profileError && profiles) {
                const profileMap = new Map(profiles.map(p => [p.id, p]));
                return data.map(log => {
                    const profile = profileMap.get(log.admin_user_id);
                    return {
                        ...log,
                        admin_name: profile?.full_name || "Unknown Admin",
                        admin_email: profile?.email || ""
                    };
                });
            }
        }

        return data;
    } catch (error) {
        console.error("Error fetching audit logs:", error);
        return [];
    }
}
