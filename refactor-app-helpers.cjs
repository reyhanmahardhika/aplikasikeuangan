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

function buildImports(usedNames, importMap, targetDirectory, sourceDirectory) {
  const groups = new Map();

  for (const name of usedNames) {
    const item = importMap.get(name);
    if (!item) continue;

    let moduleName = item.moduleName;

    if (moduleName.startsWith(".")) {
      const absoluteDependency = path.resolve(sourceDirectory, moduleName);
      let relativeDependency = path.relative(targetDirectory, absoluteDependency).replace(/\\/g, "/");
      if (!relativeDependency.startsWith(".")) relativeDependency = `./${relativeDependency}`;
      moduleName = relativeDependency;
    }

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

function applyEdits(text, edits) {
  let result = text;

  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  }

  return result;
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

function findImportInsertionOffset(ts, sourceFile) {
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

const helperNames = [
  "successMessageFor",
  "moneyInputValue",
  "dateFilterIso",
  "currentMonthDateBounds"
];

const helperFunctions = sourceFile.statements.filter(
  (statement) =>
    ts.isFunctionDeclaration(statement) &&
    statement.name &&
    helperNames.includes(statement.name.text)
);

const foundNames = helperFunctions.map((statement) => statement.name.text);
const missingNames = helperNames.filter((name) => !foundNames.includes(name));

if (missingNames.length) {
  fail(`Helper tidak ditemukan: ${missingNames.join(", ")}`);
}

const outputPath = path.join(path.dirname(targetPath), "lib", "appHelpers.ts");

if (fs.existsSync(outputPath)) {
  fail(`File tujuan sudah ada: ${outputPath}`);
}

const importMap = collectImports(ts, sourceFile);
const usedIdentifiers = collectIdentifiers(ts, helperFunctions);
const outputDirectory = path.dirname(outputPath);
const sourceDirectory = path.dirname(targetPath);

const generatedImports = buildImports(
  usedIdentifiers,
  importMap,
  outputDirectory,
  sourceDirectory
);

const printer = ts.createPrinter({
  newLine: ts.NewLineKind.LineFeed,
  removeComments: false
});

const printedHelpers = helperFunctions.map((statement) => {
  const exported = ts.factory.updateFunctionDeclaration(
    statement,
    [
      ts.factory.createModifier(ts.SyntaxKind.ExportKeyword),
      ...(statement.modifiers ?? [])
    ],
    statement.asteriskToken,
    statement.name,
    statement.typeParameters,
    statement.parameters,
    statement.type,
    statement.body
  );

  return printer.printNode(
    ts.EmitHint.Unspecified,
    exported,
    sourceFile
  );
});

const outputText = [
  "/* Generated from App.tsx. Review before commit. */",
  "",
  ...generatedImports,
  generatedImports.length ? "" : null,
  ...printedHelpers.flatMap((text, index) =>
    index === printedHelpers.length - 1 ? [text] : [text, ""]
  ),
  ""
]
  .filter((item) => item !== null)
  .join("\n");

let nextAppText = applyEdits(
  sourceText,
  helperFunctions.map((statement) => ({
    start: statement.getFullStart(),
    end: statement.end,
    text: ""
  }))
);

const dependencyNames = new Set();

for (const name of usedIdentifiers) {
  const imported = importMap.get(name);
  if (imported) dependencyNames.add(name);
}

const interimSourceFile = ts.createSourceFile(
  targetPath,
  nextAppText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

for (const dependencyName of [...dependencyNames]) {
  let usedOutsideImports = false;

  function visit(node) {
    if (usedOutsideImports) return;
    if (ts.isImportDeclaration(node)) return;

    if (ts.isIdentifier(node) && node.text === dependencyName) {
      usedOutsideImports = true;
      return;
    }

    ts.forEachChild(node, visit);
  }

  interimSourceFile.statements.forEach(visit);

  if (usedOutsideImports) {
    dependencyNames.delete(dependencyName);
  }
}

nextAppText = removeNamedImports(
  ts,
  nextAppText,
  interimSourceFile,
  dependencyNames
);

const cleanedSourceFile = ts.createSourceFile(
  targetPath,
  nextAppText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

const insertionOffset = findImportInsertionOffset(ts, cleanedSourceFile);
const helperImport =
  '\nimport { currentMonthDateBounds, dateFilterIso, moneyInputValue, successMessageFor } from "./lib/appHelpers";';

nextAppText =
  nextAppText.slice(0, insertionOffset) +
  helperImport +
  nextAppText.slice(insertionOffset);

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .replace("Z", "");

const backupPath = `${targetPath}.backup-helpers-${timestamp}`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(backupPath, sourceText, "utf8");
fs.writeFileSync(outputPath, outputText, "utf8");
fs.writeFileSync(targetPath, nextAppText, "utf8");

console.log("\nRefactor helper selesai:");
console.log(`- Backup       : ${backupPath}`);
console.log(`- Helper file  : ${outputPath}`);
console.log(`- App diperbarui: ${targetPath}`);
console.log(`- Helper pindah: ${helperNames.length}`);
console.log("\nValidasi:");
console.log("1. npm run build");
console.log("2. npm run lint");
console.log("3. git diff");
