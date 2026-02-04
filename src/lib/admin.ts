import { supabase } from "@/lib/supabase";

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
    limit?: number;
    offset?: number;
}): Promise<{ orders: Order[]; count: number }> {
    // Check for test user session
    const { data: sessionData } = await supabase.auth.getSession();
    const isTestUser = sessionData.session?.user?.id === "test-user-id-12345";

    if (isTestUser) {
        let orders = getLocalOrders();

        // Apply filters locally
        if (filters?.status) {
            orders = orders.filter((o: any) => o.status === filters.status);
        }
        if (filters?.search) {
            const search = filters.search.toLowerCase();
            orders = orders.filter((o: any) =>
                o.id.toLowerCase().includes(search) ||
                o.profiles?.full_name?.toLowerCase().includes(search)
            );
        }

        // Sort
        orders.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const totalCount = orders.length;

        // Pagination
        if (filters?.limit) {
            const offset = filters.offset || 0;
            orders = orders.slice(offset, offset + filters.limit);
        }

        // Add dummy profile/address info if missing
        orders = orders.map((o: any) => ({
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
        `, { count: "exact" })
        .order("created_at", { ascending: false });

    if (filters?.status) {
        query = query.eq("status", filters.status);
    }

    if (filters?.search) {
        query = query.or(`id.ilike.%${filters.search}%,profiles.full_name.ilike.%${filters.search}%`);
    }

    if (filters?.limit) {
        query = query.limit(filters.limit);
    }

    if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { orders: data || [], count: count || 0 };
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
        let order = orders.find((o: any) => o.id === orderId);
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
 * Update order status and create history record
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
        const index = orders.findIndex((o: any) => o.id === orderId);
        if (index !== -1) {
            if (orders[index].status === "cancelled") {
                console.error("Cancelled order cannot be updated");
                throw new Error("İptal edilen sipariş güncellenemez.");
            }
            orders[index].status = status;
            orders[index].updated_at = new Date().toISOString();
            if (status === "cancelled") {
                orders[index].cancellation_reason = note || null;
                if (orders[index].payment_status === "paid") {
                    orders[index].payment_status = "refunded";
                }

                // Simulate stock return (just logging it for test user as we don't have local product db linked here)
                // In a real app with local mock, we'd update a 'products' local storage key.
                console.log("Restoring stock for test order items:", orders[index].order_details?.items);
            }
            localStorage.setItem("test_user_orders", JSON.stringify(orders));
            return;
        }
    }

    if (!user) throw new Error("Not authenticated");

    // Fetch current order to check current status and get details for stock restoration
    const { data: currentOrderData, error: fetchError } = await supabase
        .from("orders")
        .select("status, order_details, payment_status")
        .eq("id", orderId)
        .single();

    if (fetchError || !currentOrderData) throw new Error("Order not found");

    if (currentOrderData.status === "cancelled") {
        throw new Error("İptal edilen sipariş güncellenemez.");
    }

    // Is it a cancellation?
    const isCancelling = status === "cancelled";

    // Prepare update data
    const updateData: any = { status, updated_at: new Date().toISOString() };

    // If cancelling
    if (isCancelling) {
        updateData.cancellation_reason = note || null;

        // Check payment status for refund
        if (currentOrderData.payment_status === "paid") {
            updateData.payment_status = "refunded";
        }

        // Restore stock logic
        const details = currentOrderData.order_details as any;
        if (details && details.items && Array.isArray(details.items)) {
            for (const item of details.items) {
                let targetId = item.product_id;

                // Fallback: If no ID or invalid, try lookup by name
                if (!targetId && item.product_name) {
                    const { data: prod } = await supabase.from('products').select('id').eq('name', item.product_name).single();
                    if (prod) targetId = prod.id;
                }

                if (targetId && item.quantity) {
                    const { error: stockError } = await supabase.rpc("restore_stock", {
                        p_id: targetId,
                        quantity: item.quantity
                    });

                    if (stockError) console.error(`Failed to restore stock:`, stockError);
                }
            }
        }
    }

    // If Delivered -> Finalize Reservation (Decrement reserved_stock)
    if (status === "delivered" && currentOrderData.status !== "delivered") {
        const details = currentOrderData.order_details as any;
        if (details && details.items && Array.isArray(details.items)) {
            for (const item of details.items) {
                let targetId = item.product_id;

                // Fallback: If no ID or invalid, try lookup by name
                if (!targetId && item.product_name) {
                    const { data: prod } = await supabase.from('products').select('id').eq('name', item.product_name).single();
                    if (prod) targetId = prod.id;
                }

                if (targetId && item.quantity) {
                    const { error: finalError } = await supabase.rpc("finalize_reservation", {
                        p_id: targetId,
                        quantity: item.quantity
                    });
                    if (finalError) console.error("Failed to finalize reservation:", finalError);
                }
            }
        }
    }

    // Update order status
    const { error: updateError } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

    if (updateError) throw updateError;

    // Add to status history
    const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({
            order_id: orderId,
            status,
            note: note || null,
            created_by: user.id,
        });

    if (historyError) throw historyError;
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
        const index = orders.findIndex((o: any) => o.id === orderId);
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
export async function getDashboardStats(startDate: Date, endDate: Date): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();

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
    const { error } = await supabase
        .from("profiles")
        .update({ is_admin: isAdmin })
        .eq("id", userId);

    if (error) throw error;
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
