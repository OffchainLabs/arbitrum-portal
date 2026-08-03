import { Token as LiFiToken } from '@lifi/sdk';

export type QueryParams = {
  fromToken: string;
  toToken: string;
  fromChainId: string;
  toChainId: string;
  fromAddress?: string;
  toAddress: string;
  fromAmount: string;
};

export type Token = Pick<LiFiToken, 'symbol' | 'decimals' | 'address' | 'logoURI'>;

export type RouteCost = {
  amount: string | undefined;
  amountUSD?: string;
  token: Token;
  chainId?: number;
  estimate?: string;
  details?: {
    id: string;
    label: string;
    via: string;
    iconURI?: string;
  };
};

/** This interface is meant to be extended by the different API, it's not meant to be consummed by the bridge  */
export interface CrosschainTransfersRouteBase {
  durationMs: number;
  gas: RouteCost[];
  fee: RouteCost[];
  fromAmount: {
    amount: string;
    amountUSD: string;
    token: Token;
  };
  toAmount: {
    amount: string;
    amountUSD: string;
    token: Token;
  };
  fromChainId: number;
  toChainId: number;
  fromAddress?: string;
  toAddress?: string;
}
