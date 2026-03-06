import { next } from "@vercel/functions";
import { buildRequestGateErrorPayload, decideRequestGateAction } from "./request-gate.js";

export const config = {
    runtime: "nodejs",
    matcher: ["/((?!_vercel/|favicon.ico|robots.txt|sitemap.xml).*)"],
};

export default function middleware(request) {
    const decision = decideRequestGateAction(request);

    if (decision.block) {
        return new Response(JSON.stringify(buildRequestGateErrorPayload(decision)), {
            status: 403,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store",
                Vary: "Accept",
            },
        });
    }

    return next();
}
