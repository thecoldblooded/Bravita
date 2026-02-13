import { supabase, safeQuery } from "./supabase";
import { Order } from "./admin";
import { getFunctionAuthHeaders } from "./functionAuth";

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

/**
 * Get bank transfer details from site settings
 */
export async function getBankDetails(): Promise<{
    bankName: string;
    iban: string;
    accountHolder: string;
}> {
    const { data, error } = await supabase
        .from('site_settings')
        .select('bank_name, bank_iban, bank_account_holder')
        .eq('id', 1)
        .single();

    if (error) {
        console.error('Error fetching bank details:', error);
        return {
            bankName: "Ziraat Bankası",
            iban: "TR00 0000 0000 0000 0000 0000 00",
            accountHolder: "Bravita Sağlık A.Ş."
        };
    }

    return {
        bankName: data.bank_name,
        iban: data.bank_iban,
        accountHolder: data.bank_account_holder
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
    paymentMethod: "bank_transfer";
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

export interface InstallmentRate {
    installment_number: number;
    commission_rate: number;
    is_active: boolean;
}

export interface CardPaymentInitParams {
    shippingAddressId: string;
    installmentNumber: number;
    items: Array<{ product_id: string; quantity: number }>;
    cardDetails?: {
        number: string;
        expiry: string;
        cvv: string;
        name: string;
    };
    cardToken?: string;
    promoCode?: string;
    correlationId?: string;
}

export interface CardTokenizeParams {
    customerCode?: string;
    cardHolderFullName: string;
    cardNumber: string;
    expMonth: string;
    expYear: string;
    cvcNumber: string;
}

export interface CardTokenizeResponse {
    success: boolean;
    cardToken?: string;
    message?: string;
}

export interface ThreeDPayload {
    redirectUrl?: string | null;
    formAction?: string | null;
    formFields?: Record<string, unknown> | null;
    html?: string | null;
    raw?: Record<string, unknown>;
}

export interface CardPaymentInitResponse {
    success: boolean;
    intentId?: string;
    reused?: boolean;
    redirectUrl?: string | null;
    threeD?: ThreeDPayload;
    message?: string;
    error?: string;
}

async function extractEdgeFunctionErrorMessage(error: unknown): Promise<{ message?: string; status?: number }> {
    const err = error as { context?: Response; response?: Response } | null;
    const response = err?.context instanceof Response
        ? err.context
        : err?.response instanceof Response
            ? err.response
            : undefined;

    const status = typeof response?.status === "number" ? response.status : undefined;
    if (!response) return { status };

    const contentType = response.headers?.get?.("content-type") ?? "";
    try {
        if (contentType.includes("application/json")) {
            const body = await response.clone().json().catch(() => null);
            if (body && typeof body === "object") {
                const maybeMessage = (body as { message?: unknown; error?: unknown }).message ??
                    (body as { error?: unknown }).error;
                if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
                    return { status, message: maybeMessage.trim() };
                }
            }
        }

        const text = await response.clone().text().catch(() => "");
        if (text.trim().length > 0) return { status, message: text.trim() };
    } catch {
        // Ignore parse errors - fall back to default message.
    }

    return { status };
}

/**
 * Generate a bank transfer reference number
 */
export function generateBankReference(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BRV-${timestamp}-${random}`;
}

export async function getInstallmentRates(): Promise<InstallmentRate[]> {
    const { data, error } = await supabase
        .from("installment_rates")
        .select("installment_number, commission_rate, is_active")
        .eq("is_active", true)
        .order("installment_number", { ascending: true });

    if (error) {
        console.error("Installment rates fetch error:", error);
        return [];
    }

    return (data || []) as InstallmentRate[];
}

export async function initiateCardPayment(params: CardPaymentInitParams): Promise<CardPaymentInitResponse> {
    const headers = await getFunctionAuthHeaders();
    const { data, error } = await supabase.functions.invoke("bakiyem-init-3d", {
        body: params,
        headers,
    });

    if (error) {
        const extracted = await extractEdgeFunctionErrorMessage(error);
        console.error("Card init function error:", extracted.status, extracted.message, error);
        return {
            success: false,
            message: extracted.message || "Kart odeme baslatilamadi",
            error: "FUNCTION_ERROR",
        };
    }

    return {
        success: !!data?.success,
        intentId: data?.intentId,
        reused: !!data?.reused,
        redirectUrl: data?.redirectUrl ?? data?.threeD?.redirectUrl ?? null,
        threeD: data?.threeD || (data?.redirectUrl ? { redirectUrl: data.redirectUrl } : undefined),
        message: data?.message,
        error: data?.error,
    };
}

export async function tokenizeCardForPayment(params: CardTokenizeParams): Promise<CardTokenizeResponse> {
    const headers = await getFunctionAuthHeaders();
    const { data, error } = await supabase.functions.invoke("bakiyem-tokenize-card", {
        body: params,
        headers,
    });

    if (error) {
        const extracted = await extractEdgeFunctionErrorMessage(error);
        console.error("Card tokenize function error:", extracted.status, extracted.message, error);
        return {
            success: false,
            message: extracted.message || "Kart tokenizasyonu basarisiz",
        };
    }

    return {
        success: !!data?.success,
        cardToken: data?.cardToken,
        message: data?.message,
    };
}

/**
 * Create a new order with items, address, and payment method
 */
export async function createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
    const {
        shippingAddressId,
        paymentMethod,
        items,
        promoCode,
    } = params;

    if (paymentMethod !== "bank_transfer") {
        return {
            success: false,
            message: "Kart odemesi icin 3D odeme akisina gecis yapilmali",
            error: "INVALID_PAYMENT_METHOD",
        };
    }

    // Map items to simplified structure for RPC
    const rpcItems = items.map((item) => ({
        product_id: item.product_id || item.id, // Prioritize product_id (DB ID) over cart item id
        quantity: item.quantity,
    }));

    try {
        // Call the secure backend function
        const { data, error } = await supabase.rpc("create_order", {
            p_items: rpcItems,
            p_shipping_address_id: shippingAddressId,
            p_payment_method: paymentMethod,
            p_promo_code: promoCode || null,
        });

        if (error) {
            console.error("Order creation RPC error:", error);
            return {
                success: false,
                message: error.message || "Sipariş oluşturulamadı (Sunucu hatası)",
                error: "RPC_ERROR",
            };
        }

        // Check the success flag returned by the function
        if (!data.success) {
            return {
                success: false,
                message: data.message || "Sipariş oluşturulamadı",
                error: "RPC_LOGIC_ERROR",
            };
        }

        // Send email (fire and forget)
        supabase.functions.invoke('send-order-email', {
            body: { order_id: data.order_id }
        }).catch(err => console.error("Failed to trigger email function:", err));

        return {
            success: true,
            orderId: data.order_id,
            bankReference: data.bank_reference,
            message: data.message,
        };
    } catch (error) {
        console.error("Order creation exception:", error);
        return {
            success: false,
            message: "Beklenmeyen bir hata oluştu",
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
export async function getUserOrders(userId: string, filters?: {
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
    sortBy?: "created_at" | "total";
    sortOrder?: "asc" | "desc";
}) {
    let query = supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId);

    // ... (rest of filters)
    // Date filters
    if (filters?.startDate) {
        query = query.gte("created_at", filters.startDate);
    }
    if (filters?.endDate) {
        query = query.lte("created_at", filters.endDate);
    }

    // Amount filters
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

    const { data, error } = await safeQuery<Order[]>(query);

    if (error) {
        if (!error.isAborted) {
            console.error("Get user orders error:", error);
        } else {
            console.debug("User orders fetch was aborted (expected on navigation)");
        }
        return [];
    }

    return data as Order[];
}

/**
 * Validate promo code and calculate discount
 * @param totalAmount - The total amount of the order INCLUDING VAT (for threshold check)
 * @param netSubtotal - The net subtotal of the items (for percentage calculation)
 */
export async function validatePromoCode(code: string, totalAmount: number, netSubtotal: number): Promise<{
    valid: boolean;
    discountAmount: number;
    message: string;
    type?: 'percentage' | 'fixed_amount';
    value?: number;
    minOrderAmount?: number;
    maxDiscountAmount?: number | null;
}> {
    // Use RPC to verify promo code (bypass RLS)
    const { data: result, error } = await supabase.rpc('verify_promo_code', { p_code: code });

    if (error || !result || !result.valid) {
        return {
            valid: false,
            discountAmount: 0,
            message: result?.message || 'Promosyon kodu geçerli değil',
        };
    }

    // Check min order amount locally with the data from RPC (using Net Subtotal)
    if (result.min_order_amount && netSubtotal < result.min_order_amount) {
        return {
            valid: false,
            discountAmount: 0,
            message: `Minimum sepet tutarı ₺${result.min_order_amount} olmalıdır (Ara Toplam)`,
        };
    }

    let discountAmount = 0;
    if (result.discount_type === 'percentage') {
        // Calculate based on Gross Total (Total including VAT)
        discountAmount = (totalAmount * result.discount_value) / 100;
        if (result.max_discount_amount && discountAmount > result.max_discount_amount) {
            discountAmount = result.max_discount_amount;
        }
    } else {
        discountAmount = result.discount_value;
    }

    return {
        valid: true,
        discountAmount,
        message: 'Promosyon kodu uygulandı',
        type: result.discount_type,
        value: result.discount_value,
        minOrderAmount: result.min_order_amount || 0,
        maxDiscountAmount: result.max_discount_amount || null
    };
}
