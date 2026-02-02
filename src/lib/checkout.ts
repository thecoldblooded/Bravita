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
    stock: number;
    maxQuantity: number;
} | null> {
    const { data, error } = await supabase
        .from("products")
        .select("price, stock, max_quantity_per_order")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

    if (error || !data) {
        console.error("Product fetch error:", error);
        return null;
    }

    return {
        price: data.price,
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
