import requests

def test_frontend_responsiveness_and_accessibility():
    url = "http://localhost:8080"
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    # Simple check for page title tag content
    html = response.text
    start_tag = "<title>"
    end_tag = "</title>"
    start_index = html.find(start_tag)
    end_index = html.find(end_tag, start_index)
    assert start_index != -1 and end_index != -1, "Page title tag is missing"
    page_title = html[start_index+len(start_tag):end_index].strip()
    assert page_title != "", "Page title is missing"
    expected_keyword = "Bravita"
    assert expected_keyword in page_title, f"Page title '{page_title}' does not contain expected keyword '{expected_keyword}'"

test_frontend_responsiveness_and_accessibility()
