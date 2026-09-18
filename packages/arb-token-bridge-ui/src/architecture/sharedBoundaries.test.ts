import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const sourceRoot = path.resolve(import.meta.dirname, '..');
const componentDirectories = ['components/TransferPanel', 'components/TransactionHistory'];
const sharedHooks = [
  'components/common/NetworkSelectionContainer.tsx',
  'components/Widget/WidgetHeaderAccountButton.tsx',
  'components/App/useSyncConnectedChainToQueryParams.ts',
  '../../app/src/components/AppShell/components/NavWallet.tsx',
  'hooks/useNetworks.ts',
  'hooks/useNetworksRelationship.ts',
  'hooks/useBalanceOnSourceChain.ts',
  'hooks/useBalanceOnDestinationChain.ts',
  'hooks/useNativeCurrency.ts',
  'hooks/TransferPanel/useGasEstimates.ts',
  'hooks/TransferPanel/useOftV2FeeEstimates.ts',
];

function sourceFiles(directory: string): string[] {
  return readdirSync(path.join(sourceRoot, directory), { withFileTypes: true }).flatMap((entry) => {
    const name = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(name);
    return /\.tsx?$/.test(name) && !/\.(test|integration|helpers)\./.test(name) ? [name] : [];
  });
}

function runtimeImports(node: ts.ImportDeclaration): string[] {
  const clause = node.importClause;
  if (!clause || clause.isTypeOnly) return [];
  const names: string[] = clause.name ? [clause.name.text] : [];
  const bindings = clause.namedBindings;
  if (bindings && ts.isNamespaceImport(bindings)) names.push('*');
  if (bindings && ts.isNamedImports(bindings)) {
    names.push(
      ...bindings.elements
        .filter((item) => !item.isTypeOnly)
        .map((item) => (item.propertyName ?? item.name).text),
    );
  }
  return names;
}

describe('shared application boundaries', () => {
  it.each([...componentDirectories.flatMap(sourceFiles), ...sharedHooks])(
    '%s contains no wallet runtime, provider acquisition or SDK execution',
    (file) => {
      const source = readFileSync(path.join(sourceRoot, file), 'utf8');
      const tree = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      const violations: string[] = [];
      function visit(node: ts.Node) {
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
          const moduleName = node.moduleSpecifier.text;
          const names = runtimeImports(node);
          if (
            names.length &&
            /^(wagmi(?:\/|$)|@wagmi\/|@reown\/|@ethersproject\/providers|@solana\/web3\.js)/.test(
              moduleName,
            )
          ) {
            violations.push(`runtime import ${moduleName}`);
          }
          for (const name of names) {
            if (
              /^(getProviderForChainId|getEvmProvider|useEthersSigner|useAccount|useConfig|.*TransferStarter|.*RouteExecutor)$/.test(
                name,
              )
            )
              violations.push(`runtime import ${name}`);
          }
        }
        if (
          ts.isNewExpression(node) &&
          /Provider|TransferStarter|RouteExecutor/.test(node.expression.getText(tree))
        )
          violations.push(node.expression.getText(tree));
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === 'wait'
        )
          violations.push('receipt.wait');
        if (
          ts.isBinaryExpression(node) &&
          /^(===|!==|==|!=)$/.test(node.operatorToken.getText(tree))
        ) {
          const comparison = node.getText(tree);
          if (/\.ecosystem\b|ChainId\.Solana|\b(?:isSolana|isEVM|isEvm)\b/.test(comparison))
            violations.push(`ecosystem policy: ${comparison}`);
        }
        ts.forEachChild(node, visit);
      }
      visit(tree);
      expect(violations).toEqual([]);
    },
  );
});
