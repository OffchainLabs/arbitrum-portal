import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sourceRoot = path.join(root, 'packages/arb-token-bridge-ui/src');
const typesPath = path.join(sourceRoot, 'wallet/types.ts');
const configPath = path.join(root, 'tsconfig.json');
const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile);
assert.equal(error, undefined);
const parsed = ts.parseJsonConfigFileContent(config, ts.sys, root);
assert.deepEqual(parsed.errors, []);
const options = { ...parsed.options, incremental: false, noEmit: true };
const host = ts.createCompilerHost(options, true);
const baseline = ts.createProgram(parsed.fileNames, options, host);
const targets = [];
const additionalTargets = new Map([
  ['wallet/WalletContext.ts', 'defaultWalletContextValue'],
  ['wallet/WalletProvider.tsx', 'getBalanceClient'],
  ['application/resolveLifiTransferStarter.ts', 'resolveLifiTransferStarter'],
]);

function hasEcosystemRecord(node) {
  if (
    ts.isTypeReferenceNode(node) &&
    node.typeName.getText() === 'Record' &&
    node.typeArguments?.[0]?.getText() === 'WalletEcosystem'
  )
    return true;
  return ts.forEachChild(node, hasEcosystemRecord) ?? false;
}

for (const source of baseline.getSourceFiles()) {
  const relative = path.relative(sourceRoot, source.fileName);
  if (relative.startsWith('..') || /\.(?:test|test-d|integration)\./.test(relative)) continue;
  function visit(node) {
    if (
      (ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node)) &&
      node.name &&
      ts.isIdentifier(node.name) &&
      ((ts.isVariableDeclaration(node) && hasEcosystemRecord(node)) ||
        additionalTargets.get(relative) === node.name.text)
    ) {
      targets.push({ source, name: node.name.text, start: node.getStart(source), end: node.end });
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
for (const [file, name] of additionalTargets) {
  assert.ok(
    targets.some(
      (target) =>
        path.relative(sourceRoot, target.source.fileName) === file && target.name === name,
    ),
    `Missing ecosystem registration check: ${file}: ${name}`,
  );
}
for (const source of new Set(targets.map((target) => target.source))) {
  const diagnostics = baseline.getSemanticDiagnostics(source);
  assert.equal(
    diagnostics.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => root,
      getCanonicalFileName: (name) => name,
      getNewLine: () => '\n',
    }),
  );
}

const types = baseline.getSourceFile(typesPath);
assert.ok(types);
const ecosystem = types.statements.find(
  (node) => ts.isTypeAliasDeclaration(node) && node.name.text === 'WalletEcosystem',
);
assert.ok(ecosystem && ts.isTypeAliasDeclaration(ecosystem));
const widenedTypes =
  types.text.slice(0, ecosystem.type.end) +
  " | '__unregistered_ecosystem__'" +
  types.text.slice(ecosystem.type.end);
const readFile = host.readFile.bind(host);
host.readFile = (file) => (path.resolve(file) === typesPath ? widenedTypes : readFile(file));
const widened = ts.createProgram(parsed.fileNames, options, host);
const diagnosticsByFile = new Map();

for (const target of targets) {
  const file = target.source.fileName;
  if (!diagnosticsByFile.has(file)) {
    const source = widened.getSourceFile(file);
    assert.ok(source);
    diagnosticsByFile.set(file, widened.getSemanticDiagnostics(source));
  }
  assert.ok(
    diagnosticsByFile
      .get(file)
      .some(
        (diagnostic) =>
          diagnostic.category === ts.DiagnosticCategory.Error &&
          diagnostic.start >= target.start &&
          diagnostic.start < target.end,
      ),
    `${path.relative(sourceRoot, file)}: ${target.name} accepted an unregistered ecosystem`,
  );
}
process.stdout.write(
  `Verified ${targets.length} registration sites reject an unregistered ecosystem.\n`,
);
