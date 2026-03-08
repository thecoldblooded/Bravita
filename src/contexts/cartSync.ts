export interface CartItemSnapshot {
    id: string;
    name: string;
    slug: string;
    quantity: number;
    price: number;
    product_id?: string;
}

export interface CartCatalogSnapshot {
    id: string;
    price: number;
}

interface ReconcileCartResult {
    items: CartItemSnapshot[];
    removedItems: CartItemSnapshot[];
    hasChanges: boolean;
}

export function reconcileCartItemsWithCatalog(
    cartItems: CartItemSnapshot[],
    catalog: Record<string, CartCatalogSnapshot | null | undefined>,
): ReconcileCartResult {
    const removedItems: CartItemSnapshot[] = [];
    let hasChanges = false;

    const items = cartItems.reduce<CartItemSnapshot[]>((nextItems, item) => {
        const currentProduct = catalog[item.slug];

        if (currentProduct === undefined) {
            nextItems.push(item);
            return nextItems;
        }

        if (currentProduct === null) {
            removedItems.push(item);
            hasChanges = true;
            return nextItems;
        }

        const normalizedItem: CartItemSnapshot = {
            ...item,
            price: currentProduct.price,
            product_id: currentProduct.id,
        };

        if (normalizedItem.price !== item.price || normalizedItem.product_id !== item.product_id) {
            hasChanges = true;
        }

        nextItems.push(normalizedItem);
        return nextItems;
    }, []);

    return {
        items,
        removedItems,
        hasChanges,
    };
}
