const CONTENTSQUARE_SCRIPT_ID = "contentsquare-uxa-script";
const CONTENTSQUARE_SCRIPT_URL = "https://t.contentsquare.net/uxa/294f4fa696437.js";
const COOKIE_CONSENT_KEY = "cookie_consent";
const COOKIE_PREFERENCES_KEY = "cookie_preferences";

type CookiePreferences = {
  necessary?: boolean;
  analytics?: boolean;
  functional?: boolean;
  marketing?: boolean;
};

const hasAnalyticsConsent = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const consentValue = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (!consentValue) {
    return false;
  }

  if (consentValue === "accepted") {
    return true;
  }

  if (consentValue !== "customized") {
    return false;
  }

  const rawPreferences = localStorage.getItem(COOKIE_PREFERENCES_KEY);
  if (!rawPreferences) {
    return false;
  }

  try {
    const cookiePreferences = JSON.parse(rawPreferences) as CookiePreferences;
    return Boolean(cookiePreferences.analytics);
  } catch {
    return false;
  }
};

const appendContentSquareScript = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  if (document.getElementById(CONTENTSQUARE_SCRIPT_ID)) {
    return;
  }

  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[src="${CONTENTSQUARE_SCRIPT_URL}"]`
  );
  if (existingScript) {
    existingScript.id = CONTENTSQUARE_SCRIPT_ID;
    return;
  }

  const scriptElement = document.createElement("script");
  scriptElement.id = CONTENTSQUARE_SCRIPT_ID;
  scriptElement.src = CONTENTSQUARE_SCRIPT_URL;
  scriptElement.async = true;
  scriptElement.defer = true;
  document.head.appendChild(scriptElement);
};

const scheduleAfterIdle = (task: () => void): void => {
  const requestIdleCallbackFn = (
    globalThis as typeof globalThis & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    }
  ).requestIdleCallback;

  if (typeof requestIdleCallbackFn === "function") {
    requestIdleCallbackFn(task, { timeout: 2000 });
    return;
  }

  globalThis.setTimeout(task, 1200);
};

let scriptLoadScheduled = false;

const scheduleContentSquareLoad = (): void => {
  if (scriptLoadScheduled) {
    return;
  }

  scriptLoadScheduled = true;

  const loadWhenReady = () => {
    scheduleAfterIdle(() => {
      appendContentSquareScript();
    });
  };

  if (document.readyState === "complete") {
    loadWhenReady();
    return;
  }

  window.addEventListener("load", loadWhenReady, { once: true });
};

export const initializeConsentAwareAnalytics = (): (() => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const tryLoadAnalytics = () => {
    if (hasAnalyticsConsent()) {
      scheduleContentSquareLoad();
    }
  };

  const handleConsentUpdated = () => {
    tryLoadAnalytics();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === COOKIE_CONSENT_KEY || event.key === COOKIE_PREFERENCES_KEY) {
      tryLoadAnalytics();
    }
  };

  tryLoadAnalytics();
  window.addEventListener("cookie-consent-updated", handleConsentUpdated as EventListener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("cookie-consent-updated", handleConsentUpdated as EventListener);
    window.removeEventListener("storage", handleStorage);
  };
};
