# Safe + WalletConnect Bridge UX Audit Report

**Date:** April 14, 2026
**Branch:** `fix/safe-walletconnect-ux`
**Scope:** Bridge <> WalletConnect <> Safe connection stability and transaction signing reliability

---

## 1. Observed Issues

| # | Issue | Severity |
|---|-------|----------|
| 1 | Bridge <> WalletConnect <> Safe connection is buggy, drops frequently while transacting, needs reconnections | High |
| 2 | TX signing notification in the Safe wallet is intermittent after clicking Transfer on the Bridge — only arrives after multiple trials | High |
| 3 | After initiating a transfer, the Transfer button remains active and can be clicked again by users accidentally | Medium |
| 4 | Signing in Safe wallet constantly leads to "Error submitting the transaction, Please try again" | High |

---

## 2. Root Cause Analysis

### Issue 1: Connection drops frequently

**Three compounding causes identified:**

#### A. WalletConnect provider pinned to stale version (2.13.1)

**File:** [`package.json:28`](https://github.com/nicoinchern/arbitrum-portal/blob/main/package.json#L28)
```json
"**/@walletconnect/ethereum-provider": "2.13.1"
```

This yarn resolution override was added in June 2024 ([commit `d27c91f`](https://github.com/nicoinchern/arbitrum-portal/commit/d27c91f2050a8afda1af315e7f09fecb5cdd4961)) as part of the smart contract wallet feature work. It locks the project **~20 releases behind** the latest (2.23.9), preventing critical session stability and reconnection fixes from being picked up. See [Section 3](#3-walletconnect-fixes-missed-due-to-version-pin) for the full list of missed fixes.

#### B. Aggressive WalletConnect session wipe on every page load

**File:** [`packages/app/src/components/AppShell/providers/AppProviders.tsx:57-64`](https://github.com/nicoinchern/arbitrum-portal/blob/main/packages/app/src/components/AppShell/providers/AppProviders.tsx#L57-L64)
```typescript
// Clear cache for everything related to WalletConnect v2.
//
// TODO: Remove this once the fix for the infinite loop / memory leak is identified.
Object.keys(localStorage).forEach((key) => {
  if (key === 'wagmi.requestedChains' || key === 'wagmi.store' || key.startsWith('wc@2')) {
    localStorage.removeItem(key);
  }
});
```

On **every page load** (including navigation and refresh), all WalletConnect v2 session data (`wc@2*`), the wagmi store, and requested chains are destroyed. This was added as a workaround for an infinite loop / memory leak — a bug that was **fixed upstream in WalletConnect 2.15.2** (see [Section 3](#3-walletconnect-fixes-missed-due-to-version-pin)), but the workaround was never removed because the version pin prevented the fix from being pulled in.

**Impact:** Safe wallets connecting via WalletConnect lose their session every time the user navigates or refreshes the page.

#### C. Destructive disconnect handler

**File:** [`packages/arb-token-bridge-ui/src/util/walletConnectUtils.ts:1-19`](https://github.com/nicoinchern/arbitrum-portal/blob/main/packages/arb-token-bridge-ui/src/util/walletConnectUtils.ts)
```typescript
indexedDB.deleteDatabase('WALLET_CONNECT_V2_INDEXED_DB');
setTimeout(() => window.location.reload(), 100);
```

On any disconnect event (including transient connection hiccups), the **entire WalletConnect IndexedDB is deleted** and the page is **force-reloaded** after 100ms. This turns minor connection blips into full session destruction, preventing any reconnection.

---

### Issue 2: TX signing notification to Safe is intermittent

**File:** [`packages/arb-token-bridge-ui/src/hooks/useAccountType.ts:14-16`](https://github.com/nicoinchern/arbitrum-portal/blob/main/packages/arb-token-bridge-ui/src/hooks/useAccountType.ts#L14-L16)
```typescript
// TODO: change to use connected chain when Safe wallet returns it correctly
// atm Safe UI would try to switch connected chain even when user is at the correct chain
// so the connected chain WAGMI returns is the wrong chain where the SCW is not deployed on
```

When Safe is connected, wagmi may report the wrong `chainId`. The bridge then unnecessarily triggers `switchChainAsync()` in `moveFundsButtonOnClick` ([TransferPanel.tsx:1245-1267](https://github.com/nicoinchern/arbitrum-portal/blob/main/packages/arb-token-bridge-ui/src/components/TransferPanel/TransferPanel.tsx#L1245-L1267)), which sends a `wallet_switchEthereumChain` request to Safe via WalletConnect. This can put the session into a confused state, preventing the subsequent transaction request from arriving.

Additionally, the pinned WalletConnect 2.13.1 has a **known bug with EIP-1271 signature validation for multi-sig wallets** (hardcoded signature length check), fixed in [2.21.3](https://github.com/WalletConnect/walletconnect-monorepo/releases/tag/%40walletconnect%2Futils%402.21.3). This directly impacts Safe wallet transaction signing.

---

### Issue 3: Transfer button stays active after clicking

**Two compounding bugs:**

#### A. Button component doesn't disable when `loading=true`

**File:** [`packages/arb-token-bridge-ui/src/components/common/Button.tsx:50`](https://github.com/nicoinchern/arbitrum-portal/blob/main/packages/arb-token-bridge-ui/src/components/common/Button.tsx#L50)
```tsx
<button disabled={disabled}>  // `loading` prop is purely visual — only shows a spinner
```

The `MoveFundsButton` passes `loading={isTransferring}` but this **only renders a spinner** — the underlying `<button>` element remains clickable because `disabled` doesn't incorporate the `loading` state.

#### B. Race condition in `moveFundsButtonOnClick`

**File:** [`packages/arb-token-bridge-ui/src/components/TransferPanel/TransferPanel.tsx:1254-1276`](https://github.com/nicoinchern/arbitrum-portal/blob/main/packages/arb-token-bridge-ui/src/components/TransferPanel/TransferPanel.tsx#L1254-L1276)
```typescript
try {
  setTransferring(true);          // Button shows loading
  await switchChainAsync(...);
} catch (error) { ... }
finally {
  setTransferring(false);         // <-- RESETS BEFORE transfer functions execute
}
// Button is re-enabled here!
return transfer();                // Called with button no longer in loading state
```

The `finally` block resets `isTransferring` to `false` **before** the actual transfer function (`transfer()`, `transferCctp()`, `transferLifi()`, `transferOft()`) is invoked. Each transfer function calls `setTransferring(true)` again internally, but there is a window between the reset and the re-set where the button is active.

---

### Issue 4: "Error submitting the transaction" during Safe signing

The transaction submission uses `signer.sendTransaction()` ([TransferPanel.tsx:374](https://github.com/nicoinchern/arbitrum-portal/blob/main/packages/arb-token-bridge-ui/src/components/TransferPanel/TransferPanel.tsx#L374)) which sends the request over the WalletConnect relay. Combined with Issues 1A-1C (session instability), the relay connection may drop before Safe processes the request, or Safe processes it but the response doesn't arrive back, causing a generic error.

The pinned WalletConnect 2.13.1 also has **duplicate `session_request` emissions after client restart** (fixed in [2.21.4](https://github.com/WalletConnect/walletconnect-monorepo/releases/tag/%40walletconnect%2Fsign-client%402.21.4)), which can confuse Safe's transaction queue.

---

## 3. WalletConnect Fixes Missed Due to Version Pin

The yarn resolution pins `@walletconnect/ethereum-provider` at **2.13.1**. The latest is **2.23.9**. Below are the critical fixes shipped between these versions that directly address our issues.

### Connection Stability & Reconnection

| Version | Fix | Link |
|---------|-----|------|
| **2.15.2** | **Resolved reconnection loop** that caused repeated connection attempts — this is the "infinite loop / memory leak" our `AppProviders.tsx` TODO references | [Release](https://github.com/WalletConnect/walletconnect-monorepo/releases/tag/%40walletconnect%2Fcore%402.15.2) |
| **2.23.9** | **Prevented infinite loop and memory exhaustion in relayer reconnection** — serialized connection attempts, fixed WebSocket listener leaks, fixed reconnection flag management | [Release](https://github.com/WalletConnect/walletconnect-monorepo/releases/tag/%40walletconnect%2Fcore%402.23.9) |
| **2.23.9** | **Cleaned up orphaned subscriber topics** that persisted indefinitely — added heartbeat-based reconciliation for inactive topics | [Release](https://github.com/WalletConnect/walletconnect-monorepo/releases/tag/%40walletconnect%2Fsign-client%402.23.9) |
| **2.21.3** | **Relayer no longer awaits `transportOpen`** during initialization — prevents connection stalls | [Release](https://github.com/WalletConnect/walletconnect-monorepo/releases/tag/%40walletconnect%2Futils%402.21.3) |
| **2.15.0** | Changed relay URL from `.com` to `.org` domain | [Release](https://github.com/WalletConnect/walletconnect-monorepo/releases/tag/%40walletconnect%2Fcore%402.15.0) |
| **2.13.1** | Fixed **multiple event handler registration for identical events** — prevents listener leaks | [Release](https://github.com/WalletConnect/walletconnect-monorepo/releases/tag/%40walletconnect%2Fcore%402.13.1) |

### Safe / Multi-Sig Wallet Signing

| Version | Fix | Link |
|---------|-----|------|
| **2.21.3** | **Fixed EIP-1271 signature validator that caused multi-sig to fail** due to hardcoded signature length | [Release](https://github.com/WalletConnect/walletconnect-monorepo/releases/tag/%40walletconnect%2Futils%402.21.3) |
| **2.21.4** | **Fixed duplicate `session_request` emitted after client restart** — Safe was receiving ghost/duplicate requests | [Release](https://github.com/WalletConnect/walletconnect-monorepo/releases/tag/%40walletconnect%2Fsign-client%402.21.4) |
| **2.21.3** | **Fixed pairing URI reuse** not providing correct verify context on second connection attempt | [Release](https://github.com/WalletConnect/walletconnect-monorepo/releases/tag/%40walletconnect%2Futils%402.21.3) |
| **2.21.3** | **Deletes expirer entry after wallet responds** to session proposal — prevents stale expired sessions | [Release](https://github.com/WalletConnect/walletconnect-monorepo/releases/tag/%40walletconnect%2Futils%402.21.3) |

### Session & Provider Stability

| Version | Fix | Link |
|---------|-----|------|
| **2.14.0** | Processes incoming requests in **sequential order** — prevents race conditions with multiple tx requests | [Release](https://github.com/WalletConnect/walletconnect-monorepo/releases/tag/%40walletconnect%2Fcore%402.14.0) |
| **2.15.0** | Refactored session settlement — publishes settle request **before** proposal for correct sequencing | [Release](https://github.com/WalletConnect/walletconnect-monorepo/releases/tag/%40walletconnect%2Fcore%402.15.0) |
| **2.23.5** | Fixed **TypeError in `onChainChanged`** when provider is undefined during cleanup race conditions | [Release](https://github.com/WalletConnect/walletconnect-monorepo/releases/tag/%40walletconnect%2Funiversal-provider%402.23.5) |
| **2.23.9** | Replaced Node.js `Buffer` with **browser-safe alternatives** — fixes "Buffer is not defined" in browser environments | [Release](https://github.com/WalletConnect/walletconnect-monorepo/releases/tag/%40walletconnect%2Futils%402.23.9) |
| **2.23.0** | Removed **redundant sign-client ACK on session disconnect** — cleaner disconnect handling | [Release](https://github.com/WalletConnect/walletconnect-monorepo/releases/tag/%40walletconnect%2Fsign-client%402.23.0) |
| **2.21.10** | Fixed **redundant `accountsChanged` emit** due to incorrect if statement | [Release](https://github.com/WalletConnect/walletconnect-monorepo/releases/tag/%40walletconnect%2Funiversal-provider%402.21.10) |

### Related GitHub Issues

- [#625 — Stored subscriptions causing freeze/crash (8000+ subscriptions in localStorage)](https://github.com/WalletConnect/walletconnect-monorepo/issues/625)
- [#2830 — EventEmitter memory leak: 11 session_connect listeners](https://github.com/WalletConnect/walletconnect-monorepo/issues/2830)
- [#1177 — MaxListenersExceededWarning memory leak](https://github.com/WalletConnect/walletconnect-monorepo/issues/1177)
- [#809 — Application crash when idle (subscription explosion)](https://github.com/WalletConnect/walletconnect-monorepo/issues/809)
- [PR #1758 — Relay reconnection fix with queue-based retry](https://github.com/WalletConnect/walletconnect-monorepo/pull/1758)

---

## 4. Prescribed Fixes

### Fix 1: Bump `@walletconnect/ethereum-provider` (2.13.1 -> 2.23.9)

**File:** `package.json`
```diff
- "**/@walletconnect/ethereum-provider": "2.13.1",
+ "**/@walletconnect/ethereum-provider": "2.23.9",
```

**Why:** Picks up all fixes listed in [Section 3](#3-walletconnect-fixes-missed-due-to-version-pin) — reconnection loop fix, EIP-1271 multi-sig fix, orphaned subscriber cleanup, session stability improvements.

**Risk:** Low. No breaking changes within the 2.x line.

---

### Fix 2: Disable button when loading (`Button.tsx`)

**File:** `packages/arb-token-bridge-ui/src/components/common/Button.tsx`
```diff
- disabled={disabled}
+ disabled={disabled || loading}
```

**Why:** The `loading` prop was purely visual (showed a spinner) but didn't prevent clicks. This one-line fix prevents double-clicks on the Move Funds button and any other button using the `loading` prop across the app.

**Risk:** Very low. All existing usages of `loading` already intend for the button to be non-interactive during loading.

---

### Fix 3: Remove premature `setTransferring(false)` in transfer flow (`TransferPanel.tsx`)

**File:** `packages/arb-token-bridge-ui/src/components/TransferPanel/TransferPanel.tsx`
```diff
    } catch (error) {
+     setTransferring(false);
      if (isUserRejectedError(error)) {
        return;
      }
      return networkConnectionWarningToast();
-   } finally {
-     setTransferring(false);
    }
```

**Why:** The `finally` block was resetting `isTransferring` before the actual transfer function executed, creating a window where the button was re-enabled. Moving the reset to only the `catch` block ensures the transfer functions (which manage their own `setTransferring` lifecycle) start with the button still in loading state.

**Risk:** Low. Each transfer function (`transfer()`, `transferCctp()`, `transferLifi()`, `transferOft()`) already calls `setTransferring(true)` at its start and `setTransferring(false)` in its own `finally` block.

---

### Fix 4: Stop wiping WalletConnect sessions on page load (`AppProviders.tsx`)

**File:** `packages/app/src/components/AppShell/providers/AppProviders.tsx`
```diff
- // Clear cache for everything related to WalletConnect v2.
- //
- // TODO: Remove this once the fix for the infinite loop / memory leak is identified.
+ // Only clear stale wagmi metadata on load — preserve WalletConnect session data
+ // so that Safe and other WC-connected wallets don't lose their sessions on navigation.
  Object.keys(localStorage).forEach((key) => {
-   if (key === 'wagmi.requestedChains' || key === 'wagmi.store' || key.startsWith('wc@2')) {
+   if (key === 'wagmi.requestedChains') {
      localStorage.removeItem(key);
    }
  });
```

**Why:** The original workaround destroyed all WalletConnect session data on every page load to mitigate an infinite loop bug. That bug was fixed in WalletConnect **2.15.2** (which we now get via Fix 1). Preserving `wagmi.store` and `wc@2*` keys allows Safe wallet sessions to survive page navigations and refreshes.

**Risk:** Low-medium. Should be tested carefully with the WalletConnect provider bump. If the original memory leak resurfaces (unlikely given it's been fixed upstream for 2 years), this can be reverted independently.

---

### Fix 5: Less destructive disconnect handler (`walletConnectUtils.ts`)

**File:** `packages/arb-token-bridge-ui/src/util/walletConnectUtils.ts`
```diff
  export function onDisconnectHandler() {
-   if (typeof indexedDB === 'undefined') {
-     return;
-   }
-
    if (typeof localStorage === 'undefined') {
      return;
    }

    const isWalletConnect = localStorage.getItem('wagmi.wallet') === '"walletConnect"';

    if (!isWalletConnect) {
      return;
    }

-   indexedDB.deleteDatabase('WALLET_CONNECT_V2_INDEXED_DB');
-
-   setTimeout(() => window.location.reload(), 100);
+   // Clear WalletConnect session keys from localStorage so reconnection starts fresh.
+   // Avoid deleting the entire IndexedDB and force-reloading — that was too aggressive
+   // and caused Safe wallet sessions to break on minor disconnects.
+   Object.keys(localStorage).forEach((key) => {
+     if (key.startsWith('wc@2')) {
+       localStorage.removeItem(key);
+     }
+   });
  }
```

**Why:** The old handler deleted the entire WalletConnect IndexedDB and force-reloaded the page on every disconnect. This turned minor connection hiccups into full session destruction. The new handler clears WalletConnect localStorage keys so the next connection starts fresh, but avoids the destructive IndexedDB wipe and page reload.

**Risk:** Low. Wagmi and RainbowKit handle their own reconnection lifecycle. The force-reload was a blunt workaround, not a requirement.

---

### Fix 6: Dependency bumps (no breaking changes)

| Package | Before | After | Changelog |
|---------|--------|-------|-----------|
| `@rainbow-me/rainbowkit` | ^2.2.4 | ^2.2.10 | [Releases](https://github.com/rainbow-me/rainbowkit/releases) |
| `viem` | ^2.38.5 | ^2.47.12 | [Releases](https://github.com/wevm/viem/releases) |
| `@tanstack/react-query` | ^5.63.0 | ^5.99.0 | [Releases](https://github.com/TanStack/query/releases) |

**Notable fixes picked up:**
- **RainbowKit 2.2.10:** Mobile connect flow UI fixes, wallet connector fixes (Gemini, Coin98, SafePal, Frontier), security patches
- **viem 2.47.12:** Fixed `waitForTransactionReceipt` bug, fixed `shouldRetry` for RPC 429 in batch mode (Alchemy compatibility), EIP-7702 utilities stabilized
- **@tanstack/react-query 5.99.0:** Minor/patch fixes, React 19 compatibility

**Risk:** Very low. All within current major versions, no breaking changes.

---

## 5. Upgrade Path for wagmi v3 (Future — Blocked)

**wagmi 3.6.1** is the latest, but **RainbowKit does not yet support wagmi v3**. The latest RainbowKit (2.2.10) requires `wagmi: ^2.9.0`. There is an [open discussion](https://github.com/rainbow-me/rainbowkit/discussions/2575) with no maintainer response or timeline.

When RainbowKit ships v3 support, the migration would require:
- Renaming `useAccount` -> `useConnection` across **60 files** (122 occurrences)
- Renaming `useAccountEffect` -> `useConnectionEffect` (1 file)
- Installing connector SDKs as explicit peer dependencies
- TypeScript >= 5.7.3 (already met — we're on 5.9.2)

**Recommendation:** Monitor [rainbow-me/rainbowkit#2575](https://github.com/rainbow-me/rainbowkit/discussions/2575). The migration is mechanical once unblocked.

---

## 6. Summary

| Fix | Files Changed | Complexity | Expected Impact |
|-----|---------------|------------|-----------------|
| Bump WalletConnect provider | `package.json` | Trivial | High — picks up 2 years of session/relay fixes |
| Button disable on loading | `Button.tsx` | One line | Medium — prevents double-click across the app |
| Transfer button race condition | `TransferPanel.tsx` | Small | Medium — fixes button re-enable during transfer |
| Remove session wipe on load | `AppProviders.tsx` | Small | High — Safe sessions survive page navigation |
| Less destructive disconnect | `walletConnectUtils.ts` | Small | High — connection hiccups no longer nuke sessions |
| Dependency bumps | 3 `package.json` files | Trivial | Low-medium — picks up misc bug fixes |

**Total: 7 files, ~19 lines changed, ~20 lines removed.**

All changes are on branch `fix/safe-walletconnect-ux` as unstaged modifications, ready for review.
