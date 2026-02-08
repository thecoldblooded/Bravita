import requests

def test_admin_order_management_and_tracking_update():
    base_url = "http://localhost:8080"
    timeout = 30
    try:
        response = requests.get(base_url, timeout=timeout)
        response.raise_for_status()
        # Check if expected title is in the response text directly
        expected_title = "Bravita E-Ticaret Platformu"
        assert expected_title in response.text, f"Expected page title to include '{expected_title}', but it was not found in response text"
    except requests.RequestException as e:
        assert False, f"Failed to load base page: {e}"

test_admin_order_management_and_tracking_update()