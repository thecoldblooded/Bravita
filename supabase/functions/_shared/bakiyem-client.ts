// @ts-nocheck
/// <reference lib="deno.ns" />
// Proxy-aware fetch client for Deno Deploy / Supabase Edge Functions
// Useful for routing requests to payment gateways like Bakiyem/Moka that require static IP allowlisting.

export async function fetchWithProxy(url: string | URL, options: RequestInit = {}): Promise<Response> {
  const proxyUrl = Deno.env.get("PROXY_URL");
  const proxyUser = Deno.env.get("PROXY_USER");
  const proxyPass = Deno.env.get("PROXY_PASS");

  // Deno type definitions might complain about the 'client' property on RequestInit,
  // so we cast to 'any' to dynamically inject it if Deno.createHttpClient is available.
  const fetchOptions: any = { ...options };
  let client: any = null;

  if (proxyUrl) {
    try {
      const proxyConfig: any = { url: proxyUrl };
      if (proxyUser && proxyPass) {
        proxyConfig.basicAuth = { username: proxyUser, password: proxyPass };
      }
      
      // @ts-ignore: Deno.createHttpClient is a built-in API in the Deno runtime environment
      client = Deno.createHttpClient({ proxy: proxyConfig });
      fetchOptions.client = client;
    } catch (e) {
      console.warn("Failed to create proxy HTTP client, falling back to direct fetch:", e);
    }
  }

  try {
    return await fetch(url, fetchOptions);
  } finally {
    if (client) {
      try {
        client.close();
      } catch (closeError) {
        console.error("Error closing Deno HTTP client:", closeError);
      }
    }
  }
}
