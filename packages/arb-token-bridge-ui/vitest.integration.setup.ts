import axios from 'axios';
import { mockAnimationsApi } from 'jsdom-testing-mocks';

import { ChainId } from './src/types/ChainId';
import { rpcURLs } from './src/util/networks';

mockAnimationsApi();

const localhostPattern = /(?:^|\/\/)(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/i;
const publicEthereumRpcUrl = 'https://ethereum-rpc.publicnode.com';
const publicArbitrumRpcUrl = 'https://arb1.arbitrum.io/rpc';

function ensurePublicRpcEnv(key: string, publicRpcUrl: string) {
  const currentValue = process.env[key];
  if (!currentValue || localhostPattern.test(currentValue)) {
    process.env[key] = publicRpcUrl;
  }
}

// Integration tests should not depend on a local node process.
ensurePublicRpcEnv('NEXT_PUBLIC_RPC_URL_ETHEREUM', publicEthereumRpcUrl);
ensurePublicRpcEnv('NEXT_PUBLIC_RPC_URL_ARBITRUM_ONE', publicArbitrumRpcUrl);
ensurePublicRpcEnv('NEXT_PUBLIC_RPC_URL_BASE', 'https://mainnet.base.org');

// Keep integration tests off local nitro testnode RPCs even if local chain ids are resolved internally.
rpcURLs[ChainId.Local] = publicEthereumRpcUrl;
rpcURLs[ChainId.ArbitrumLocal] = publicArbitrumRpcUrl;
rpcURLs[ChainId.L3Local] = publicArbitrumRpcUrl;

axios.defaults.baseURL = 'http://localhost:3000';
// Avoid happy-dom's XMLHttpRequest adapter to prevent async task manager abort rejections.
(axios.defaults as { adapter?: string }).adapter = 'http';
