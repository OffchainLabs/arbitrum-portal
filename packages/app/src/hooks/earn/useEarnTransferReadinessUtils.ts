// Re-export shared error message functions from the bridge utilities
// to avoid duplication. These are identical in both the bridge and earn modules.
export {
  getInsufficientFundsErrorMessage,
  getInsufficientFundsForGasFeesErrorMessage,
} from '@/bridge/components/TransferPanel/useTransferReadinessUtils';

// Earn-specific error messages (different from bridge's TransferReadinessRichErrorMessage)
export enum EarnTransferReadinessRichErrorMessage {
  GAS_ESTIMATION_FAILURE = 'Gas estimation failed. Please try again.',
  INSUFFICIENT_BALANCE = 'Insufficient balance.',
  INSUFFICIENT_GAS_BALANCE = 'Insufficient balance for gas fees.',
}
