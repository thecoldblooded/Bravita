import { detectSuspiciousValue } from "./api/auth/_shared.js";

const DEFAULT_SITE_ORIGIN = "https://bravita.com.tr";

function toAbsoluteUrl(input) {
    if (input instanceof URL) {
        return new URL(input.toString());
    }

    if (typeof Request !== "undefined" && input instanceof Request) {
        return new URL(input.url);
    }

    if (typeof input === "string") {
        try {
            return new URL(input);
        } catch {
            return new URL(input, DEFAULT_SITE_ORIGIN);
        }
    }

    throw new TypeError("Unsupported request gate input");
}

function buildInspectionCandidates(url) {
    const candidates = [
        url.pathname,
        url.search,
        `${url.pathname}${url.search}`,
    ];

    for (const [key, value] of url.searchParams.entries()) {
        candidates.push(key, value, `${key}=${value}`);
    }

    return candidates;
}

export function decideRequestGateAction(input) {
    const url = toAbsoluteUrl(input);
    const inspected = new Set();

    for (const candidate of buildInspectionCandidates(url)) {
        const normalizedCandidate = typeof candidate === "string" ? candidate.trim() : "";
        if (!normalizedCandidate || inspected.has(normalizedCandidate)) {
            continue;
        }

        inspected.add(normalizedCandidate);
        const detection = detectSuspiciousValue(normalizedCandidate);
        if (detection) {
            return {
                block: true,
                detection,
                href: url.toString(),
                pathname: url.pathname,
                search: url.search,
            };
        }
    }

    return {
        block: false,
        detection: null,
        href: url.toString(),
        pathname: url.pathname,
        search: url.search,
    };
}

export function buildRequestGateErrorPayload(decision) {
    return {
        error: "Forbidden: suspicious request payload",
        detection: decision?.detection?.code ?? "unknown",
    };
}
