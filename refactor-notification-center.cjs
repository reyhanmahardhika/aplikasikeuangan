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

function applyEdits(text, edits) {
  let result = text;

  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  }

  return result;
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

function collectIdentifiers(ts, node) {
  const names = new Set();

  function visit(current) {
    if (ts.isIdentifier(current)) names.add(current.text);
    ts.forEachChild(current, visit);
  }

  visit(node);
  return names;
}

function relativeModule(sourceDirectory, outputDirectory, moduleName) {
  if (!moduleName.startsWith(".")) return moduleName;

  const absolute = path.resolve(sourceDirectory, moduleName);
  let relative = path.relative(outputDirectory, absolute).replace(/\\/g, "/");

  if (!relative.startsWith(".")) relative = `./${relative}`;
  return relative;
}

function buildImports(usedNames, importMap, sourceDirectory, outputDirectory) {
  const groups = new Map();

  for (const name of usedNames) {
    const item = importMap.get(name);
    if (!item) continue;

    const moduleName = relativeModule(
      sourceDirectory,
      outputDirectory,
      item.moduleName
    );
    const key = `${moduleName}|${item.typeOnly ? "type" : "value"}`;

    if (!groups.has(key)) {
      groups.set(key, {
        moduleName,
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
      const values = group.named
        .sort((a, b) => a.localName.localeCompare(b.localName))
        .map((item) =>
          item.importedName === item.localName
            ? item.localName
            : `${item.importedName} as ${item.localName}`
        );

      lines.push(`${prefix} { ${values.join(", ")} } from ${JSON.stringify(group.moduleName)};`);
    }
  }

  return lines;
}

function identifierUsedOutsideImports(ts, sourceFile, name) {
  let used = false;

  function visit(node) {
    if (used) return;
    if (ts.isImportDeclaration(node)) return;

    if (ts.isIdentifier(node) && node.text === name) {
      used = true;
      return;
    }

    ts.forEachChild(node, visit);
  }

  sourceFile.statements.forEach(visit);
  return used;
}

function removeNamedImports(ts, sourceText, sourceFile, names) {
  const edits = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;

    const clause = statement.importClause;
    if (!clause?.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue;

    const remaining = clause.namedBindings.elements.filter(
      (element) => !names.has(element.name.text)
    );

    if (remaining.length === clause.namedBindings.elements.length) continue;

    if (!remaining.length && !clause.name) {
      edits.push({
        start: statement.getFullStart(),
        end: statement.end,
        text: ""
      });
      continue;
    }

    const moduleText = statement.moduleSpecifier.getText(sourceFile);
    const defaultPart = clause.name?.text ?? "";
    const typePrefix = clause.isTypeOnly ? "type " : "";
    const namedPart = remaining.length
      ? `{ ${remaining.map((element) => {
          const imported = element.propertyName?.text;
          const local = element.name.text;
          const alias = imported ? `${imported} as ${local}` : local;
          return element.isTypeOnly ? `type ${alias}` : alias;
        }).join(", ")} }`
      : "";

    const body = [defaultPart, namedPart].filter(Boolean).join(", ");

    edits.push({
      start: statement.getStart(sourceFile),
      end: statement.end,
      text: `import ${typePrefix}${body} from ${moduleText};`
    });
  }

  return applyEdits(sourceText, edits);
}

function importInsertionOffset(ts, sourceFile) {
  let offset = 0;

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement)) {
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

const functionNode = sourceFile.statements.find(
  (statement) =>
    ts.isFunctionDeclaration(statement) &&
    statement.name?.text === "NotificationCenter"
);

if (!functionNode) {
  fail("Function NotificationCenter tidak ditemukan.");
}

const outputPath = path.join(
  path.dirname(targetPath),
  "components",
  "notifications",
  "NotificationCenter.tsx"
);

if (fs.existsSync(outputPath)) {
  fail(`File tujuan sudah ada: ${outputPath}`);
}

const importMap = collectImports(ts, sourceFile);
const usedIdentifiers = collectIdentifiers(ts, functionNode);
const generatedImports = buildImports(
  usedIdentifiers,
  importMap,
  path.dirname(targetPath),
  path.dirname(outputPath)
);

const printer = ts.createPrinter({
  newLine: ts.NewLineKind.LineFeed,
  removeComments: false
});

const exportedNode = ts.factory.updateFunctionDeclaration(
  functionNode,
  [
    ts.factory.createModifier(ts.SyntaxKind.ExportKeyword),
    ...(functionNode.modifiers ?? [])
  ],
  functionNode.asteriskToken,
  functionNode.name,
  functionNode.typeParameters,
  functionNode.parameters,
  functionNode.type,
  functionNode.body
);

const componentText = printer.printNode(
  ts.EmitHint.Unspecified,
  exportedNode,
  sourceFile
);

const outputText = [
  "/* Generated from App.tsx. Review before commit. */",
  "",
  ...generatedImports,
  generatedImports.length ? "" : null,
  componentText,
  ""
].filter((value) => value !== null).join("\n");

let nextAppText = applyEdits(sourceText, [{
  start: functionNode.getFullStart(),
  end: functionNode.end,
  text: ""
}]);

let nextSourceFile = ts.createSourceFile(
  targetPath,
  nextAppText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

const removableImports = new Set();

for (const identifier of usedIdentifiers) {
  if (
    importMap.has(identifier) &&
    !identifierUsedOutsideImports(ts, nextSourceFile, identifier)
  ) {
    removableImports.add(identifier);
  }
}

nextAppText = removeNamedImports(
  ts,
  nextAppText,
  nextSourceFile,
  removableImports
);

nextSourceFile = ts.createSourceFile(
  targetPath,
  nextAppText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

const offset = importInsertionOffset(ts, nextSourceFile);
const componentImport =
  '\nimport { NotificationCenter } from "./components/notifications/NotificationCenter";';

nextAppText =
  nextAppText.slice(0, offset) +
  componentImport +
  nextAppText.slice(offset);

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .replace("Z", "");

const backupPath = `${targetPath}.backup-notification-center-${timestamp}`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(backupPath, sourceText, "utf8");
fs.writeFileSync(outputPath, outputText, "utf8");
fs.writeFileSync(targetPath, nextAppText, "utf8");

console.log("\nRefactor NotificationCenter selesai:");
console.log(`- Backup        : ${backupPath}`);
console.log(`- Component     : ${outputPath}`);
console.log(`- App diperbarui: ${targetPath}`);
console.log("\nValidasi:");
console.log("1. npm run build");
console.log("2. npm run lint");
console.log("3. git diff");
