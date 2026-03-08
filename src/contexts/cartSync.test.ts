import { reconcileCartItemsWithCatalog, type CartCatalogSnapshot, type CartItemSnapshot } from "./cartSync";

describe("reconcileCartItemsWithCatalog", () => {
    it("pasif veya bulunamayan ürünleri sepetten kaldırır", () => {
        const cartItems: CartItemSnapshot[] = [
            {
                id: "cart-1",
                name: "Bravita Multivitamin",
                slug: "bravita-multivitamin",
                quantity: 1,
                price: 600,
                product_id: "product-1",
            },
            {
                id: "cart-2",
                name: "Pasif Ürün",
                slug: "inactive-product",
                quantity: 2,
                price: 200,
                product_id: "product-2",
            },
        ];

        const catalog: Record<string, CartCatalogSnapshot | null> = {
            "bravita-multivitamin": {
                id: "product-1",
                price: 600,
            },
            "inactive-product": null,
        };

        const result = reconcileCartItemsWithCatalog(cartItems, catalog);

        expect(result.items).toEqual([cartItems[0]]);
        expect(result.removedItems).toEqual([cartItems[1]]);
        expect(result.hasChanges).toBe(true);
    });

    it("katalog durumu belirsizse ürünü korur", () => {
        const cartItems: CartItemSnapshot[] = [
            {
                id: "cart-1",
                name: "Bravita Multivitamin",
                slug: "bravita-multivitamin",
                quantity: 1,
                price: 600,
                product_id: "product-1",
            },
        ];

        const catalog: Record<string, CartCatalogSnapshot | null | undefined> = {
            "bravita-multivitamin": undefined,
        };

        const result = reconcileCartItemsWithCatalog(cartItems, catalog);

        expect(result.items).toEqual(cartItems);
        expect(result.removedItems).toEqual([]);
        expect(result.hasChanges).toBe(false);
    });

    it("aktif ürünlerin güncel fiyatını ve product_id bilgisini korur", () => {
        const cartItems: CartItemSnapshot[] = [
            {
                id: "cart-1",
                name: "Bravita Multivitamin",
                slug: "bravita-multivitamin",
                quantity: 3,
                price: 550,
            },
        ];

        const catalog: Record<string, CartCatalogSnapshot | null> = {
            "bravita-multivitamin": {
                id: "product-1",
                price: 600,
            },
        };

        const result = reconcileCartItemsWithCatalog(cartItems, catalog);

        expect(result.items).toEqual([
            {
                ...cartItems[0],
                price: 600,
                product_id: "product-1",
            },
        ]);
        expect(result.removedItems).toEqual([]);
        expect(result.hasChanges).toBe(true);
    });

    it("katalog ile sepet zaten senkron ise değişiklik üretmez", () => {
        const cartItems: CartItemSnapshot[] = [
            {
                id: "cart-1",
                name: "Bravita Multivitamin",
                slug: "bravita-multivitamin",
                quantity: 1,
                price: 600,
                product_id: "product-1",
            },
        ];

        const catalog: Record<string, CartCatalogSnapshot | null> = {
            "bravita-multivitamin": {
                id: "product-1",
                price: 600,
            },
        };

        const result = reconcileCartItemsWithCatalog(cartItems, catalog);

        expect(result.items).toEqual(cartItems);
        expect(result.removedItems).toEqual([]);
        expect(result.hasChanges).toBe(false);
    });
});
