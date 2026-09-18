import { getOftV2TransferConfig } from '../token-bridge-sdk/oftUtils';

export function isOftTransfer(params: Parameters<typeof getOftV2TransferConfig>[0]) {
  return getOftV2TransferConfig(params).isValid;
}
