import type { TransactionParameters } from '@lifi/sdk';

export type DialogData = { lifiApproval?: { approvalRequest: TransactionParameters } };

export type DialogType =
  | 'approve_token'
  | 'approve_lifi_token'
  | 'approve_cctp_usdc'
  | 'approve_custom_fee_token'
  | 'withdraw'
  | 'deposit_token_new_token'
  | 'deposit_token_user_added_token'
  | 'scw_custom_destination_address'
  | 'confirm_cctp_withdrawal'
  | 'confirm_cctp_deposit'
  | 'confirm_usdc_deposit'
  | 'high_slippage_warning'
  | 'amount_mismatch_warning'
  | 'widget_transaction_history'
  | 'token_selection'
  | 'destination_token_selection'
  | 'settings'
  | 'recover_funds'
  | 'source_network_selection'
  | 'destination_network_selection'
  | 'buy_panel_network_selection'
  | 'nova_deposit_warning'
  | 'trust_wallet_update'
  | 'earn_tos';
