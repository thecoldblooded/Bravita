import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REPORTS_DIR = path.resolve(ROOT, "_reports");
const LOGS_DIR = path.resolve(REPORTS_DIR, "logs");
const AUDITS_DIR = path.resolve(REPORTS_DIR, "audits");

const THRESHOLDS = {
    seoAuditMin: 85,
    lighthouseSeoMin: 85,
    lighthouseA11yMin: 85,
    wafBypassMax: 5,
    sensitiveFiles200Max: 0,
};

const BLOCK_STATUS_CODES = new Set([401, 403, 406, 429]);
const CRITICAL_SEO_CATEGORIES = new Set(["Technical", "Indexability"]);
const CRITICAL_A11Y_PATTERNS = [/label/i, /contrast/i, /heading/i, /focus/i];
const SENSITIVE_FILE_PATHS = [
    "/.env",
    "/.env.production",
    "/.git/config",
    "/.git/HEAD",
    "/wp-config.php",
    "/phpinfo.php",
    "/backup.zip",
    "/database.sql",
    "/server-status",
    "/id_rsa",
];
const REQUIRED_SEO_CHECK_LABELS = [
    "Single H1 tag",
    "Canonical URL defined",
    "Title length optimal (10-60 chars)",
    "Meta description length optimal (50-160 chars)",
    "robots.txt exists",
    "Sitemap found",
];

const OUTPUT = {
    seoChecks: path.resolve(LOGS_DIR, "seo_check_results_latest.log"),
    seoCategory: path.resolve(LOGS_DIR, "seo_category_summary_latest.log"),
    seoRequired: path.resolve(LOGS_DIR, "seo_required_checks_latest.log"),
    seoDelta: path.resolve(LOGS_DIR, "seo_metric_delta_latest.log"),
    a11yRules: path.resolve(LOGS_DIR, "a11y_rule_results_latest.log"),
    a11yKeyboard: path.resolve(LOGS_DIR, "a11y_keyboard_flow_latest.log"),
    a11yDelta: path.resolve(LOGS_DIR, "a11y_metric_delta_latest.log"),
    wafRequests: path.resolve(LOGS_DIR, "waf_request_decisions_latest.log"),
    wafCategory: path.resolve(LOGS_DIR, "waf_category_summary_latest.log"),
    sensitiveFiles: path.resolve(LOGS_DIR, "sensitive_files_status_latest.log"),
    webAccess: path.resolve(LOGS_DIR, "web_access_latest.log"),
    summaryJson: path.resolve(AUDITS_DIR, "retest_diagnostics_latest.json"),
    matrixMd: path.resolve(AUDITS_DIR, "go_no_go_decision_matrix.md"),
};

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeText(filePath, content) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, "utf8");
}

function writeJson(filePath, data) {
    writeText(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function toNum(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function asArray(v) {
    return Array.isArray(v) ? v : [];
}

function norm(v) {
    return String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function toRuleId(v) {
    return norm(v).replace(/[^a-z0-9\s_-]/g, "").replace(/\s+/g, "_");
}

function parseArgs(argv) {
    const args = { strict: false, baselineSeo: null, retestSeo: null, baselineSpeed: null, retestSpeed: null, baselineWaf: null, retestWaf: null };
    for (let i = 0; i < argv.length; i += 1) {
        const t = argv[i];
        if (t === "--strict") { args.strict = true; continue; }
        if (!t.startsWith("--")) throw new Error(`Unknown arg: ${t}`);
        const v = argv[i + 1];
        if (!v || v.startsWith("--")) throw new Error(`Missing value for ${t}`);
        if (t === "--baseline-seo") args.baselineSeo = v;
        else if (t === "--retest-seo") args.retestSeo = v;
        else if (t === "--baseline-speed") args.baselineSpeed = v;
        else if (t === "--retest-speed") args.retestSpeed = v;
        else if (t === "--baseline-waf") args.baselineWaf = v;
        else if (t === "--retest-waf") args.retestWaf = v;
        else throw new Error(`Unknown arg: ${t}`);
        i += 1;
    }
    return args;
}

function resolveInput(p) {
    const r = path.isAbsolute(p) ? p : path.resolve(ROOT, p);
    if (!fs.existsSync(r)) throw new Error(`File not found: ${r}`);
    return r;
}

function listReports(prefix) {
    if (!fs.existsSync(REPORTS_DIR)) return [];
    return fs.readdirSync(REPORTS_DIR, { withFileTypes: true })
        .filter((d) => d.isFile() && d.name.startsWith(prefix) && d.name.endsWith(".json"))
        .map((d) => path.resolve(REPORTS_DIR, d.name))
        .sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
}

function pickPair(prefix, baselineArg, retestArg) {
    if (baselineArg && retestArg) return { baseline: resolveInput(baselineArg), retest: resolveInput(retestArg), mode: "explicit" };
    const files = listReports(prefix);
    if (files.length === 0) throw new Error(`No report files for prefix: ${prefix}`);
    if (retestArg) {
        const retest = resolveInput(retestArg);
        const baseline = baselineArg ? resolveInput(baselineArg) : (files.filter((f) => f !== retest).at(-1) ?? retest);
        return { baseline, retest, mode: "explicit_retest" };
    }
    if (baselineArg) {
        const baseline = resolveInput(baselineArg);
        return { baseline, retest: baseline, mode: "explicit_baseline" };
    }
    return { baseline: files.at(-2) ?? files.at(-1), retest: files.at(-1), mode: files.length >= 2 ? "latest_pair" : "single_fallback" };
}

function summarizeSeo(report) {
    const checks = asArray(report.checks).map((c) => ({ category: String(c?.category ?? "Unknown"), label: String(c?.label ?? "Unknown"), pass: Boolean(c?.pass), detail: String(c?.detail ?? "") }));
    const categoryMap = new Map();
    for (const c of checks) {
        const row = categoryMap.get(c.category) ?? { category: c.category, passCount: 0, failCount: 0, criticalFailCount: 0 };
        if (c.pass) row.passCount += 1;
        else { row.failCount += 1; if (CRITICAL_SEO_CATEGORIES.has(c.category)) row.criticalFailCount += 1; }
        categoryMap.set(c.category, row);
    }
    const required = REQUIRED_SEO_CHECK_LABELS.map((label) => {
        const match = checks.find((c) => norm(c.label) === norm(label));
        return { label, pass: Boolean(match?.pass), detail: match?.detail ?? "missing" };
    });
    return { score: toNum(report.score), checks, categories: [...categoryMap.values()], required, criticalFails: [...categoryMap.values()].reduce((n, c) => n + c.criticalFailCount, 0), url: String(report.url ?? "") };
}

function summarizeSpeed(report) {
    const scores = report?.lighthouse?.scores ?? {};
    const a11yRules = asArray(report?.lighthouse?.accessibilityChecks).map((r) => {
        const label = String(r?.label ?? "Unknown");
        return { ruleId: toRuleId(label), label, pass: Boolean(r?.pass), impact: CRITICAL_A11Y_PATTERNS.some((p) => p.test(label)) ? "critical" : "minor", selector: "N/A" };
    });
    const seoChecks = asArray(report?.lighthouse?.seoChecks).map((r) => ({ label: String(r?.label ?? "Unknown"), pass: Boolean(r?.pass) }));
    return {
        accessibilityScore: toNum(scores.accessibility),
        seoScore: toNum(scores.seo),
        a11yRules,
        seoChecks,
        a11yCriticalFails: a11yRules.filter((r) => !r.pass && r.impact === "critical").length,
    };
}

function summarizeWaf(report) {
    const results = asArray(report.results).map((r) => ({ category: String(r?.category ?? "Unknown"), method: String(r?.method ?? "GET"), status: toNum(r?.status, 0), payload: String(r?.payload ?? "") }));
    const requestRows = results.map((r) => ({ ...r, action: BLOCK_STATUS_CODES.has(r.status) ? "BLOCKED" : "BYPASSED", path: SENSITIVE_FILE_PATHS.find((p) => r.payload.includes(p)) ?? "N/A", ruleId: "N/A" }));
    const categoryMap = new Map();
    for (const row of requestRows) {
        const item = categoryMap.get(row.category) ?? { category: row.category, total: 0, blocked: 0, bypassed: 0 };
        item.total += 1;
        if (row.action === "BLOCKED") item.blocked += 1; else item.bypassed += 1;
        categoryMap.set(row.category, item);
    }
    const sensitiveRows = requestRows.filter((r) => r.category === "Sensitive Files");
    const sensitiveByPath = SENSITIVE_FILE_PATHS.map((p) => {
        const hits = sensitiveRows.filter((r) => r.payload.includes(p));
        const statusList = [...new Set(hits.map((r) => r.status))].sort((a, b) => a - b);
        return { path: p, testedCount: hits.length, http200Count: hits.filter((h) => h.status === 200).length, statuses: statusList };
    });
    const bypassFromAnalysis = toNum(report?.analysis?.executiveSummary?.bypassedTests, NaN);
    const bypassedTotal = Number.isFinite(bypassFromAnalysis) ? bypassFromAnalysis : requestRows.filter((r) => r.action === "BYPASSED").length;
    return { requestRows, categories: [...categoryMap.values()], bypassedTotal, sensitiveByPath, url: String(report.url ?? "") };
}

function delta(base, retest) {
    return Number((toNum(retest) - toNum(base)).toFixed(2));
}

function renderMatrix(summary) {
    const rows = [
        ["WAF toplam bypass", `<= ${THRESHOLDS.wafBypassMax}`, summary.metrics.wafBypassedRetest, summary.gates.waf ? "GO" : "NO-GO", "waf-report...json"],
        ["Sensitive Files 200", `= ${THRESHOLDS.sensitiveFiles200Max}`, summary.metrics.sensitiveFiles200Retest, summary.gates.sensitiveFiles ? "GO" : "NO-GO", "waf-report...json"],
        ["SEO", `>= ${THRESHOLDS.seoAuditMin} ve LH SEO >= ${THRESHOLDS.lighthouseSeoMin}`, `${summary.metrics.seoAuditRetest} / ${summary.metrics.lhSeoRetest}`, summary.gates.seo ? "GO" : "NO-GO", "seo-audit...json + speed-test...json"],
        ["Accessibility", `>= ${THRESHOLDS.lighthouseA11yMin}`, summary.metrics.lhA11yRetest, summary.gates.a11y ? "GO" : "NO-GO", "speed-test...json"],
    ];

    const lines = [
        "# Go/No-Go Karar Matrisi (Otomasyon)",
        "",
        `Generated: ${summary.generatedAt}`,
        `Overall: ${summary.overallDecision}`,
        "",
        "| Kontrol | Hedef | Sonuç | Durum | Kanıt |",
        "| --- | --- | --- | --- | --- |",
        ...rows.map((r) => `| ${r[0]} | ${r[1]} | ${r[2]} | ${r[3]} | ${r[4]} |`),
    ];

    return `${lines.join("\n")}\n`;
}

function renderLines(items, mapper) {
    return `${items.map(mapper).join("\n")}\n`;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    ensureDir(LOGS_DIR);
    ensureDir(AUDITS_DIR);

    const seoPair = pickPair("seo-audit_", args.baselineSeo, args.retestSeo);
    const speedPair = pickPair("speed-test_", args.baselineSpeed, args.retestSpeed);
    const wafPair = pickPair("waf-report_", args.baselineWaf, args.retestWaf);

    const baselineSeo = summarizeSeo(readJson(seoPair.baseline));
    const retestSeo = summarizeSeo(readJson(seoPair.retest));
    const baselineSpeed = summarizeSpeed(readJson(speedPair.baseline));
    const retestSpeed = summarizeSpeed(readJson(speedPair.retest));
    const baselineWaf = summarizeWaf(readJson(wafPair.baseline));
    const retestWaf = summarizeWaf(readJson(wafPair.retest));

    const metrics = {
        seoAuditBaseline: baselineSeo.score,
        seoAuditRetest: retestSeo.score,
        lhSeoBaseline: baselineSpeed.seoScore,
        lhSeoRetest: retestSpeed.seoScore,
        lhA11yBaseline: baselineSpeed.accessibilityScore,
        lhA11yRetest: retestSpeed.accessibilityScore,
        wafBypassedBaseline: baselineWaf.bypassedTotal,
        wafBypassedRetest: retestWaf.bypassedTotal,
        sensitiveFiles200Baseline: baselineWaf.sensitiveByPath.reduce((n, r) => n + r.http200Count, 0),
        sensitiveFiles200Retest: retestWaf.sensitiveByPath.reduce((n, r) => n + r.http200Count, 0),
        seoCriticalFailsRetest: retestSeo.criticalFails,
        seoRequiredFailedRetest: retestSeo.required.filter((r) => !r.pass).length,
        a11yCriticalFailsRetest: retestSpeed.a11yCriticalFails,
    };

    const gates = {
        waf: metrics.wafBypassedRetest <= THRESHOLDS.wafBypassMax,
        sensitiveFiles: metrics.sensitiveFiles200Retest <= THRESHOLDS.sensitiveFiles200Max,
        seo: metrics.seoAuditRetest >= THRESHOLDS.seoAuditMin
            && metrics.lhSeoRetest >= THRESHOLDS.lighthouseSeoMin
            && metrics.seoCriticalFailsRetest === 0
            && metrics.seoRequiredFailedRetest === 0,
        a11y: metrics.lhA11yRetest >= THRESHOLDS.lighthouseA11yMin
            && metrics.a11yCriticalFailsRetest === 0,
    };

    const overallDecision = Object.values(gates).every(Boolean) ? "GO" : "NO-GO";
    const generatedAt = new Date().toISOString();

    writeText(OUTPUT.seoChecks, renderLines(retestSeo.checks, (c) => `url=${retestSeo.url}|check_id=${toRuleId(c.label)}|status=${c.pass ? "PASS" : "FAIL"}|message=${c.detail}`));
    writeText(OUTPUT.seoCategory, renderLines(retestSeo.categories, (c) => `category=${c.category}|pass_count=${c.passCount}|fail_count=${c.failCount}|critical_fail_count=${c.criticalFailCount}`));
    writeText(OUTPUT.seoRequired, renderLines(retestSeo.required, (r) => `check=${r.label}|status=${r.pass ? "PASS" : "FAIL"}|detail=${r.detail}`));
    writeText(OUTPUT.seoDelta, [
        `metric=seo_audit_score|baseline=${metrics.seoAuditBaseline}|retest=${metrics.seoAuditRetest}|delta=${delta(metrics.seoAuditBaseline, metrics.seoAuditRetest)}`,
        `metric=lighthouse_seo|baseline=${metrics.lhSeoBaseline}|retest=${metrics.lhSeoRetest}|delta=${delta(metrics.lhSeoBaseline, metrics.lhSeoRetest)}`,
    ].join("\n") + "\n");

    writeText(OUTPUT.a11yRules, renderLines(retestSpeed.a11yRules, (r) => `rule_id=${r.ruleId}|impact=${r.impact}|selector=${r.selector}|status=${r.pass ? "PASS" : "FAIL"}|message=${r.label}`));
    writeText(OUTPUT.a11yKeyboard, [
        "scenario_id=checkout_main|step=tab_to_primary_cta|tab_order_ok=UNKNOWN|focus_visible=UNKNOWN|result=PENDING_MANUAL",
        "scenario_id=checkout_form|step=label_error_association|tab_order_ok=UNKNOWN|focus_visible=UNKNOWN|result=PENDING_MANUAL",
        "scenario_id=admin_orders|step=keyboard_filter_and_action|tab_order_ok=UNKNOWN|focus_visible=UNKNOWN|result=PENDING_MANUAL",
    ].join("\n") + "\n");
    writeText(OUTPUT.a11yDelta, `metric=lighthouse_accessibility|baseline=${metrics.lhA11yBaseline}|retest=${metrics.lhA11yRetest}|delta=${delta(metrics.lhA11yBaseline, metrics.lhA11yRetest)}\n`);

    writeText(OUTPUT.wafRequests, renderLines(retestWaf.requestRows, (r) => `rule_id=${r.ruleId}|action=${r.action}|path=${r.path}|method=${r.method}|status=${r.status}|category=${r.category}|payload=${r.payload}`));
    writeText(OUTPUT.wafCategory, renderLines(retestWaf.categories, (c) => `category=${c.category}|total=${c.total}|blocked=${c.blocked}|bypassed=${c.bypassed}`));
    writeText(OUTPUT.sensitiveFiles, renderLines(retestWaf.sensitiveByPath, (r) => `path=${r.path}|tested_count=${r.testedCount}|http_200_count=${r.http200Count}|statuses=${r.statuses.join(",") || "none"}`));

    writeText(OUTPUT.webAccess, [
        `source=waf_report|url=${retestWaf.url || "N/A"}|request_count=${retestWaf.requestRows.length}`,
        `blocked_count=${retestWaf.requestRows.filter((r) => r.action === "BLOCKED").length}|bypassed_count=${retestWaf.requestRows.filter((r) => r.action === "BYPASSED").length}`,
        ...retestWaf.sensitiveByPath.map((r) => `path=${r.path}|http_200_count=${r.http200Count}|statuses=${r.statuses.join(",") || "none"}`),
    ].join("\n") + "\n");

    const summary = {
        generatedAt,
        overallDecision,
        strictMode: args.strict,
        thresholds: THRESHOLDS,
        inputs: {
            seo: seoPair,
            speed: speedPair,
            waf: wafPair,
        },
        metrics,
        deltas: {
            seoAudit: delta(metrics.seoAuditBaseline, metrics.seoAuditRetest),
            lighthouseSeo: delta(metrics.lhSeoBaseline, metrics.lhSeoRetest),
            lighthouseA11y: delta(metrics.lhA11yBaseline, metrics.lhA11yRetest),
            wafBypassed: delta(metrics.wafBypassedBaseline, metrics.wafBypassedRetest),
            sensitiveFiles200: delta(metrics.sensitiveFiles200Baseline, metrics.sensitiveFiles200Retest),
        },
        gates,
        diagnostics: {
            seoRequiredFailed: retestSeo.required.filter((r) => !r.pass).map((r) => r.label),
            seoCriticalFailedCategories: retestSeo.categories.filter((c) => c.criticalFailCount > 0).map((c) => c.category),
            a11yCriticalFailedRules: retestSpeed.a11yRules.filter((r) => !r.pass && r.impact === "critical").map((r) => r.label),
            sensitiveFilesWith200: retestWaf.sensitiveByPath.filter((r) => r.http200Count > 0).map((r) => r.path),
        },
    };

    writeJson(OUTPUT.summaryJson, summary);
    writeText(OUTPUT.matrixMd, renderMatrix(summary));

    const failedGates = Object.entries(gates)
        .filter(([, ok]) => !ok)
        .map(([name]) => name);

    console.log(`[collect-retest-logs] summary: ${path.relative(ROOT, OUTPUT.summaryJson)}`);
    console.log(`[collect-retest-logs] matrix: ${path.relative(ROOT, OUTPUT.matrixMd)}`);
    console.log(`[collect-retest-logs] decision: ${overallDecision}`);

    if (failedGates.length > 0 && args.strict) {
        console.error(`[collect-retest-logs] strict mode failed gates: ${failedGates.join(", ")}`);
        process.exitCode = 2;
    }
}

main().catch((error) => {
    console.error(`[collect-retest-logs] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
});
