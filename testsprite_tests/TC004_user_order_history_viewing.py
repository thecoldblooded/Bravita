import requests

def test_user_order_history_viewing():
    url = "http://localhost:8080"
    timeout = 30
    try:
        response = requests.get(url, timeout=timeout)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    content = response.text

    # Check for correct page title in HTML <title> tag
    import re
    title_match = re.search(r'<title>(.*?)</title>', content, re.IGNORECASE)
    assert title_match, "Page title tag not found in the homepage HTML."
    page_title = title_match.group(1).strip()
    
    # Check the title contains the brand name loosely
    assert "Bravita" in page_title, f"Page title does not contain brand name 'Bravita': '{page_title}'."

test_user_order_history_viewing()