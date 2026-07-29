#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

function fail(message) {
  console.error(`\n[ERROR] ${message}`);
  process.exit(1);
}

function loadTypeScript(targetPath) {
  const candidates = [
    "typescript",
    path.join(process.cwd(), "node_modules", "typescript"),
    path.join(path.dirname(targetPath), "node_modules", "typescript")
  ];

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {}
  }

  fail('Package "typescript" tidak ditemukan. Jalankan "npm install -D typescript".');
}

function isTargetVariableStatement(ts, statement, names) {
  if (!ts.isVariableStatement(statement)) return false;

  return statement.declarationList.declarations.some(
    (declaration) =>
      ts.isIdentifier(declaration.name) &&
      names.includes(declaration.name.text)
  );
}

function collectIdentifiers(ts, nodes) {
  const names = new Set();

  const visit = (node) => {
    if (ts.isIdentifier(node)) names.add(node.text);
    ts.forEachChild(node, visit);
  };

  nodes.forEach(visit);
  return names;
}

function collectImports(ts, sourceFile) {
  const imports = new Map();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;

    const moduleName = statement.moduleSpecifier.text;
    const clause = statement.importClause;
    if (!clause) continue;

    if (clause.name) {
      imports.set(clause.name.text, {
        moduleName,
        kind: "default",
        importedName: "default",
        localName: clause.name.text,
        typeOnly: Boolean(clause.isTypeOnly)
      });
    }

    const bindings = clause.namedBindings;
    if (!bindings) continue;

    if (ts.isNamespaceImport(bindings)) {
      imports.set(bindings.name.text, {
        moduleName,
        kind: "namespace",
        importedName: "*",
        localName: bindings.name.text,
        typeOnly: Boolean(clause.isTypeOnly)
      });
      continue;
    }

    for (const element of bindings.elements) {
      imports.set(element.name.text, {
        moduleName,
        kind: "named",
        importedName: element.propertyName?.text ?? element.name.text,
        localName: element.name.text,
        typeOnly: Boolean(clause.isTypeOnly || element.isTypeOnly)
      });
    }
  }

  return imports;
}

function buildImports(usedNames, importMap) {
  const groups = new Map();

  for (const name of usedNames) {
    const item = importMap.get(name);
    if (!item) continue;

    const key = `${item.moduleName}|${item.typeOnly ? "type" : "value"}`;

    if (!groups.has(key)) {
      groups.set(key, {
        moduleName: item.moduleName,
        typeOnly: item.typeOnly,
        defaults: [],
        namespaces: [],
        named: []
      });
    }

    const group = groups.get(key);

    if (item.kind === "default") group.defaults.push(item);
    else if (item.kind === "namespace") group.namespaces.push(item);
    else group.named.push(item);
  }

  const lines = [];

  for (const group of groups.values()) {
    const prefix = group.typeOnly ? "import type" : "import";

    for (const item of group.defaults) {
      lines.push(`${prefix} ${item.localName} from ${JSON.stringify(group.moduleName)};`);
    }

    for (const item of group.namespaces) {
      lines.push(`${prefix} * as ${item.localName} from ${JSON.stringify(group.moduleName)};`);
    }

    if (group.named.length) {
      const specifiers = group.named
        .sort((a, b) => a.localName.localeCompare(b.localName))
        .map((item) =>
          item.importedName === item.localName
            ? item.localName
            : `${item.importedName} as ${item.localName}`
        );

      lines.push(`${prefix} { ${specifiers.join(", ")} } from ${JSON.stringify(group.moduleName)};`);
    }
  }

  return lines;
}

function removeNamedImports(ts, sourceText, sourceFile, namesToRemove) {
  const edits = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;

    const clause = statement.importClause;
    if (!clause?.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue;

    const remaining = clause.namedBindings.elements.filter(
      (element) => !namesToRemove.has(element.name.text)
    );

    if (remaining.length === clause.namedBindings.elements.length) continue;

    if (
      remaining.length === 0 &&
      !clause.name
    ) {
      edits.push({
        start: statement.getFullStart(),
        end: statement.end,
        text: ""
      });
      continue;
    }

    const moduleText = statement.moduleSpecifier.getText(sourceFile);
    const defaultPart = clause.name ? clause.name.text : "";
    const typePrefix = clause.isTypeOnly ? "type " : "";

    let importBody = defaultPart;

    if (remaining.length) {
      const namedText = remaining
        .map((element) => {
          const imported = element.propertyName?.text;
          const local = element.name.text;
          const specifier = imported ? `${imported} as ${local}` : local;
          return element.isTypeOnly ? `type ${specifier}` : specifier;
        })
        .join(", ");

      importBody = importBody
        ? `${importBody}, { ${namedText} }`
        : `{ ${namedText} }`;
    }

    edits.push({
      start: statement.getStart(sourceFile),
      end: statement.end,
      text: `import ${typePrefix}${importBody} from ${moduleText};`
    });
  }

  return applyEdits(sourceText, edits);
}

function applyEdits(text, edits) {
  let result = text;

  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    result =
      result.slice(0, edit.start) +
      edit.text +
      result.slice(edit.end);
  }

  return result;
}

function findImportInsertionOffset(ts, sourceFile) {
  let offset = 0;

  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) ||
      ts.isImportEqualsDeclaration(statement)
    ) {
      offset = statement.end;
      continue;
    }

    break;
  }

  return offset;
}

const inputArg = process.argv[2] || path.join("src", "App.tsx");
const targetPath = path.resolve(process.cwd(), inputArg);

if (!fs.existsSync(targetPath)) {
  fail(`File tidak ditemukan: ${targetPath}`);
}

const ts = loadTypeScript(targetPath);
const sourceText = fs.readFileSync(targetPath, "utf8");
const sourceFile = ts.createSourceFile(
  targetPath,
  sourceText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

const targetNames = ["navigation", "mobileNavigation"];
const targetStatements = sourceFile.statements.filter((statement) =>
  isTargetVariableStatement(ts, statement, targetNames)
);

if (targetStatements.length !== 2) {
  fail(
    `Deklarasi navigation/mobileNavigation tidak lengkap. Ditemukan ${targetStatements.length} dari 2.`
  );
}

const outputPath = path.join(
  path.dirname(targetPath),
  "config",
  "navigation.ts"
);

if (fs.existsSync(outputPath)) {
  fail(`File tujuan sudah ada: ${outputPath}`);
}

const importMap = collectImports(ts, sourceFile);
const usedIdentifiers = collectIdentifiers(ts, targetStatements);

const generatedImports = buildImports(usedIdentifiers, importMap);

if (!generatedImports.some((line) => line.includes('"../types/app"'))) {
  generatedImports.push('import type { View } from "../types/app";');
}

const printer = ts.createPrinter({
  newLine: ts.NewLineKind.LineFeed,
  removeComments: false
});

const printedStatements = targetStatements.map((statement) => {
  const declarationList = statement.declarationList;
  const exportedStatement = ts.factory.updateVariableStatement(
    statement,
    [
      ts.factory.createModifier(ts.SyntaxKind.ExportKeyword),
      ...(statement.modifiers ?? [])
    ],
    declarationList
  );

  return printer.printNode(
    ts.EmitHint.Unspecified,
    exportedStatement,
    sourceFile
  );
});

const outputText = [
  "/* Generated from App.tsx. Review before commit. */",
  "",
  ...generatedImports,
  "",
  ...printedStatements.flatMap((text, index) =>
    index === printedStatements.length - 1 ? [text] : [text, ""]
  ),
  ""
].join("\n");

let nextAppText = sourceText;

nextAppText = applyEdits(
  nextAppText,
  targetStatements.map((statement) => ({
    start: statement.getFullStart(),
    end: statement.end,
    text: ""
  }))
);

const iconNames = new Set();

for (const name of usedIdentifiers) {
  const imported = importMap.get(name);
  if (imported?.moduleName === "lucide-react") {
    iconNames.add(name);
  }
}

const interimSourceFile = ts.createSourceFile(
  targetPath,
  nextAppText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

nextAppText = removeNamedImports(
  ts,
  nextAppText,
  interimSourceFile,
  iconNames
);

const afterCleanupSourceFile = ts.createSourceFile(
  targetPath,
  nextAppText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

const insertionOffset = findImportInsertionOffset(
  ts,
  afterCleanupSourceFile
);

const navigationImport =
  '\nimport { mobileNavigation, navigation } from "./config/navigation";';

nextAppText =
  nextAppText.slice(0, insertionOffset) +
  navigationImport +
  nextAppText.slice(insertionOffset);

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .replace("Z", "");

const backupPath = `${targetPath}.backup-navigation-${timestamp}`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(backupPath, sourceText, "utf8");
fs.writeFileSync(outputPath, outputText, "utf8");
fs.writeFileSync(targetPath, nextAppText, "utf8");

console.log("\nRefactor navigasi selesai:");
console.log(`- Backup         : ${backupPath}`);
console.log(`- Config navigasi: ${outputPath}`);
console.log(`- App diperbarui : ${targetPath}`);
console.log("\nValidasi:");
console.log("1. npm run build");
console.log("2. npm run lint");
console.log("3. git diff");
