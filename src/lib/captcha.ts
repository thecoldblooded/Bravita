export function isLocalhostHostname(value: string): boolean {
  const hostname = value.trim().toLowerCase();
  if (!hostname) {
    return false;
  }

  return hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "::1"
    || hostname === "[::1]"
    || hostname.endsWith(".localhost");
}

export function shouldBypassCaptchaForLocalDev(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (import.meta.env.PROD) {
    return false;
  }

  if (!isLocalhostHostname(window.location.hostname)) {
    return false;
  }

  const skipCaptchaFlag = String(import.meta.env.VITE_SKIP_CAPTCHA ?? "true").toLowerCase();
  return skipCaptchaFlag !== "false";
}
