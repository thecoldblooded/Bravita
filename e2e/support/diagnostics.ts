import type { Page, TestInfo } from "@playwright/test";

type DiagnosticsCleanup = () => Promise<void>;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
    stack: null,
  };
}

export async function installPageDiagnostics(page: Page, testInfo: TestInfo): Promise<DiagnosticsCleanup> {
  const consoleMessages: Array<{ type: string; text: string }> = [];
  const pageErrors: Array<{ name: string; message: string; stack: string | null }> = [];
  const requestFailures: Array<{ method: string; url: string; errorText: string }> = [];

  page.on("console", (message) => {
    consoleMessages.push({
      type: message.type(),
      text: message.text(),
    });
  });

  page.on("pageerror", (error) => {
    pageErrors.push(serializeError(error));
  });

  page.on("requestfailed", (request) => {
    requestFailures.push({
      method: request.method(),
      url: request.url(),
      errorText: request.failure()?.errorText ?? "unknown",
    });
  });

  return async () => {
    const payload: Record<string, unknown> = {
      testId: testInfo.testId,
      title: testInfo.title,
      status: testInfo.status,
      expectedStatus: testInfo.expectedStatus,
      timeout: testInfo.timeout,
      consoleMessages,
      pageErrors,
      requestFailures,
    };

    try {
      const pageState = await page.evaluate(() => ({
        href: window.location.href,
        title: document.title,
        readyState: document.readyState,
        e2eAuthEnabled: (window as Window & { __BRAVITA_E2E_AUTH_ENABLED?: boolean }).__BRAVITA_E2E_AUTH_ENABLED ?? null,
        localStorage: Object.fromEntries(Object.entries(window.localStorage)),
        sessionStorage: Object.fromEntries(Object.entries(window.sessionStorage)),
        rootHtml: document.getElementById("root")?.innerHTML ?? null,
        bodyText: document.body?.innerText ?? null,
      }));

      payload.pageState = pageState;
    } catch (error) {
      payload.pageStateError = serializeError(error);
    }

    await testInfo.attach("page-diagnostics.json", {
      body: Buffer.from(JSON.stringify(payload, null, 2), "utf8"),
      contentType: "application/json",
    });
  };
}
