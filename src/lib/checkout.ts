import { supabase } from "./supabase";

// Checkout response tipi
export interface CheckoutResponse {
    success: boolean;
    order_id?: string;
    product_name?: string;
    quantity?: number;
    unit_price?: number;
    subtotal?: number;
    vat_amount?: number;
    total?: number;
    error?: string;
    message: string;
}

// Checkout parametreleri
export interface CheckoutParams {
    productSlug: string;
    quantity: number;
    promoCode?: string;
}

/**
 * Server-side validated checkout
 * 
 * Bu fonksiyon Supabase RPC üzerinden sunucu tarafında:
 * 1. Kullanıcı oturumunu doğrular
 * 2. profile_complete = true kontrolü yapar
 * 3. Ürün fiyatını VERİTABANINDAN alır (client'tan değil!)
 * 4. Stok kontrolü yapar
 * 5. Miktar limitini kontrol eder
 * 6. Siparişi oluşturur
 * 
 * @param params - Checkout parametreleri
 * @returns CheckoutResponse
 */
export async function processCheckout(params: CheckoutParams): Promise<CheckoutResponse> {
    const { productSlug, quantity, promoCode } = params;

    // Sunucu tarafındaki validate_checkout fonksiyonunu çağır
    const { data, error } = await supabase.rpc("validate_checkout", {
        p_product_slug: productSlug,
        p_quantity: quantity,
        p_promo_code: promoCode || null,
    });

    if (error) {
        console.error("Checkout RPC error:", error);
        return {
            success: false,
            error: "RPC_ERROR",
            message: error.message || "Sunucu hatası oluştu",
        };
    }

    // Sunucudan gelen response'u döndür
    return data as CheckoutResponse;
}

/**
 * Ürün bilgilerini sunucudan al
 * Fiyat bilgisi her zaman sunucudan gelmeli!
 */
export async function getProductPrice(slug: string): Promise<{
    price: number;
    original_price?: number;
    stock: number;
    maxQuantity: number;
    id: string;
} | null> {
    const { data, error } = await supabase
        .from("products")
        .select("id, price, original_price, stock, max_quantity_per_order")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

    if (error || !data) {
        console.error("Product fetch error:", error);
        return null;
    }

    return {
        id: data.id,
        price: data.price,
        original_price: data.original_price,
        stock: data.stock,
        maxQuantity: data.max_quantity_per_order,
    };
}

/**
 * Stok durumunu kontrol et
 */
export async function checkStock(slug: string, quantity: number): Promise<{
    available: boolean;
    currentStock: number;
    message?: string;
}> {
    const product = await getProductPrice(slug);

    if (!product) {
        return {
            available: false,
            currentStock: 0,
            message: "Ürün bulunamadı",
        };
    }

    if (product.stock < quantity) {
        return {
            available: false,
            currentStock: product.stock,
            message: `Yeterli stok yok. Mevcut: ${product.stock}`,
        };
    }

    if (quantity > product.maxQuantity) {
        return {
            available: false,
            currentStock: product.stock,
            message: `Maksimum sipariş: ${product.maxQuantity}`,
        };
    }

    return {
        available: true,
        currentStock: product.stock,
    };
}

// ============================================
// ORDER CREATION
// ============================================

export interface CartItem {
    id: string;
    name: string;
    slug?: string;
    quantity: number;
    price: number;
    product_id?: string;
}

export interface CreateOrderParams {
    userId: string;
    items: CartItem[];
    shippingAddressId: string;
    paymentMethod: "credit_card" | "bank_transfer";
    subtotal: number;
    vatAmount: number;
    total: number;
    promoCode?: string;
    discountAmount?: number;
}

export interface CreateOrderResponse {
    success: boolean;
    orderId?: string;
    bankReference?: string;
    message: string;
    error?: string;
}

/**
 * Generate a bank transfer reference number
 */
export function generateBankReference(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BRV-${timestamp}-${random}`;
}

/**
 * Create a new order with items, address, and payment method
 */
export async function createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
    const {
        userId,
        items,
        shippingAddressId,
        paymentMethod,
        subtotal,
        vatAmount,
        total,
        promoCode,
    } = params;

    // Build order_details JSONB
    const orderDetails = {
        items: items.map((item) => ({
            product_id: item.id,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            subtotal: item.price * item.quantity,
        })),
        subtotal,
        vat_rate: 0.20,
        vat_amount: vatAmount,
        total,
        promo_code: promoCode || null,
        discount: params.discountAmount || 0,
    };

    // For bank transfer, generate reference
    const bankReference = paymentMethod === "bank_transfer" ? generateBankReference() : null;

    // Determine initial status
    const paymentStatus = paymentMethod === "credit_card" ? "paid" : "pending";
    const orderStatus = paymentMethod === "credit_card" ? "processing" : "pending";



    try {
        const { data, error } = await supabase
            .from("orders")
            .insert({
                user_id: userId,
                order_details: orderDetails,
                status: orderStatus,
                payment_method: paymentMethod,
                payment_status: paymentStatus,
                shipping_address_id: shippingAddressId,
            })
            .select("id")
            .single();

        if (error) {
            console.error("Order creation error:", error);
            return {
                success: false,
                message: error.message || "Sipariş oluşturulamadı",
                error: "INSERT_ERROR",
            };
        }

        // Insert initial status history
        await supabase.from("order_status_history").insert({
            order_id: data.id,
            status: orderStatus,
            note: paymentMethod === "credit_card"
                ? "Ödeme alındı, sipariş hazırlanıyor"
                : "Havale/EFT bekleniyor",
        });

        // Reserve stock for each item
        // Reserve stock for each item
        for (const item of items) {
            const targetId = item.product_id || item.id;
            const { error: stockError } = await supabase.rpc('reserve_stock', {
                p_id: targetId,
                quantity: item.quantity
            });

            if (stockError) {
                console.error(`Failed to reserve stock for item ${targetId}:`, stockError);
                // Consider whether to fail the order or just log. 
                // For now, logging is safer than rolling back a paid order, 
                // but strictly speaking we should have checked stock before payment.
            }
        }

        // Increment promo code usage if applied
        if (promoCode) {
            const { error: promoError } = await supabase.rpc('increment_promo_usage', {
                p_code: promoCode
            });

            if (promoError) {
                console.error("Failed to increment promo usage:", promoError);
                // Don't fail the order for this, getting the order is more important
            }
        }

        return {
            success: true,
            orderId: data.id,
            bankReference: bankReference || undefined,
            message: "Sipariş başarıyla oluşturuldu",
        };
    } catch (err) {
        console.error("Order creation exception:", err);
        return {
            success: false,
            message: "Bir hata oluştu",
            error: "EXCEPTION",
        };
    }
}

/**
 * Get order by ID with full details
 */
export async function getOrderById(orderId: string) {


    const { data, error } = await supabase
        .from("orders")
        .select(`
            *,
            shipping_address:addresses(*)
        `)
        .eq("id", orderId)
        .single();

    if (error) {
        console.error("Get order error:", error);
        return null;
    }

    return data;
}

/**
 * Get user's orders
 */
export async function getUserOrders(userId: string) {


    const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Get user orders error:", error);
        return [];
    }

    return data;
}

/**
 * Validate promo code and calculate discount
 */
export async function validatePromoCode(code: string, subtotal: number): Promise<{
    valid: boolean;
    discountAmount: number;
    message: string;
    type?: 'percentage' | 'fixed_amount';
    value?: number;
}> {
    const { data: promo, error } = await supabase
        .from('promo_codes')
        .select('*')
        .ilike('code', code)
        .eq('is_active', true)
        .single();

    if (error || !promo) {
        return {
            valid: false,
            discountAmount: 0,
            message: 'Geçersiz promosyon kodu',
        };
    }

    const now = new Date();
    if (promo.start_date && new Date(promo.start_date) > now) {
        return {
            valid: false,
            discountAmount: 0,
            message: 'Bu promosyon kodu henüz aktif değil',
        };
    }

    if (promo.end_date && new Date(promo.end_date) < now) {
        return {
            valid: false,
            discountAmount: 0,
            message: 'Bu promosyon kodunun süresi dolmuş',
        };
    }

    if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
        return {
            valid: false,
            discountAmount: 0,
            message: 'Bu promosyon kodunun kullanım limiti dolmuş',
        };
    }

    if (promo.min_order_amount && subtotal < promo.min_order_amount) {
        return {
            valid: false,
            discountAmount: 0,
            message: `Minimum sepet tutarı ₺${promo.min_order_amount} olmalıdır`,
        };
    }

    let discountAmount = 0;
    if (promo.discount_type === 'percentage') {
        discountAmount = (subtotal * promo.discount_value) / 100;
        if (promo.max_discount_amount && discountAmount > promo.max_discount_amount) {
            discountAmount = promo.max_discount_amount;
        }
    } else {
        discountAmount = promo.discount_value;
    }

    return {
        valid: true,
        discountAmount,
        message: 'Promosyon kodu uygulandı',
        type: promo.discount_type,
        value: promo.discount_value
    };
}
