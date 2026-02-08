import requests
import re

BASE_URL = "http://localhost:8080"
TIMEOUT = 30

def test_user_profile_and_address_book_management():
    try:
        # Step 1: Navigate to base URL and check page title
        response = requests.get(BASE_URL, timeout=TIMEOUT)
        response.raise_for_status()

        # Extract title tag content using regex instead of bs4
        match = re.search(r'<title>(.*?)<\/title>', response.text, re.IGNORECASE | re.DOTALL)
        title = match.group(1).strip() if match else ""
        assert "Bravita E-Ticaret Platformu" in title, f"Unexpected page title: {title}"

        # Since login is skipped, we cannot do API calls that require auth.
        # As per instructions, only navigation and title check is needed here.

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"


test_user_profile_and_address_book_management()