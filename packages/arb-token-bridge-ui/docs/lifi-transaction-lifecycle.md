# LiFi transaction lifecycle

This document defines when a LiFi route appears in transaction history and when the user can resume it. Treat these rules as product behavior. Wallet and LiFi status names do not override them.

## Terms

- A **wallet batch ID** identifies an EIP-5792 request. It is not a transaction hash and does not prove that the user accepted the request.
- An **accepted transaction** has a real transaction hash from a LiFi route update or a transaction receipt from the wallet.
- A **saved route** is one local record for the route and all its wallet batch IDs. Before the first transaction is accepted, the app saves the route but does not show it in transaction history.
- The **route transaction ID** is the first accepted transaction hash. Later steps and batches must not replace it.

## Rules

1. Add a route to transaction history only after the first accepted transaction exists.
2. Save the route, but keep it out of transaction history while a wallet batch is `pending` without a receipt. EIP-5792 `pending` means that the wallet received the batch. It does not prove user acceptance.
3. If the user rejects a request before any transaction is accepted, remove the saved route. Do not add a history entry.
4. If the user rejects a later request, keep the history entry for the accepted transaction. Mark the stopped step as failed and allow the sender to resume it.
5. Do not use elapsed time to infer acceptance, completion, failure, or resumability.
6. Show **Resume** only for a multi-step route that has unfinished steps and no step or process is active.
7. Never show **Resume** to a wallet other than the route sender.

## Regular EOA transaction flow

| Event                                           | Stored state                                   | History | Tab     | Resume              |
| ----------------------------------------------- | ---------------------------------------------- | ------- | ------- | ------------------- |
| The wallet prompt is open                       | Nothing                                        | Hidden  | None    | No                  |
| The user rejects the first transaction          | Nothing                                        | Hidden  | None    | No                  |
| The wallet returns the first transaction hash   | Executable route keyed by that hash            | Visible | Pending | No                  |
| A route step is active                          | Updated executable route                       | Visible | Pending | No                  |
| The user rejects a later transaction            | Earlier accepted transaction and stopped route | Visible | Pending | Yes, for the sender |
| A multi-step route stops with no active process | Executable route                               | Visible | Pending | Yes, for the sender |
| A resumed step becomes active                   | Updated executable route                       | Visible | Pending | No                  |
| The route completes                             | Compact history snapshot                       | Visible | Settled | No                  |
| The route refunds                               | Compact history snapshot                       | Visible | Settled | No                  |

## EIP-5792 batch flow

| Event                                                    | Stored state                                                                              | History | Tab     | Resume              |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------- | ------- | ------------------- |
| The wallet prompt is open                                | Nothing                                                                                   | Hidden  | None    | No                  |
| The wallet returns a batch ID                            | Saved route with the batch ID                                                             | Hidden  | None    | No                  |
| `getCallsStatus` returns `pending` without a receipt     | Same saved route                                                                          | Hidden  | None    | No                  |
| The user rejects the initial batch                       | Saved route removed                                                                       | Hidden  | None    | No                  |
| The wallet returns a receipt or LiFi reports a real hash | Executable route keyed by the real hash                                                   | Visible | Pending | No                  |
| A later step returns another batch ID                    | Same route updated with the pending step and batch ID                                     | Visible | Pending | No                  |
| The user rejects the later batch                         | Earlier accepted transaction and stopped route                                            | Visible | Pending | Yes, for the sender |
| The later batch returns a receipt or real hash           | Matching route process updated with the new hash and link; route transaction ID unchanged | Visible | Pending | No                  |
| The route completes or refunds                           | Compact history snapshot                                                                  | Visible | Settled | No                  |

The Pending tab includes failed routes that the sender can resume. A LiFi route moves to Settled only after completion or refund.

## Leaving the page

The app persists one saved route in local storage. The route contains its wallet batch IDs.

- If the user leaves before accepting the first batch, the app keeps the saved route out of history and checks the wallet again after the user returns.
- If the wallet still reports `pending` without a receipt, the app keeps polling and leaves the route out of history.
- If the wallet reports rejection, the app removes the saved route.
- If the wallet returns a receipt, the same saved route appears in transaction history.
- If an accepted route stops after the user leaves, transaction history keeps the route data required by LiFi `resumeRoute`.

## Test contract

Tests for this flow must model ordered wallet states. A test that jumps directly from a batch ID to rejection does not cover the production race.

At minimum, keep these sequences covered:

1. Batch ID, `pending` without a receipt, rejection. History stays empty throughout.
2. Batch ID, `pending` without a receipt, receipt. History appears only after the receipt.
3. Accepted first transaction, later batch ID, rejection. The first transaction remains in history and becomes resumable.
4. Accepted first transaction, later batch ID, receipt. The route keeps the first transaction hash as its identity.
5. Accepted first EOA transaction, later wallet rejection. The first transaction remains in history and becomes resumable.
6. One route update containing an accepted transaction and a later batch. History shows the accepted transaction while the batch remains hidden.
