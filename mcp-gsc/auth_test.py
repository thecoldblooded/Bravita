import sys
import os

# Point to local directory
sys.path.append(r"C:\Users\Umut\.gemini\antigravity\scratch\bravita-future-focused-growth-main\mcp-gsc")

# Import the get_service logic from the MCP server script
from gsc_server import get_gsc_service_oauth

def main():
    print("Initializing Google Search Console OAuth flow...")
    print("A browser window should open. Please authorize the application.")
    
    try:
        service = get_gsc_service_oauth()
        
        # Test an API call
        site_list = service.sites().list().execute()
        sites = site_list.get("siteEntry", [])
        
        print("\n--- AUTHORIZATION SUCCESSFUL ---")
        print(f"You have access to {len(sites)} properties.")
        
    except Exception as e:
        print("\nError during authorization:")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
