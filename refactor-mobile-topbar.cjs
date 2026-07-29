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

function collectIdentifiers(ts, nodes) {
  const names = new Set();

  function visit(node) {
    if (ts.isIdentifier(node)) names.add(node.text);
    ts.forEachChild(node, visit);
  }

  nodes.forEach(visit);
  return names;
}

function toRelativeModule(sourceDirectory, outputDirectory, moduleName) {
  if (!moduleName.startsWith(".")) return moduleName;

  const absoluteDependency = path.resolve(sourceDirectory, moduleName);
  let relativeDependency = path
    .relative(outputDirectory, absoluteDependency)
    .replace(/\\/g, "/");

  if (!relativeDependency.startsWith(".")) {
    relativeDependency = `./${relativeDependency}`;
  }

  return relativeDependency;
}

function buildImports(usedNames, importMap, sourceDirectory, outputDirectory) {
  const groups = new Map();

  for (const name of usedNames) {
    const item = importMap.get(name);
    if (!item) continue;

    const moduleName = toRelativeModule(
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
      lines.push(
        `${prefix} ${item.localName} from ${JSON.stringify(group.moduleName)};`
      );
    }

    for (const item of group.namespaces) {
      lines.push(
        `${prefix} * as ${item.localName} from ${JSON.stringify(group.moduleName)};`
      );
    }

    if (group.named.length) {
      const specifiers = group.named
        .sort((a, b) => a.localName.localeCompare(b.localName))
        .map((item) =>
          item.importedName === item.localName
            ? item.localName
            : `${item.importedName} as ${item.localName}`
        );

      lines.push(
        `${prefix} { ${specifiers.join(", ")} } from ${JSON.stringify(group.moduleName)};`
      );
    }
  }

  return lines;
}

function removeNamedImports(ts, sourceText, sourceFile, namesToRemove) {
  const edits = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;

    const clause = statement.importClause;
    if (!clause?.namedBindings || !ts.isNamedImports(clause.namedBindings)) {
      continue;
    }

    const remaining = clause.namedBindings.elements.filter(
      (element) => !namesToRemove.has(element.name.text)
    );

    if (remaining.length === clause.namedBindings.elements.length) continue;

    if (remaining.length === 0 && !clause.name) {
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

function isIdentifierUsedOutsideImports(ts, sourceFile, identifierName) {
  let used = false;

  function visit(node) {
    if (used) return;
    if (ts.isImportDeclaration(node)) return;

    if (ts.isIdentifier(node) && node.text === identifierName) {
      used = true;
      return;
    }

    ts.forEachChild(node, visit);
  }

  sourceFile.statements.forEach(visit);
  return used;
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

const functionNames = [
  "MobileTopBar",
  "NotificationBadge",
  "greetingLabel"
];

const functionMap = new Map();

for (const statement of sourceFile.statements) {
  if (
    ts.isFunctionDeclaration(statement) &&
    statement.name &&
    functionNames.includes(statement.name.text)
  ) {
    functionMap.set(statement.name.text, statement);
  }
}

const missing = functionNames.filter((name) => !functionMap.has(name));

if (missing.length) {
  fail(`Function tidak ditemukan: ${missing.join(", ")}`);
}

const outputPath = path.join(
  path.dirname(targetPath),
  "components",
  "layout",
  "MobileTopBar.tsx"
);

if (fs.existsSync(outputPath)) {
  fail(`File tujuan sudah ada: ${outputPath}`);
}

const selectedFunctions = functionNames.map((name) => functionMap.get(name));
const importMap = collectImports(ts, sourceFile);
const usedIdentifiers = collectIdentifiers(ts, selectedFunctions);

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

const printedFunctions = selectedFunctions.map((statement) => {
  const shouldExport =
    statement.name.text === "MobileTopBar" ||
    statement.name.text === "NotificationBadge";

  const modifiers = shouldExport
    ? [
        ts.factory.createModifier(ts.SyntaxKind.ExportKeyword),
        ...(statement.modifiers ?? [])
      ]
    : statement.modifiers;

  const updated = ts.factory.updateFunctionDeclaration(
    statement,
    modifiers,
    statement.asteriskToken,
    statement.name,
    statement.typeParameters,
    statement.parameters,
    statement.type,
    statement.body
  );

  return printer.printNode(
    ts.EmitHint.Unspecified,
    updated,
    sourceFile
  );
});

const outputText = [
  "/* Generated from App.tsx. Review before commit. */",
  "",
  ...generatedImports,
  generatedImports.length ? "" : null,
  ...printedFunctions.flatMap((text, index) =>
    index === printedFunctions.length - 1 ? [text] : [text, ""]
  ),
  ""
]
  .filter((item) => item !== null)
  .join("\n");

let nextAppText = applyEdits(
  sourceText,
  selectedFunctions.map((statement) => ({
    start: statement.getFullStart(),
    end: statement.end,
    text: ""
  }))
);

let interimSource = ts.createSourceFile(
  targetPath,
  nextAppText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

const removableImports = new Set();

for (const identifierName of usedIdentifiers) {
  if (
    importMap.has(identifierName) &&
    !isIdentifierUsedOutsideImports(ts, interimSource, identifierName)
  ) {
    removableImports.add(identifierName);
  }
}

nextAppText = removeNamedImports(
  ts,
  nextAppText,
  interimSource,
  removableImports
);

interimSource = ts.createSourceFile(
  targetPath,
  nextAppText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

const insertionOffset = findImportInsertionOffset(ts, interimSource);
const componentImport =
  '\nimport { MobileTopBar, NotificationBadge } from "./components/layout/MobileTopBar";';

nextAppText =
  nextAppText.slice(0, insertionOffset) +
  componentImport +
  nextAppText.slice(insertionOffset);

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .replace("Z", "");

const backupPath = `${targetPath}.backup-mobile-topbar-${timestamp}`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(backupPath, sourceText, "utf8");
fs.writeFileSync(outputPath, outputText, "utf8");
fs.writeFileSync(targetPath, nextAppText, "utf8");

console.log("\nRefactor MobileTopBar selesai:");
console.log(`- Backup        : ${backupPath}`);
console.log(`- Component     : ${outputPath}`);
console.log(`- App diperbarui: ${targetPath}`);
console.log("- Dipindahkan   : MobileTopBar, NotificationBadge, greetingLabel");
console.log("\nValidasi:");
console.log("1. npm run build");
console.log("2. npm run lint");
console.log("3. git diff");
