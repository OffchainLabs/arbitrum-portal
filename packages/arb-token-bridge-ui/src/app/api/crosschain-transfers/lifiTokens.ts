export const LIFI_TRANSFER_LIST_ID = 'lifi-transfer';

export interface LifiTokenInfo {
  address: string;
  chainId: number;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface LifiTransferToken extends LifiTokenInfo {
  destinationToken: LifiTokenInfo;
}

export type LifiTokensApiResponse =
  | {
      message: string;
    }
  | {
      data: LifiTransferToken[];
    };
