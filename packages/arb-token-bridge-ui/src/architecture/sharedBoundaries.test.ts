import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const sourceRoot = path.resolve(import.meta.dirname, '..');
const componentDirectories = ['components', '../../app/src/components'];
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
  'hooks/useAccountType.ts',
  'hooks/useHistoryDisclaimer.ts',
  'hooks/TransferPanel/useGasEstimates.ts',
  'hooks/TransferPanel/useOftV2FeeEstimates.ts',
];
// Existing EVM screens and provider setup remain outside the shared bridge flow.
// Exact imports keep new dependencies and stale exceptions visible.
const existingRuntimeDependencies: Record<string, string[]> = {
  '../../app/src/components/RetryableRedeemer/RetryableRedeemer.tsx': [
    'runtime import wagmi (useAccount)',
    'runtime import useAccount',
    'runtime import wagmi/actions (getConnectorClient)',
    'runtime import getProviderForChainId',
    'receipt.wait',
  ],
  '../../app/src/components/RetryableRedeemer/useRetryableLookup.ts': [
    'runtime import getProviderForChainId',
  ],
  'hooks/TransferPanel/useOftV2FeeEstimates.ts': ['runtime import getProviderForChainId'],
  'components/TransferPanel/CustomFeeTokenApprovalDialog.tsx': [
    'runtime import @wagmi/core (getConnectorClient)',
  ],
  'components/MainContent/ArbitrumStats.tsx': ['runtime import wagmi (useBlockNumber)'],
  'components/RecoverFunds.tsx': [
    'runtime import @ethersproject/providers (StaticJsonRpcProvider)',
    'runtime import wagmi (useAccount)',
    'runtime import useAccount',
    'runtime import getProviderForChainId',
    'EVM boundary import ../services/evm/nativeCurrency',
    'runtime import useEthersSigner',
    'ecosystem helper: fetchEvmNativeCurrency',
    'receipt.wait',
  ],
  'components/App/useSyncConnectedChainToAnalytics.ts': [
    'runtime import @reown/appkit/react (useWalletInfo)',
    'runtime import wagmi (useAccount)',
    'runtime import useAccount',
  ],
  'components/common/AddCustomChain.tsx': [
    'runtime import @ethersproject/providers (StaticJsonRpcProvider)',
    'runtime import getProviderForChainId',
    'StaticJsonRpcProvider',
  ],
  '../../app/src/components/AppShell/providers/AppProviders.tsx': [
    'runtime import wagmi (WagmiProvider)',
  ],
  'components/BuyPanel/BuyPanel.tsx': [
    'runtime import wagmi (useAccount, useBalance)',
    'runtime import useAccount',
  ],
  'components/BuyPanel/MoonPayPanel.tsx': [
    'runtime import wagmi (useAccount)',
    'runtime import useAccount',
  ],
  'components/Widget/WidgetHeaderRow.tsx': [
    'runtime import wagmi (useAccount)',
    'runtime import useAccount',
  ],
  'components/Widget/WidgetTransferPanel.tsx': [
    'runtime import wagmi (useAccount)',
    'runtime import useAccount',
  ],
  'components/common/SiteBanner.tsx': [
    'runtime import wagmi (useAccount)',
    'runtime import useAccount',
  ],
  '../../app/src/components/earn/AllOpportunitiesPage.tsx': [
    'runtime import wagmi (useAccount)',
    'runtime import useAccount',
  ],
  '../../app/src/components/earn/EarnToSPopupDialog.tsx': [
    'runtime import wagmi (useAccount)',
    'runtime import useAccount',
  ],
  '../../app/src/components/earn/EarnUserTransactionHistory.tsx': [
    'runtime import wagmi (useAccount)',
    'runtime import useAccount',
  ],
  '../../app/src/components/earn/LendOpportunityDetailsPage.tsx': [
    'runtime import wagmi (useAccount)',
    'runtime import useAccount',
  ],
  '../../app/src/components/earn/LiquidStakingActionPanel.tsx': [
    'runtime import wagmi (useAccount, useBalance)',
    'runtime import useAccount',
  ],
  '../../app/src/components/earn/LiquidStakingDetailPage.tsx': [
    'runtime import wagmi (useAccount, useBalance)',
    'runtime import useAccount',
  ],
  '../../app/src/components/earn/MyPositionsPage.tsx': [
    'runtime import wagmi (useAccount, useAccountEffect)',
    'runtime import useAccount',
  ],
  '../../app/src/components/earn/PendleActionPanel.tsx': [
    'runtime import wagmi (useAccount)',
    'runtime import useAccount',
  ],
  '../../app/src/components/earn/PendleDetailPage.tsx': [
    'runtime import wagmi (useAccount)',
    'runtime import useAccount',
  ],
  '../../app/src/components/earn/VaultActionPanel.tsx': [
    'runtime import wagmi (useAccount, useBalance)',
    'runtime import useAccount',
  ],
  '../../app/src/components/earn/YourHoldingsEmptyState.tsx': [
    'runtime import wagmi (useAccount)',
    'runtime import useAccount',
  ],
};

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

function boundaryViolations(file: string, source: string): string[] {
  const tree = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const violations: string[] = [];
  const importedNames = new Map<string, string>();
  for (const statement of tree.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const binding of bindings.elements) {
        importedNames.set(binding.name.text, (binding.propertyName ?? binding.name).text);
      }
    }
  }
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      const name = ts.isIdentifier(expression)
        ? (importedNames.get(expression.text) ?? expression.text)
        : ts.isPropertyAccessExpression(expression)
          ? expression.name.text
          : '';
      if (/Solana|Evm|EVM|^(?:solana|evm)/.test(name)) {
        violations.push(`ecosystem helper: ${name}`);
      }
    }
    if (
      ts.isSwitchStatement(node) &&
      (/ecosystem/i.test(node.expression.getText(tree)) ||
        node.caseBlock.clauses.some(
          (clause) =>
            ts.isCaseClause(clause) &&
            /^(?:['"](?:evm|solana)['"]|ChainId\.Solana)$/.test(clause.expression.getText(tree)),
        ))
    )
      violations.push('ecosystem switch');

    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const moduleName = node.moduleSpecifier.text;
      const names = runtimeImports(node);
      if (
        names.length &&
        /^(wagmi(?:\/|$)|@wagmi\/|@reown\/|@ethersproject\/providers|@solana\/web3\.js)/.test(
          moduleName,
        )
      ) {
        violations.push(`runtime import ${moduleName} (${names.join(', ')})`);
      }
      if (names.length && /\/(?:application|services)\/evm/.test(moduleName)) {
        violations.push(`EVM boundary import ${moduleName}`);
      }
      for (const name of names) {
        if (
          /^(getProviderForChainId|getEvmProvider|useEthersSigner|useAccount|useConfig|(?:[A-Z].*)?RouteExecutor)$/.test(
            name,
          )
        )
          violations.push(`runtime import ${name}`);
      }
    }
    if (ts.isNewExpression(node) && /Provider|RouteExecutor/.test(node.expression.getText(tree)))
      violations.push(node.expression.getText(tree));
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'wait'
    )
      violations.push('receipt.wait');
    if (ts.isBinaryExpression(node) && /^(===|!==|==|!=)$/.test(node.operatorToken.getText(tree))) {
      const comparison = node.getText(tree);
      if (
        /\.ecosystem\b|ChainId\.Solana|\b(?:isSolana|isEVM|isEvm)\b/.test(comparison) ||
        /getWalletEcosystem\s*\([^)]*\)\s*[!=]==?\s*['"](?:evm|solana)['"]/.test(comparison) ||
        /['"](?:evm|solana)['"]\s*[!=]==?\s*getWalletEcosystem\s*\(/.test(comparison)
      )
        violations.push(`ecosystem policy: ${comparison}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return violations;
}

describe('shared application boundaries', () => {
  const files = [...new Set([...componentDirectories.flatMap(sourceFiles), ...sharedHooks])];
  it.each(files)('%s adds no wallet runtime or ecosystem policy', (file) => {
    const source = readFileSync(path.join(sourceRoot, file), 'utf8');
    expect(boundaryViolations(file, source)).toEqual(existingRuntimeDependencies[file] ?? []);
  });
  it('keeps every dependency exception attached to a checked file', () => {
    for (const file of Object.keys(existingRuntimeDependencies)) expect(files).toContain(file);
  });
});

describe('boundary detector', () => {
  it.each([
    `switch (wallet.ecosystem) { case 'solana': break; }`,
    `switch (chainId) { case ChainId.Solana: break; }`,
    `if (isSolanaChain(id)) render();`,
    `if (network.isEvmChain(id)) render();`,
    `import { isSolanaChain as supportsRoute } from './policy'; supportsRoute(id);`,
    `import { getEvmProvider } from './provider'; getEvmProvider(id);`,
    `import { useAccount } from 'wagmi';`,
    `receipt.wait();`,
  ])('rejects forbidden syntax: %s', (source) => {
    expect(boundaryViolations('components/NewFeature.tsx', source).length).toBeGreaterThan(0);
  });
  it('permits type imports and ecosystem-neutral wallet access', () => {
    expect(
      boundaryViolations(
        'components/NewFeature.tsx',
        `
      import type { Config } from '@wagmi/core';
      const wallet = useWalletForChain(chainId);
      const connected = wallet.isConnected;
    `,
      ),
    ).toEqual([]);
  });
});
