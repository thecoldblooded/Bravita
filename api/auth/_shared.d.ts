export interface SuspiciousDetection {
  code?: string;
}

export function detectSuspiciousValue(value: string): SuspiciousDetection | null;
