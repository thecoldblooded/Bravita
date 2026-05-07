declare module "../../../request-gate.js" {
  export function decideRequestGateAction(input: unknown): {
    block: boolean;
    detection: { code?: string } | null;
    href: string;
    pathname: string;
    search: string;
  };
}

declare module "../../../api/auth/_shared.js" {
  export function detectSuspiciousValue(value: string): { code?: string } | null;
}
