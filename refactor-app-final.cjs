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

function getDeclaredNames(ts, statement) {
  const names = [];

  if (
    (ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isEnumDeclaration(statement)) &&
    statement.name
  ) {
    names.push(statement.name.text);
  }

  if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) {
        names.push(declaration.name.text);
      }
    }
  }

  return names;
}

function isMovableRuntimeStatement(ts, statement) {
  if (ts.isFunctionDeclaration(statement)) {
    return statement.name?.text !== "App";
  }

  return (
    ts.isVariableStatement(statement) ||
    ts.isClassDeclaration(statement) ||
    ts.isEnumDeclaration(statement)
  );
}

function ensureExported(ts, statement) {
  const hasExport = statement.modifiers?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
  );

  if (hasExport) return statement;

  const modifiers = [
    ts.factory.createModifier(ts.SyntaxKind.ExportKeyword),
    ...(statement.modifiers ?? [])
  ];

  if (ts.isFunctionDeclaration(statement)) {
    return ts.factory.updateFunctionDeclaration(
      statement,
      modifiers,
      statement.asteriskToken,
      statement.name,
      statement.typeParameters,
      statement.parameters,
      statement.type,
      statement.body
    );
  }

  if (ts.isVariableStatement(statement)) {
    return ts.factory.updateVariableStatement(
      statement,
      modifiers,
      statement.declarationList
    );
  }

  if (ts.isClassDeclaration(statement)) {
    return ts.factory.updateClassDeclaration(
      statement,
      modifiers,
      statement.name,
      statement.typeParameters,
      statement.heritageClauses,
      statement.members
    );
  }

  if (ts.isEnumDeclaration(statement)) {
    return ts.factory.updateEnumDeclaration(
      statement,
      modifiers,
      statement.name,
      statement.members
    );
  }

  return statement;
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

function removeUnusedNamedImports(ts, sourceText) {
  const sourceFile = ts.createSourceFile(
    "App.tsx",
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  const edits = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;

    const clause = statement.importClause;
    if (!clause) continue;

    let keepDefault = Boolean(
      clause.name &&
      identifierUsedOutsideImports(ts, sourceFile, clause.name.text)
    );

    if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
      const keepNamespace = identifierUsedOutsideImports(
        ts,
        sourceFile,
        clause.namedBindings.name.text
      );

      if (!keepDefault && !keepNamespace) {
        edits.push({
          start: statement.getFullStart(),
          end: statement.end,
          text: ""
        });
      }

      continue;
    }

    const elements =
      clause.namedBindings && ts.isNamedImports(clause.namedBindings)
        ? clause.namedBindings.elements
        : [];

    const remaining = elements.filter((element) =>
      identifierUsedOutsideImports(ts, sourceFile, element.name.text)
    );

    if (!keepDefault && remaining.length === 0) {
      edits.push({
        start: statement.getFullStart(),
        end: statement.end,
        text: ""
      });
      continue;
    }

    if (
      keepDefault === Boolean(clause.name) &&
      remaining.length === elements.length
    ) {
      continue;
    }

    const moduleText = statement.moduleSpecifier.getText(sourceFile);
    const typePrefix = clause.isTypeOnly ? "type " : "";
    const defaultPart = keepDefault && clause.name ? clause.name.text : "";
    const namedPart = remaining.length
      ? `{ ${remaining
          .map((element) => {
            const imported = element.propertyName?.text;
            const local = element.name.text;
            const alias = imported ? `${imported} as ${local}` : local;
            return element.isTypeOnly ? `type ${alias}` : alias;
          })
          .join(", ")} }`
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

const appFunction = sourceFile.statements.find(
  (statement) =>
    ts.isFunctionDeclaration(statement) &&
    statement.name?.text === "App"
);

if (!appFunction) {
  fail("Function App tidak ditemukan.");
}

const movableStatements = sourceFile.statements.filter((statement) =>
  isMovableRuntimeStatement(ts, statement)
);

if (!movableStatements.length) {
  fail("Tidak ada deklarasi runtime top-level yang tersisa untuk dipindahkan.");
}

const outputPath = path.join(
  path.dirname(targetPath),
  "components",
  "app",
  "AppSections.tsx"
);

if (fs.existsSync(outputPath)) {
  fail(`File tujuan sudah ada: ${outputPath}`);
}

const movedNames = movableStatements.flatMap((statement) =>
  getDeclaredNames(ts, statement)
);

const importMap = collectImports(ts, sourceFile);
const usedIdentifiers = collectIdentifiers(ts, movableStatements);
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

const printedStatements = movableStatements.map((statement) =>
  printer.printNode(
    ts.EmitHint.Unspecified,
    ensureExported(ts, statement),
    sourceFile
  )
);

const outputText = [
  "/*",
  " * Generated from App.tsx by refactor-app-final.cjs.",
  " * This module temporarily contains the remaining legacy sections.",
  " * Split it further by feature after the application builds successfully.",
  " */",
  "",
  ...generatedImports,
  generatedImports.length ? "" : null,
  ...printedStatements.flatMap((text, index) =>
    index === printedStatements.length - 1 ? [text] : [text, ""]
  ),
  ""
]
  .filter((value) => value !== null)
  .join("\n");

let nextAppText = applyEdits(
  sourceText,
  movableStatements.map((statement) => ({
    start: statement.getFullStart(),
    end: statement.end,
    text: ""
  }))
);

let nextSourceFile = ts.createSourceFile(
  targetPath,
  nextAppText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

const namesNeededByApp = movedNames.filter((name) =>
  identifierUsedOutsideImports(ts, nextSourceFile, name)
);

if (namesNeededByApp.length) {
  const insertionOffset = findImportInsertionOffset(ts, nextSourceFile);
  const appSectionsImport =
    `\nimport { ${namesNeededByApp
      .sort((a, b) => a.localeCompare(b))
      .join(", ")} } from "./components/app/AppSections";`;

  nextAppText =
    nextAppText.slice(0, insertionOffset) +
    appSectionsImport +
    nextAppText.slice(insertionOffset);
}

nextAppText = removeUnusedNamedImports(ts, nextAppText);

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .replace("Z", "");

const backupPath = `${targetPath}.backup-final-${timestamp}`;
const manifestPath = path.join(
  path.dirname(outputPath),
  "AppSections.manifest.json"
);

const manifest = {
  source: targetPath,
  generatedAt: new Date().toISOString(),
  output: outputPath,
  movedDeclarationCount: movableStatements.length,
  movedNames,
  importedByApp: namesNeededByApp
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(backupPath, sourceText, "utf8");
fs.writeFileSync(outputPath, outputText, "utf8");
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
fs.writeFileSync(targetPath, nextAppText, "utf8");

console.log("\nRefactor final selesai:");
console.log(`- Backup          : ${backupPath}`);
console.log(`- App sections    : ${outputPath}`);
console.log(`- Manifest        : ${manifestPath}`);
console.log(`- App diperbarui  : ${targetPath}`);
console.log(`- Deklarasi pindah: ${movableStatements.length}`);
console.log(`- Nama diekspor   : ${movedNames.length}`);
console.log("\nWAJIB validasi:");
console.log("1. npm run build");
console.log("2. npm run lint");
console.log("3. git diff");
console.log("\nJika build gagal, restore backup atau kirim error build.");
