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
    path.join(path.dirname(targetPath), "node_modules", "typescript"),
    path.join(process.cwd(), "node_modules", "typescript")
  ];

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // Try the next location.
    }
  }

  fail(
    'Package "typescript" tidak ditemukan. Jalankan "npm install -D typescript", lalu ulangi perintah.'
  );
}

function ensureExported(ts, node) {
  const hasExport = node.modifiers?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
  );

  if (hasExport) return node;

  const modifiers = [
    ts.factory.createModifier(ts.SyntaxKind.ExportKeyword),
    ...(node.modifiers ?? [])
  ];

  if (ts.isTypeAliasDeclaration(node)) {
    return ts.factory.updateTypeAliasDeclaration(
      node,
      modifiers,
      node.name,
      node.typeParameters,
      node.type
    );
  }

  return ts.factory.updateInterfaceDeclaration(
    node,
    modifiers,
    node.name,
    node.typeParameters,
    node.heritageClauses,
    node.members
  );
}

function collectImportedIdentifiers(ts, sourceFile) {
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
        localName: clause.name.text
      });
    }

    const bindings = clause.namedBindings;
    if (!bindings) continue;

    if (ts.isNamespaceImport(bindings)) {
      imports.set(bindings.name.text, {
        moduleName,
        kind: "namespace",
        importedName: "*",
        localName: bindings.name.text
      });
      continue;
    }

    for (const element of bindings.elements) {
      imports.set(element.name.text, {
        moduleName,
        kind: "named",
        importedName: element.propertyName?.text ?? element.name.text,
        localName: element.name.text
      });
    }
  }

  return imports;
}

function collectUsedImportedNames(ts, nodes, importMap) {
  const used = new Set();

  const visit = (node) => {
    if (ts.isIdentifier(node) && importMap.has(node.text)) {
      used.add(node.text);
    }
    ts.forEachChild(node, visit);
  };

  nodes.forEach(visit);
  return used;
}

function buildTypeImports(usedNames, importMap) {
  const grouped = new Map();

  for (const localName of usedNames) {
    const item = importMap.get(localName);
    if (!item) continue;

    if (!grouped.has(item.moduleName)) {
      grouped.set(item.moduleName, {
        defaults: [],
        namespaces: [],
        named: []
      });
    }

    const group = grouped.get(item.moduleName);

    if (item.kind === "default") {
      group.defaults.push(item);
    } else if (item.kind === "namespace") {
      group.namespaces.push(item);
    } else {
      group.named.push(item);
    }
  }

  const lines = [];

  for (const [moduleName, group] of grouped) {
    for (const item of group.defaults) {
      lines.push(`import type ${item.localName} from ${JSON.stringify(moduleName)};`);
    }

    for (const item of group.namespaces) {
      lines.push(
        `import type * as ${item.localName} from ${JSON.stringify(moduleName)};`
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
        `import type { ${specifiers.join(", ")} } from ${JSON.stringify(moduleName)};`
      );
    }
  }

  return lines;
}

function findImportInsertionOffset(ts, sourceFile) {
  let offset = 0;

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      offset = statement.end;
      continue;
    }

    if (ts.isImportEqualsDeclaration(statement)) {
      offset = statement.end;
      continue;
    }

    break;
  }

  return offset;
}

const inputArg = process.argv[2] || path.join("apps", "web", "src", "App.tsx");
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

const declarations = sourceFile.statements.filter(
  (statement) =>
    ts.isTypeAliasDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement)
);

if (!declarations.length) {
  console.log("Tidak ada top-level type/interface yang perlu dipindahkan.");
  process.exit(0);
}

const typeNames = declarations.map((node) => node.name.text);
const typeOutputPath = path.join(path.dirname(targetPath), "types", "app.ts");
const typeImportPath = "./types/app";

if (fs.existsSync(typeOutputPath)) {
  fail(
    `File tujuan sudah ada: ${typeOutputPath}\nHapus atau rename file tersebut agar tidak tertimpa.`
  );
}

const importMap = collectImportedIdentifiers(ts, sourceFile);
const usedImportedNames = collectUsedImportedNames(
  ts,
  declarations,
  importMap
);

const printer = ts.createPrinter({
  newLine: ts.NewLineKind.LineFeed,
  removeComments: false
});

const dependencyImports = buildTypeImports(usedImportedNames, importMap);
const printedDeclarations = declarations.map((node) =>
  printer.printNode(
    ts.EmitHint.Unspecified,
    ensureExported(ts, node),
    sourceFile
  )
);

const generatedHeader = [
  "/*",
  " * Generated from App.tsx by refactor-app-types.cjs.",
  " * Review this file before committing.",
  " */",
  ""
];

const typeFileContent = [
  ...generatedHeader,
  ...dependencyImports,
  dependencyImports.length ? "" : null,
  ...printedDeclarations.flatMap((text, index) =>
    index === printedDeclarations.length - 1 ? [text] : [text, ""]
  ),
  ""
]
  .filter((value) => value !== null)
  .join("\n");

let nextAppText = sourceText;

for (const declaration of [...declarations].sort((a, b) => b.pos - a.pos)) {
  let start = declaration.getFullStart();
  let end = declaration.end;

  while (end < nextAppText.length && /[ \t]/.test(nextAppText[end])) end += 1;
  if (nextAppText[end] === "\r" && nextAppText[end + 1] === "\n") end += 2;
  else if (nextAppText[end] === "\n") end += 1;

  nextAppText = nextAppText.slice(0, start) + nextAppText.slice(end);
}

const importInsertionOffset = findImportInsertionOffset(
  ts,
  ts.createSourceFile(
    targetPath,
    nextAppText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
);

const appTypeImport = `\nimport type { ${typeNames
  .sort((a, b) => a.localeCompare(b))
  .join(", ")} } from "${typeImportPath}";`;

nextAppText =
  nextAppText.slice(0, importInsertionOffset) +
  appTypeImport +
  nextAppText.slice(importInsertionOffset);

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .replace("Z", "");

const backupPath = `${targetPath}.backup-${timestamp}`;

fs.mkdirSync(path.dirname(typeOutputPath), { recursive: true });
fs.writeFileSync(backupPath, sourceText, "utf8");
fs.writeFileSync(typeOutputPath, typeFileContent, "utf8");
fs.writeFileSync(targetPath, nextAppText, "utf8");

console.log("\nRefactor selesai:");
console.log(`- Backup        : ${backupPath}`);
console.log(`- Types         : ${typeOutputPath}`);
console.log(`- App diperbarui: ${targetPath}`);
console.log(`- Type dipindah : ${typeNames.length}`);
console.log("\nLangkah validasi:");
console.log("1. Jalankan npm run build");
console.log("2. Jalankan npm run lint jika tersedia");
console.log("3. Periksa git diff sebelum commit");
