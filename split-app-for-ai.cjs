#!/usr/bin/env node
/*
  Split a very large TSX file into AI-readable source chunks.

  This script DOES NOT modify the original App.tsx and DOES NOT attempt to
  rewrite imports. It creates structured .tsx snapshots plus a manifest so
  AI tools can inspect one feature at a time without receiving 10k+ lines.

  Usage:
    node split-app-for-ai.cjs "src/App.tsx"
    node split-app-for-ai.cjs "src/App.tsx" "src/app-context"
*/

const fs = require("node:fs");
const path = require("node:path");

const inputArg = process.argv[2];
const outputArg = process.argv[3];

if (!inputArg) {
  console.error('Usage: node split-app-for-ai.cjs "path/to/App.tsx" [output-folder]');
  process.exit(1);
}

const inputPath = path.resolve(process.cwd(), inputArg);
if (!fs.existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(1);
}

const outputDir = path.resolve(
  process.cwd(),
  outputArg || path.join(path.dirname(inputArg), "app-context")
);

const source = fs.readFileSync(inputPath, "utf8").replace(/^\uFEFF/, "");
const lines = source.split(/\r?\n/);

const FEATURE_RULES = [
  { file: "00-bootstrap.tsx", title: "Imports, global declarations, shared types, constants", names: [] },
  { file: "01-app-shell.tsx", title: "Main App state, session, navigation, layout", names: ["App"] },
  { file: "02-navigation-notifications.tsx", title: "Navigation, top bar, bottom bar, notifications", names: [
    "MobileTopBar", "NotificationBadge", "AssistantContextSheet", "NotificationCenter",
    "greetingLabel", "MobileBottomNav", "AddActionSheet", "MobileNavButton",
    "mobileNavLabel", "appNavigationLabel"
  ] },
  { file: "03-auth.tsx", title: "Authentication UI and auth helpers", names: ["loadAuthScript", "AuthView", "GoogleLogo"] },
  { file: "04-dashboard.tsx", title: "Dashboard widgets and dashboard helpers", names: [
    "handleMoneyInput", "ExpenseDonut", "DashboardMetric", "MiniCashFlowChart",
    "SummaryCard", "quickAmount", "transactionQuickExamples"
  ] },
  { file: "05-transactions.tsx", title: "Manual transaction, receipt, detail, and history", names: [
    "ManualTransactionView", "TransactionDetailView", "ReceiptView", "DateFilterPicker", "HistoryView"
  ] },
  { file: "06-accounts-manage.tsx", title: "Pocket/account helpers, manage screen, schedules, and accounts", names: [
    "moneyValue", "accountTypeLabel", "accountSharedLabel", "accountOptionLabel", "accountTypeIcon",
    "loadPocketVisuals", "savePocketVisuals", "splitAccountNumberHolder", "getDefaultPocketLogo",
    "budgetTone", "SectionHeader", "ManageView", "scheduleTone", "SchedulesView", "AccountsView"
  ] },
  { file: "07-categories-budgets.tsx", title: "Categories and budgets", names: [
    "CategoriesView", "CategoryGroup", "LegacyCategoriesView", "BudgetsView", "LegacyBudgetsView"
  ] },
  { file: "08-reports.tsx", title: "Reports and report insights", names: [
    "monthYearLabel", "ReportsView", "ReportInsightCard", "CashFlowInsightList",
    "CategoryInsightList", "MonthlyInsightList"
  ] },
  { file: "09-assistant.tsx", title: "Finance assistant", names: ["AssistantView"] },
  { file: "10-social.tsx", title: "Social, friends, shared wallet, and relationship finance", names: [
    "SocialMetric", "SocialSkeleton", "SocialFriendPicker", "WalletMembersManageModal",
    "SocialFriendsPanel", "SocialHubView"
  ] },
  { file: "11-profile.tsx", title: "Profile", names: ["ProfileView"] },
  { file: "12-shared-ui-utils.tsx", title: "Shared fields, transaction list, states, QR scanner, and utilities", names: [
    "AiFieldBadge", "Field", "storedStringSet", "urlBase64ToUint8Array", "transactionDateKey",
    "transactionDateLabel", "groupTransactionsByDate", "transactionTitle", "transactionCategoryIcon",
    "transactionIconClass", "TransactionHistoryItem", "TransactionList", "LegacyTransactionList",
    "LoadingState", "DataErrorState", "EmptyState", "QrScanner"
  ] }
];

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function findTopLevelDeclarations(textLines) {
  const declarations = [];
  let braceDepth = 0;
  let inBlockComment = false;
  let inTemplate = false;
  let quote = null;

  for (let index = 0; index < textLines.length; index += 1) {
    const line = textLines[index];
    const trimmed = line.trimStart();

    if (braceDepth === 0) {
      let match = trimmed.match(/^function\s+([A-Za-z_$][\w$]*)\s*\(/);
      if (match) declarations.push({ name: match[1], start: index, kind: "function" });

      match = trimmed.match(/^(?:export\s+)?(?:type|interface|class|enum)\s+([A-Za-z_$][\w$]*)\b/);
      if (match) declarations.push({ name: match[1], start: index, kind: "type" });

      match = trimmed.match(/^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=/);
      if (match) declarations.push({ name: match[1], start: index, kind: "const" });
    }

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (inBlockComment) {
        if (char === "*" && next === "/") {
          inBlockComment = false;
          i += 1;
        }
        continue;
      }

      if (!quote && !inTemplate && char === "/" && next === "*") {
        inBlockComment = true;
        i += 1;
        continue;
      }
      if (!quote && !inTemplate && char === "/" && next === "/") break;

      if (quote) {
        if (char === "\\") {
          i += 1;
          continue;
        }
        if (char === quote) quote = null;
        continue;
      }

      if (inTemplate) {
        if (char === "\\") {
          i += 1;
          continue;
        }
        if (char === "`") inTemplate = false;
        continue;
      }

      if (char === '"' || char === "'") {
        quote = char;
        continue;
      }
      if (char === "`") {
        inTemplate = true;
        continue;
      }
      if (char === "{") braceDepth += 1;
      if (char === "}") braceDepth = Math.max(0, braceDepth - 1);
    }
  }

  for (let i = 0; i < declarations.length; i += 1) {
    declarations[i].end = (declarations[i + 1]?.start ?? textLines.length) - 1;
  }
  return declarations;
}

const declarations = findTopLevelDeclarations(lines);
const byName = new Map(declarations.map((item) => [item.name, item]));
const assignedNames = new Set(FEATURE_RULES.flatMap((rule) => rule.names));

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

const firstNamedFeature = FEATURE_RULES
  .flatMap((rule) => rule.names.map((name) => byName.get(name)))
  .filter(Boolean)
  .sort((a, b) => a.start - b.start)[0];

const manifest = {
  source: path.relative(process.cwd(), inputPath),
  generatedAt: new Date().toISOString(),
  sourceLines: lines.length,
  chunks: [],
  warnings: []
};

function writeChunk(fileName, title, ranges, declarationNames = []) {
  const normalized = ranges
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);

  if (!normalized.length) return;

  const body = normalized
    .map((range) => lines.slice(range.start, range.end + 1).join("\n"))
    .join("\n\n");

  const header = [
    "/**",
    ` * AI context chunk: ${title}`,
    ` * Generated from: ${path.basename(inputPath)}`,
    " * Read-only snapshot. Do not import this file into the application.",
    " */",
    ""
  ].join("\n");

  const safeName = sanitizeFileName(fileName);
  fs.writeFileSync(path.join(outputDir, safeName), header + body.trimEnd() + "\n", "utf8");
  manifest.chunks.push({
    file: safeName,
    title,
    declarations: declarationNames,
    sourceRanges: normalized.map((range) => ({ startLine: range.start + 1, endLine: range.end + 1 }))
  });
}

if (firstNamedFeature && firstNamedFeature.start > 0) {
  writeChunk(
    FEATURE_RULES[0].file,
    FEATURE_RULES[0].title,
    [{ start: 0, end: firstNamedFeature.start - 1 }],
    declarations.filter((item) => item.start < firstNamedFeature.start).map((item) => item.name)
  );
}

for (const rule of FEATURE_RULES.slice(1)) {
  const found = rule.names.map((name) => byName.get(name)).filter(Boolean);
  const missing = rule.names.filter((name) => !byName.has(name));
  if (missing.length) manifest.warnings.push(`Not found for ${rule.file}: ${missing.join(", ")}`);
  writeChunk(rule.file, rule.title, found, found.map((item) => item.name));
}

const unassigned = declarations.filter((item) => {
  if (firstNamedFeature && item.start < firstNamedFeature.start) return false;
  return !assignedNames.has(item.name);
});

if (unassigned.length) {
  writeChunk(
    "99-unclassified.tsx",
    "Declarations not yet assigned to a feature",
    unassigned,
    unassigned.map((item) => item.name)
  );
  manifest.warnings.push(`${unassigned.length} declarations were written to 99-unclassified.tsx`);
}

const readme = `# App.tsx AI Context\n\n` +
  `Generated from \`${path.basename(inputPath)}\`.\n\n` +
  `These files are **read-only snapshots for AI/code review**. They intentionally keep the original declarations and do not rewrite imports, so do not add them to the build.\n\n` +
  `## Recommended AI workflow\n\n` +
  `1. Open \`manifest.json\`.\n` +
  `2. Send only the relevant feature chunk to the AI.\n` +
  `3. Ask the AI to refactor that feature into a real component/hook.\n` +
  `4. Move one feature at a time and run TypeScript/tests after each move.\n\n` +
  `## Generated chunks\n\n` +
  manifest.chunks.map((chunk) => `- \`${chunk.file}\` — ${chunk.title}`).join("\n") + "\n";

fs.writeFileSync(path.join(outputDir, "README.md"), readme, "utf8");
fs.writeFileSync(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log(`Done. ${manifest.chunks.length} chunks created.`);
console.log(`Output: ${outputDir}`);
if (manifest.warnings.length) {
  console.log("Warnings:");
  manifest.warnings.forEach((warning) => console.log(`- ${warning}`));
}
