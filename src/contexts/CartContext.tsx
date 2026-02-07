/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { getProductPrice } from "@/lib/checkout";

export interface CartItem {
    id: string;
    name: string;
    slug: string;
    quantity: number;
    price: number;
    product_id?: string;
}

interface CartTotal {
    subtotal: number;
    vat: number;
    total: number;
    discount: number;
    shipping: number;
}

interface CartContextType {
    isCartOpen: boolean;
    openCart: () => void;
    closeCart: () => void;
    toggleCart: () => void;
    setIsCartOpen: (open: boolean) => void;
    cartItems: CartItem[];
    cartTotal: CartTotal;
    addToCart: (item: Omit<CartItem, "id">) => void;
    updateQuantity: (id: string, quantity: number) => void;
    removeFromCart: (id: string) => void;
    clearCart: () => void;
    itemCount: number;
    promoCode: string | null;
    discountAmount: number;
    applyPromoCode: (code: string, discount: number) => void;
    removePromoCode: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const VAT_RATE = 0.20;

export function CartProvider({ children }: { children: ReactNode }) {
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cartItems, setCartItems] = useState<CartItem[]>(() => {
        // Load from localStorage on init
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("bravita_cart");
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch {
                    return [];
                }
            }
        }
        return [];
    });

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem("bravita_cart", JSON.stringify(cartItems));
    }, [cartItems]);

    // Sync prices from server whenever cart is opened
    useEffect(() => {
        async function syncPrices() {
            if (cartItems.length === 0) return;

            const updatedItems = await Promise.all(
                cartItems.map(async (item) => {
                    // Always fetch fresh price
                    const product = await getProductPrice(item.slug);
                    if (product) {
                        return { ...item, price: product.price };
                    }
                    return item;
                })
            );

            // Only update if prices changed to avoid infinite loop
            const pricesChanged = updatedItems.some(
                (item, i) => item.price !== cartItems[i].price
            );

            if (pricesChanged) {
                setCartItems(updatedItems);
            }
        }

        if (isCartOpen) {
            syncPrices();
        }
    }, [isCartOpen, cartItems]); // Only runs when cart opens or items change

    const openCart = () => setIsCartOpen(true);
    const closeCart = () => setIsCartOpen(false);
    const toggleCart = () => setIsCartOpen((prev) => !prev);

    const addToCart = useCallback((item: Omit<CartItem, "id">) => {
        setCartItems((prev) => {
            const existing = prev.find((i) => i.slug === item.slug);
            if (existing) {
                return prev.map((i) =>
                    i.slug === item.slug
                        ? { ...i, quantity: i.quantity + item.quantity }
                        : i
                );
            }
            return [...prev, { ...item, id: crypto.randomUUID() }];
        });
    }, []);

    const updateQuantity = useCallback((id: string, quantity: number) => {
        if (quantity < 1) {
            setCartItems((prev) => prev.filter((i) => i.id !== id));
        } else {
            setCartItems((prev) =>
                prev.map((i) => (i.id === id ? { ...i, quantity } : i))
            );
        }
    }, []);

    const removeFromCart = useCallback((id: string) => {
        setCartItems((prev) => prev.filter((i) => i.id !== id));
    }, []);

    const [promoCode, setPromoCode] = useState<string | null>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("bravita_promo_code");
        }
        return null;
    });

    const [discountAmount, setDiscountAmount] = useState<number>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("bravita_discount_amount");
            return saved ? parseFloat(saved) : 0;
        }
        return 0;
    });

    // Persist promo info
    useEffect(() => {
        if (promoCode) {
            localStorage.setItem("bravita_promo_code", promoCode);
        } else {
            localStorage.removeItem("bravita_promo_code");
        }

        localStorage.setItem("bravita_discount_amount", discountAmount.toString());
    }, [promoCode, discountAmount]);

    const applyPromoCode = useCallback((code: string, discount: number) => {
        setPromoCode(code);
        setDiscountAmount(discount);
    }, []);

    const removePromoCode = useCallback(() => {
        setPromoCode(null);
        setDiscountAmount(0);
    }, []);

    const clearCart = useCallback(() => {
        setCartItems([]);
        removePromoCode();
    }, [removePromoCode]);

    const rawSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const vatOnFullPrice = rawSubtotal * VAT_RATE;
    const totalBeforeDiscount = rawSubtotal + vatOnFullPrice;

    // Ensure discount doesn't exceed the total price
    const validDiscount = Math.min(discountAmount, totalBeforeDiscount);

    // Shipping Calculation
    const SHIPPING_COST = 49.90;
    const FREE_SHIPPING_THRESHOLD = 1500;
    const shipping = (totalBeforeDiscount - validDiscount) >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;

    const finalTotal = totalBeforeDiscount - validDiscount + shipping;

    const cartTotal: CartTotal = {
        subtotal: rawSubtotal,
        vat: vatOnFullPrice,
        total: finalTotal,
        discount: validDiscount,
        shipping,
    };

    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <CartContext.Provider
            value={{
                isCartOpen,
                openCart,
                closeCart,
                toggleCart,
                setIsCartOpen,
                cartItems,
                cartTotal,
                addToCart,
                updateQuantity,
                removeFromCart,
                clearCart,
                itemCount,
                promoCode,
                discountAmount: validDiscount,
                applyPromoCode,
                removePromoCode
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}
