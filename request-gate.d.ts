export interface RequestGateDetection {
  code?: string;
}

export interface RequestGateDecision {
  block: boolean;
  detection: RequestGateDetection | null;
  href: string;
  pathname: string;
  search: string;
}

export function decideRequestGateAction(input: unknown): RequestGateDecision;
export function buildRequestGateErrorPayload(decision: RequestGateDecision | null | undefined): {
  error: string;
  detection: string;
};
