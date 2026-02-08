import requests

def test_TC001_user_authentication_with_hcaptcha_validation():
    url = "http://localhost:8080"
    timeout = 30
    try:
        response = requests.get(url, timeout=timeout)
        response.raise_for_status()
        content = response.text
        # Check for correct page title in the returned HTML content
        assert "<title>" in content and "Bravita E-Ticaret Platformu" in content, \
            "Page title does not include expected text 'Bravita E-Ticaret Platformu'"
    except requests.exceptions.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

test_TC001_user_authentication_with_hcaptcha_validation()