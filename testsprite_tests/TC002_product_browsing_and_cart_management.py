import requests
from bs4 import BeautifulSoup

def test_product_browsing_and_cart_management():
    base_url = "http://localhost:8080"
    timeout = 30

    try:
        # 1. Navigate to the base URL and check page title
        response = requests.get(base_url, timeout=timeout)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        title = soup.title.string if soup.title else ""
        assert "Bravita" in title, f"Expected 'Bravita' in page title but got '{title}'"

        # 2. Retrieve product list via API (assuming /api/products endpoint)
        products_resp = requests.get(f"{base_url}/api/products", timeout=timeout)
        products_resp.raise_for_status()
        products = products_resp.json()
        assert isinstance(products, list) and len(products) > 0, "Product list should be a non-empty list"

        # Pick first product for the test
        product = products[0]
        product_id = product.get("id")
        stock = product.get("stock", 10)  # assume stock field or default 10

        assert product_id is not None, "Product must have an id"
        assert isinstance(stock, int) and stock >= 0, "Stock must be a non-negative integer"

        headers = {"Content-Type": "application/json"}

        # 3. Add product to cart with valid quantity <= stock
        add_cart_payload = {
            "productId": product_id,
            "quantity": 1
        }
        add_cart_resp = requests.post(f"{base_url}/api/cart/add", json=add_cart_payload, headers=headers, timeout=timeout)
        add_cart_resp.raise_for_status()
        add_cart_data = add_cart_resp.json()
        assert add_cart_data.get("success") is True, "Adding to cart failed"
        assert add_cart_data.get("cart") is not None, "Cart data must be returned"

        # 4. Attempt to add quantity exceeding stock to test quantity limits
        excessive_quantity = stock + 10 if stock > 0 else 100
        add_cart_payload_excess = {
            "productId": product_id,
            "quantity": excessive_quantity
        }
        add_cart_excess_resp = requests.post(f"{base_url}/api/cart/add", json=add_cart_payload_excess, headers=headers, timeout=timeout)
        # We expect a 400 or similar error for exceeding stock
        assert add_cart_excess_resp.status_code in (400, 422), "Exceeding stock limit should be rejected"
        error_response = add_cart_excess_resp.json()
        assert "error" in error_response or "message" in error_response, "Error message should be present when exceeding stock"

        # 5. Get cart state and verify correct quantity and optimistic updates assumed to be handled
        cart_resp = requests.get(f"{base_url}/api/cart", timeout=timeout)
        cart_resp.raise_for_status()
        cart = cart_resp.json()
        assert isinstance(cart, dict), "Cart response should be a dict"
        cart_items = cart.get("items", [])
        matching_items = [item for item in cart_items if item.get("productId") == product_id]
        assert len(matching_items) == 1, "There should be one cart item matching the product"
        assert matching_items[0].get("quantity") == 1, "Cart quantity should be 1 for the product"

        # 6. Verify cart sync with localStorage by checking cart state consistency (simulate by re-fetch)
        # Since we can't access localStorage directly via requests, we check cart persistence on server side by fetching twice
        cart_resp_2 = requests.get(f"{base_url}/api/cart", timeout=timeout)
        cart_resp_2.raise_for_status()
        cart_2 = cart_resp_2.json()
        assert cart == cart_2, "Cart state should persist and remain consistent across fetches (simulate localStorage sync)"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"
    except AssertionError as e:
        assert False, f"Assertion failed: {e}"


test_product_browsing_and_cart_management()