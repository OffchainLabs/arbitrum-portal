import type { WithdrawalInitiated } from '../hooks/arbTokenBridge.types';
import type { MergedTransaction } from '../state/app/state';
import type { WithdrawalFromSubgraph } from '../util/withdrawals/fetchWithdrawalsFromSubgraph';
import type { EthWithdrawal } from '../util/withdrawals/helpers';
import type { Transaction } from './Transactions';

export type Deposit = Transaction;

export type Withdrawal = WithdrawalFromSubgraph | WithdrawalInitiated | EthWithdrawal;

export type DepositOrWithdrawal = Deposit | Withdrawal;
export type Transfer = DepositOrWithdrawal | MergedTransaction;
