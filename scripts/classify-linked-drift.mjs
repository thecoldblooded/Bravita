import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function normalizeEol(text) {
    return text.replace(/\r\n?/g, "\n");
}

function stripComments(text) {
    return text.replace(/^\s*--.*$/gm, "");
}

function normalizeName(rawName) {
    return rawName.replace(/"/g, "").replace(/\s+/g, "").toLowerCase();
}

function canonicalizeBlock(sqlBlock) {
    return normalizeEol(sqlBlock)
        .replace(/"/g, "")
        .replace(/\$[A-Za-z0-9_]*\$/g, "$$")
        .replace(/\s*::\s*/g, "::")
        .replace(/\s*;\s*/g, ";")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function extractFunctionBlocks(sqlText) {
    const regex = /CREATE\s+OR\s+REPLACE\s+FUNCTION[\s\S]*?AS\s+(\$[A-Za-z0-9_]*\$|\$\$)[\s\S]*?\1\s*;/gim;
    const blocks = [];

    let match;
    while ((match = regex.exec(sqlText)) !== null) {
        const sql = match[0];
        const nameMatch = sql.match(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+([^\(]+)\(/i);
        const name = nameMatch ? normalizeName(nameMatch[1].trim()) : "<unknown>";
        blocks.push({ name, sql });
    }

    return blocks;
}

function removeAllowedPreamble(sqlText) {
    return sqlText.replace(/^\s*set\s+check_function_bodies\s*=\s*off\s*;\s*/i, "");
}

function removeFunctionBlocks(sqlText) {
    return sqlText.replace(/CREATE\s+OR\s+REPLACE\s+FUNCTION[\s\S]*?AS\s+(\$[A-Za-z0-9_]*\$|\$\$)[\s\S]*?\1\s*;/gim, "");
}

function hasNonFunctionExecutableSql(sqlText) {
    const withoutPreamble = removeAllowedPreamble(sqlText);
    const withoutFunctions = removeFunctionBlocks(withoutPreamble);
    const cleaned = stripComments(withoutFunctions).replace(/\s+/g, "").trim();
    return cleaned.length > 0;
}

export function classifyLinkedDrift({ driftSql, remoteDumpSql = "" }) {
    const normalizedDrift = normalizeEol(driftSql);
    const normalizedRemote = normalizeEol(remoteDumpSql);

    const result = {
        actionable: false,
        classification: "none",
        summary: "",
        driftFunctionCount: 0,
        remoteFunctionCount: 0,
        driftFunctionNames: [],
        unmatchedFunctionNames: [],
        hasNonFunctionExecutableSql: false,
    };

    const driftWithoutPreamble = removeAllowedPreamble(normalizedDrift);
    const driftContentWithoutComments = stripComments(driftWithoutPreamble).trim();

    if (driftContentWithoutComments.length === 0) {
        result.classification = "no_drift";
        result.summary = "drift.sql boş veya yalnızca yorum satırları içeriyor.";
        return result;
    }

    result.hasNonFunctionExecutableSql = hasNonFunctionExecutableSql(normalizedDrift);

    const driftBlocks = extractFunctionBlocks(driftWithoutPreamble);
    const remoteBlocks = extractFunctionBlocks(normalizedRemote);

    result.driftFunctionCount = driftBlocks.length;
    result.remoteFunctionCount = remoteBlocks.length;
    result.driftFunctionNames = driftBlocks.map((block) => block.name);

    if (result.hasNonFunctionExecutableSql) {
        result.actionable = true;
        result.classification = "executable_non_function_sql";
        result.summary = "drift.sql fonksiyon dışı çalıştırılabilir SQL içeriyor.";
        return result;
    }

    if (driftBlocks.length === 0) {
        result.actionable = true;
        result.classification = "unparsed_executable_sql";
        result.summary = "drift.sql çalıştırılabilir içerik barındırıyor ancak fonksiyon bloğu olarak ayrıştırılamadı.";
        return result;
    }

    if (remoteBlocks.length === 0) {
        result.actionable = true;
        result.classification = "missing_remote_dump_context";
        result.summary = "remote dump içeriğinde fonksiyon bloğu bulunamadı; güvenli sınıflandırma yapılamadı.";
        return result;
    }

    const remoteCanonicalSet = new Set(remoteBlocks.map((block) => canonicalizeBlock(block.sql)));
    const unmatched = driftBlocks.filter((block) => !remoteCanonicalSet.has(canonicalizeBlock(block.sql)));

    result.unmatchedFunctionNames = unmatched.map((block) => block.name);

    if (unmatched.length === 0) {
        result.actionable = false;
        result.classification = "cosmetic_function_replay";
        result.summary = "drift.sql sadece remote dump ile kanonik eşleşen CREATE OR REPLACE FUNCTION blokları içeriyor.";
        return result;
    }

    result.actionable = true;
    result.classification = "function_body_or_signature_drift";
    result.summary = "drift.sql içindeki bazı fonksiyon blokları remote dump ile kanonik eşleşmedi.";
    return result;
}

function formatReport(result, driftPath, remotePath) {
    const lines = [];
    lines.push("# Linked Drift Classification Report");
    lines.push("");
    lines.push(`drift_path=${driftPath}`);
    lines.push(`remote_dump_path=${remotePath}`);
    lines.push(`classification=${result.classification}`);
    lines.push(`actionable=${result.actionable}`);
    lines.push(`has_non_function_executable_sql=${result.hasNonFunctionExecutableSql}`);
    lines.push(`drift_function_count=${result.driftFunctionCount}`);
    lines.push(`remote_function_count=${result.remoteFunctionCount}`);
    lines.push(`drift_functions=${result.driftFunctionNames.join(",")}`);
    lines.push(`unmatched_functions=${result.unmatchedFunctionNames.join(",")}`);
    lines.push("");
    lines.push(`summary=${result.summary}`);
    return `${lines.join("\n")}\n`;
}

function runCli() {
    const driftArg = process.argv[2] ?? "drift.sql";
    const remoteArg = process.argv[3] ?? "_reports/sql/remote_public_ci_dump.sql";
    const reportArg = process.argv[4] ?? "_reports/sql/drift_classification_report.txt";

    const driftPath = path.resolve(process.cwd(), driftArg);
    const remotePath = path.resolve(process.cwd(), remoteArg);
    const reportPath = path.resolve(process.cwd(), reportArg);

    if (!fs.existsSync(driftPath)) {
        console.error(`drift.sql not found: ${driftPath}`);
        process.exit(2);
    }

    if (!fs.existsSync(remotePath)) {
        console.error(`remote dump not found: ${remotePath}`);
        process.exit(2);
    }

    const driftSql = fs.readFileSync(driftPath, "utf8");
    const remoteDumpSql = fs.readFileSync(remotePath, "utf8");

    const result = classifyLinkedDrift({ driftSql, remoteDumpSql });
    const report = formatReport(result, driftPath, remotePath);

    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, report, "utf8");

    console.log(report.trimEnd());

    if (result.actionable) {
        process.exit(1);
    }

    process.exit(0);
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (currentFilePath === invokedPath) {
    try {
        runCli();
    } catch (error) {
        console.error("Failed to classify linked drift:", error);
        process.exit(2);
    }
}
