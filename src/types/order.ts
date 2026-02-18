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
    shipping_cost?: number;
    total: number;

    discount?: number;
    promo_code?: string;
}

export interface Order {
    id: string;
    status: string;
    payment_method: string;
    payment_status: string;
    order_details: OrderDetails;
    created_at: string;
    tracking_number?: string;
    shipping_company?: string;
    cancellation_reason?: string;
}
