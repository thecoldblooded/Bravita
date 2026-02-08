import requests

BASE_URL = "http://localhost:8080"
TIMEOUT = 30

def test_checkout_process_with_promo_code_validation():
    # Step 1: Check if the page title is correct by fetching the landing page HTML
    try:
        response = requests.get(BASE_URL, timeout=TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Failed to load landing page: {e}"

    # Check page title in the HTML content
    html_content = response.text
    assert "<title>" in html_content and "Bravita" in html_content, "Page title does not contain 'Bravita'"

    # We skip login as per instructions

    # Step 2: Create an address (simulate address selection - assuming API for address creation)
    address_payload = {
        "street": "123 Test St",
        "city": "Testville",
        "state": "TS",
        "postal_code": "12345",
        "country": "Testland"
    }
    try:
        address_resp = requests.post(
            f"{BASE_URL}/api/addresses", json=address_payload, timeout=TIMEOUT
        )
        address_resp.raise_for_status()
        address_data = address_resp.json()
        address_id = address_data.get("id")
        assert address_id is not None, "Address ID not returned"
    except requests.RequestException as e:
        assert False, f"Failed to create address: {e}"

    # Step 3: Create a cart with products (simulate cart creation)
    # Assuming an endpoint for cart creation and adding items
    cart_payload = {
        "items": [
            {"product_id": 1, "quantity": 2},
            {"product_id": 2, "quantity": 1}
        ]
    }
    try:
        cart_resp = requests.post(f"{BASE_URL}/api/cart", json=cart_payload, timeout=TIMEOUT)
        cart_resp.raise_for_status()
        cart_data = cart_resp.json()
        cart_id = cart_data.get("id")
        assert cart_id is not None, "Cart ID not returned"
    except requests.RequestException as e:
        # Cleanup address before failing
        try:
            requests.delete(f"{BASE_URL}/api/addresses/{address_id}", timeout=TIMEOUT)
        except: pass
        assert False, f"Failed to create cart: {e}"

    # Step 4: Apply promo code with backend validation
    promo_code_payload = {
        "cart_id": cart_id,
        "promo_code": "PROMO20"
    }
    try:
        promo_resp = requests.post(
            f"{BASE_URL}/api/promo/apply", json=promo_code_payload, timeout=TIMEOUT
        )
        promo_resp.raise_for_status()
        promo_data = promo_resp.json()
        assert promo_data.get("valid") is True, "Promo code was not validated successfully"
        promo_discount = promo_data.get("discount_amount")
        assert promo_discount is not None and promo_discount > 0, "Discount amount missing or invalid"
    except requests.RequestException as e:
        # Cleanup created resources
        try:
            requests.delete(f"{BASE_URL}/api/cart/{cart_id}", timeout=TIMEOUT)
            requests.delete(f"{BASE_URL}/api/addresses/{address_id}", timeout=TIMEOUT)
        except: pass
        assert False, f"Failed to apply promo code: {e}"

    # Step 5: Create order with selected address and confirmed promo
    order_payload = {
        "cart_id": cart_id,
        "address_id": address_id,
        "promo_code": "PROMO20"
    }
    try:
        order_resp = requests.post(f"{BASE_URL}/api/orders", json=order_payload, timeout=TIMEOUT)
        order_resp.raise_for_status()
        order_data = order_resp.json()
        order_id = order_data.get("id")
        assert order_id is not None, "Order ID not returned"
        # Verify backend price confirmation and order totals include promo discount
        price_confirmed = order_data.get("price_confirmed")
        assert price_confirmed is True, "Price was not confirmed by backend"
        final_total = order_data.get("final_total")
        assert final_total is not None and final_total > 0, "Final total missing or invalid"
        email_sent = order_data.get("confirmation_email_sent")
        assert email_sent is True, "Order confirmation email was not dispatched"
    except requests.RequestException as e:
        assert False, f"Failed to create order: {e}"
    finally:
        # Clean up resources: order, cart, address
        try:
            if order_id:
                requests.delete(f"{BASE_URL}/api/orders/{order_id}", timeout=TIMEOUT)
        except: pass
        try:
            if cart_id:
                requests.delete(f"{BASE_URL}/api/cart/{cart_id}", timeout=TIMEOUT)
        except: pass
        try:
            if address_id:
                requests.delete(f"{BASE_URL}/api/addresses/{address_id}", timeout=TIMEOUT)
        except: pass


test_checkout_process_with_promo_code_validation()