import { supabase, safeQuery } from "@/lib/supabase";
import { Order } from "@/lib/admin/admin";
import { getEdgeFunctionHeaders } from "@/lib/auth/edgeFunctionHeaders";
import { getFunctionAuthHeaders } from "@/lib/auth/functionAuth";

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

    console.warn("processCheckout is deprecated; use createOrder or initiateCardPayment instead.", {
        productSlug,
        quantity,
        hasPromoCode: Boolean(promoCode),
    });

    return {
        success: false,
        error: "DEPRECATED_CHECKOUT_FLOW",
        message: "Bu ödeme akışı artık kullanılmıyor.",
    };
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
        .maybeSingle();

    if (error) {
        console.error("Product fetch error:", error);
        throw error;
    }

    if (!data) {
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
    let product: Awaited<ReturnType<typeof getProductPrice>>;

    try {
        product = await getProductPrice(slug);
    } catch {
        return {
            available: false,
            currentStock: 0,
            message: "Ürün bilgisi alınamadı",
        };
    }

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

interface CartItem {
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
    error?: string;
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
    code?: string;
}

async function extractEdgeFunctionErrorMessage(error: unknown): Promise<{ message?: string; status?: number; code?: string }> {
    const err = error as { context?: Response; response?: Response } | null;
    const response = err?.context instanceof Response
        ? err.context
        : err?.response instanceof Response
            ? err.response
            : undefined;

    const status = typeof response?.status === "number" ? response.status : undefined;
    if (!response) return status === undefined ? {} : { status };

    const contentType = response.headers?.get?.("content-type") ?? "";
    try {
        if (contentType.includes("application/json")) {
            const body = await response.clone().json().catch(() => null);
            if (body && typeof body === "object") {
                const maybeMessage = (body as { message?: unknown; error?: unknown }).message ??
                    (body as { error?: unknown }).error;
                const maybeCode = (body as { code?: unknown }).code;
                const normalizedMessage = typeof maybeMessage === "string" && maybeMessage.trim().length > 0
                    ? maybeMessage.trim()
                    : undefined;
                const normalizedCode = typeof maybeCode === "string" && maybeCode.trim().length > 0
                    ? maybeCode.trim()
                    : undefined;

                if (normalizedMessage || normalizedCode) {
                    return {
                        ...(status === undefined ? {} : { status }),
                        ...(normalizedMessage ? { message: normalizedMessage } : {}),
                        ...(normalizedCode ? { code: normalizedCode } : {}),
                    };
                }
            }
        }

        const text = await response.clone().text().catch(() => "");
        if (text.trim().length > 0) return {
            ...(status === undefined ? {} : { status }),
            message: text.trim(),
        };
    } catch {
        // Ignore parse errors - fall back to default message.
    }

    return status === undefined ? {} : { status };
}

function isInvalidJwtAuthError(extracted: { message?: string; status?: number }): boolean {
    if (extracted.status !== 401) return false;

    const normalizedMessage = (extracted.message ?? "").toLowerCase();
    return normalizedMessage.includes("invalid jwt") ||
        (normalizedMessage.includes("jwt") && normalizedMessage.includes("invalid"));
}

function parseFunctionAuthHeaders(headers: Record<string, string>) {
    const authHeader = headers.Authorization;
    const userJwtHeader = headers["x-user-jwt"];
    const authToken = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
    const userJwtToken = typeof userJwtHeader === "string" ? userJwtHeader.replace(/^Bearer\s+/i, "") : "";

    return {
        authHeader,
        userJwtHeader,
        authToken,
        userJwtToken,
    };
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
    let headers = await getFunctionAuthHeaders("checkout:initiateCardPayment");
    let { authHeader, userJwtHeader, authToken, userJwtToken } = parseFunctionAuthHeaders(headers);

    if (!authToken || !userJwtToken) {
        return {
            success: false,
            message: "Oturum doğrulanamadı. Lütfen tekrar giriş yapıp yeniden deneyin.",
            error: "AUTH_SESSION_REQUIRED",
        };
    }

    const correlationId = params.correlationId ?? `cc-init-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    let invokeData: unknown;
    let invokeError: unknown;
    {
        const result = await supabase.functions.invoke("bakiyem-init-3d", {
            body: {
                ...params,
                installmentNumber: 1,
                correlationId,
            },
            headers,
        });
        invokeData = result.data;
        invokeError = result.error;
    }

    if (invokeError) {
        let extracted = await extractEdgeFunctionErrorMessage(invokeError);

        if (isInvalidJwtAuthError(extracted)) {
            headers = await getFunctionAuthHeaders("checkout:initiateCardPayment:retry", { forceRefresh: true });
            ({ authHeader, userJwtHeader, authToken, userJwtToken } = parseFunctionAuthHeaders(headers));

            if (!authToken || !userJwtToken) {
                return {
                    success: false,
                    message: "Oturum doğrulanamadı. Lütfen tekrar giriş yapıp yeniden deneyin.",
                    error: "AUTH_SESSION_REQUIRED",
                };
            }

            const retryResult = await supabase.functions.invoke("bakiyem-init-3d", {
                body: {
                    ...params,
                    installmentNumber: 1,
                    correlationId,
                },
                headers,
            });

            invokeData = retryResult.data;
            invokeError = retryResult.error;
            if (invokeError) {
                extracted = await extractEdgeFunctionErrorMessage(invokeError);
            }
        }

        if (invokeError) {
            console.error("Card init function error:", extracted.status, extracted.code, extracted.message, invokeError);
            const isAuthError = extracted.status === 401 || isInvalidJwtAuthError(extracted);
            return {
                success: false,
                message: isAuthError ? "Oturum doğrulanamadı. Lütfen tekrar giriş yapıp yeniden deneyin." : (extracted.message || "Kart odeme baslatilamadi"),
                error: isAuthError ? "AUTH_SESSION_REQUIRED" : "FUNCTION_ERROR",
                ...(extracted.code ? { code: extracted.code } : {}),
            };
        }
    }

    const data = invokeData as {
        success?: boolean;
        intentId?: string;
        reused?: boolean;
        redirectUrl?: string;
        threeD?: { redirectUrl?: string };
        message?: string;
        error?: string;
        code?: string;
    };

    const resolvedRedirectUrl = data?.redirectUrl ?? data?.threeD?.redirectUrl ?? null;
    const resolvedThreeD = data?.threeD?.redirectUrl
        ? { redirectUrl: data.threeD.redirectUrl }
        : data?.redirectUrl
            ? { redirectUrl: data.redirectUrl }
            : null;

    return {
        success: !!data?.success,
        ...(data?.intentId ? { intentId: data.intentId } : {}),
        ...(data?.reused !== undefined ? { reused: !!data.reused } : {}),
        ...(resolvedRedirectUrl !== null ? { redirectUrl: resolvedRedirectUrl } : {}),
        ...(resolvedThreeD ? { threeD: resolvedThreeD } : {}),
        ...(data?.message ? { message: data.message } : {}),
        ...(data?.error ? { error: data.error } : {}),
        ...(data?.code ? { code: data.code } : {}),
    };
}

export async function tokenizeCardForPayment(params: CardTokenizeParams): Promise<CardTokenizeResponse> {
    let headers = await getFunctionAuthHeaders("checkout:tokenizeCardForPayment");
    let { authHeader, userJwtHeader, authToken, userJwtToken } = parseFunctionAuthHeaders(headers);

    if (!authToken || !userJwtToken) {
        return {
            success: false,
            message: "Oturum doğrulanamadı. Lütfen tekrar giriş yapıp yeniden deneyin.",
        };
    }

    let invokeData: unknown;
    let invokeError: unknown;
    {
        const result = await supabase.functions.invoke("bakiyem-tokenize-card", {
            body: params,
            headers,
        });
        invokeData = result.data;
        invokeError = result.error;
    }

    if (invokeError) {
        let extracted = await extractEdgeFunctionErrorMessage(invokeError);

        if (isInvalidJwtAuthError(extracted)) {
            headers = await getFunctionAuthHeaders("checkout:tokenizeCardForPayment:retry", { forceRefresh: true });
            ({ authHeader, userJwtHeader, authToken, userJwtToken } = parseFunctionAuthHeaders(headers));

            if (!authToken || !userJwtToken) {
                return {
                    success: false,
                    message: "Oturum doğrulanamadı. Lütfen tekrar giriş yapıp yeniden deneyin.",
                };
            }

            const retryResult = await supabase.functions.invoke("bakiyem-tokenize-card", {
                body: params,
                headers,
            });

            invokeData = retryResult.data;
            invokeError = retryResult.error;
            if (invokeError) {
                extracted = await extractEdgeFunctionErrorMessage(invokeError);
            }
        }

        if (invokeError) {
            console.error("Card tokenize function error:", extracted.status, extracted.message, invokeError);
            const isAuthError = extracted.status === 401 || isInvalidJwtAuthError(extracted);
            return {
                success: false,
                message: isAuthError ? "Oturum doğrulanamadı. Lütfen tekrar giriş yapıp yeniden deneyin." : (extracted.message || "Kart tokenizasyonu basarisiz"),
                error: isAuthError ? "AUTH_SESSION_REQUIRED" : "FUNCTION_ERROR",
            };
        }
    }

    const data = invokeData as { success?: boolean; cardToken?: string; message?: string };
    return {
        success: !!data?.success,
        ...(data?.cardToken ? { cardToken: data.cardToken } : {}),
        ...(data?.message ? { message: data.message } : {}),
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
        subtotal,
        vatAmount,
        total,
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
        let orderHeaders = await getEdgeFunctionHeaders("checkout:createOrder");
        let orderInvokeResult = await supabase.functions.invoke("create-bank-order", {
            body: {
                items: rpcItems,
                shippingAddressId,
                paymentMethod,
                promoCode: promoCode || null,
            },
            headers: orderHeaders,
        });

        if (orderInvokeResult.error) {
            const extracted = await extractEdgeFunctionErrorMessage(orderInvokeResult.error);
            if (isInvalidJwtAuthError(extracted)) {
                orderHeaders = await getEdgeFunctionHeaders("checkout:createOrder:retry", { forceRefresh: true });
                orderInvokeResult = await supabase.functions.invoke("create-bank-order", {
                    body: {
                        items: rpcItems,
                        shippingAddressId,
                        paymentMethod,
                        promoCode: promoCode || null,
                    },
                    headers: orderHeaders,
                });
            }
        }

        const data = orderInvokeResult.data as {
            success?: boolean;
            order_id?: string;
            bank_reference?: string;
            message?: string;
            error?: string;
        } | null;
        const error = orderInvokeResult.error;

        if (error) {
            console.error("Order creation function error:", error);
            return {
                success: false,
                message: error.message || "Sipariş oluşturulamadı (Sunucu hatası)",
                error: "FUNCTION_ERROR",
            };
        }

        // Check the success flag returned by the function
        if (!data?.success) {
            const rpcErrorCode = typeof data?.error === "string" && data.error.trim().length > 0
                ? data.error.trim()
                : "RPC_LOGIC_ERROR";

            return {
                success: false,
                message: data?.message || "Sipariş oluşturulamadı",
                error: rpcErrorCode,
            };
        }

        // Send confirmation email (fire and forget) with authenticated function headers
        try {
            let emailHeaders = await getFunctionAuthHeaders("checkout:createOrder:send-order-email");
            let { authToken, userJwtToken } = parseFunctionAuthHeaders(emailHeaders);

            if (authToken && userJwtToken) {
                let emailInvokeResult = await supabase.functions.invoke("send-order-email", {
                    body: { order_id: data.order_id },
                    headers: emailHeaders,
                });

                if (emailInvokeResult.error) {
                    const extracted = await extractEdgeFunctionErrorMessage(emailInvokeResult.error);
                    if (isInvalidJwtAuthError(extracted)) {
                        emailHeaders = await getFunctionAuthHeaders("checkout:createOrder:send-order-email:retry", { forceRefresh: true });
                        ({ authToken, userJwtToken } = parseFunctionAuthHeaders(emailHeaders));

                        if (authToken && userJwtToken) {
                            emailInvokeResult = await supabase.functions.invoke("send-order-email", {
                                body: { order_id: data.order_id },
                                headers: emailHeaders,
                            });
                        }
                    }
                }
            }
        } catch {
            // Email hatası sipariş başarısını etkilemesin.
        }



        return {
            success: true,
            ...(data.order_id ? { orderId: data.order_id } : {}),
            ...(data.bank_reference ? { bankReference: data.bank_reference } : {}),
            message: data.message || "Sipariş başarıyla oluşturuldu",
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
        .maybeSingle();

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
    const headers = await getEdgeFunctionHeaders("checkout:validatePromoCode");
    const { data: result, error } = await supabase.functions.invoke('verify-promo-code', {
        body: { code },
        headers,
    });

    const promoResult = result as {
        valid?: boolean;
        message?: string;
        discount_type?: 'percentage' | 'fixed_amount';
        discount_value?: number;
        min_order_amount?: number;
        max_discount_amount?: number | null;
    } | null;

    if (error || !promoResult || !promoResult.valid) {
        return {
            valid: false,
            discountAmount: 0,
            message: promoResult?.message || 'Promosyon kodu geçerli değil',
        };
    }

    // Check min order amount locally with the data from RPC (using Net Subtotal)
    if (promoResult.min_order_amount && netSubtotal < promoResult.min_order_amount) {
        return {
            valid: false,
            discountAmount: 0,
            message: `Minimum sepet tutarı ₺${promoResult.min_order_amount} olmalıdır (Ara Toplam)`,
        };
    }

    let discountAmount: number;
    if (promoResult.discount_type === 'percentage') {
        // Calculate based on Gross Total (Total including VAT)
        discountAmount = (totalAmount * Number(promoResult.discount_value || 0)) / 100;
        if (promoResult.max_discount_amount && discountAmount > promoResult.max_discount_amount) {
            discountAmount = promoResult.max_discount_amount;
        }
    } else {
        discountAmount = Number(promoResult.discount_value || 0);
    }

    return {
        valid: true,
        discountAmount,
        message: 'Promosyon kodu uygulandı',
        ...(promoResult.discount_type ? { type: promoResult.discount_type } : {}),
        ...(promoResult.discount_value !== undefined ? { value: promoResult.discount_value } : {}),
        minOrderAmount: promoResult.min_order_amount || 0,
        maxDiscountAmount: promoResult.max_discount_amount || null
    };
}
