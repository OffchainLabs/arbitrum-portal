import { parseAbi } from 'viem';

import { Address } from '../types';
import { getPublicClient } from './publicClient';

// The runtime code of this contract, compiled with solc 0.8.26, optimizer on, 200 runs. No chain
// has it deployed: each eth_call loads it at READER_ADDRESS with a state override.
//
//   contract BalanceReader {
//       function balancesOf(address account, address[] calldata tokens)
//           external view returns (uint256[] memory balances)
//       {
//           balances = new uint256[](tokens.length);
//           for (uint256 i; i < tokens.length; ++i) {
//               address token = tokens[i];
//               if (token == address(0)) {
//                   balances[i] = account.balance;
//                   continue;
//               }
//               (bool ok, bytes memory data) =
//                   token.staticcall{gas: 500_000}(abi.encodeWithSelector(0x70a08231, account));
//               if (ok && data.length >= 32) {
//                   balances[i] = abi.decode(data, (uint256));
//               }
//           }
//       }
//   }
//
// It takes 32 bytes of calldata per token, so one call reads all of Ethereum's ~7,000 tokens.
// Multicall3 repeats the balanceOf input for each token, about 256 bytes, and Alchemy refuses a
// request above ~5,500 tokens. A deployless call would put the token list in the init code, which
// Ethereum caps at 48 KB, ~1,400 tokens. A token whose balanceOf reverts reads as 0. Superfluid
// tokens compute their balance from streams and need more than 100,000 gas.
const BALANCE_READER_CODE =
  '0x608060405234801561000f575f80fd5b5060043610610029575f3560e01c8063e098e8441461002d575b5f80fd5b61004061003b366004610222565b610056565b60405161004d91906102a3565b60405180910390f35b60608167ffffffffffffffff811115610071576100716102e5565b60405190808252806020026020018201604052801561009a578160200160208202803683370190505b5090505f5b828110156101ff575f8484838181106100ba576100ba6102f9565b90506020020160208101906100cf919061030d565b90506001600160a01b03811661010e57856001600160a01b0316318383815181106100fc576100fc6102f9565b602002602001018181525050506101f7565b604080516001600160a01b0388811660248084019190915283518084039091018152604490920183526020820180516001600160e01b03166370a0823160e01b17905291515f928392908516916207a120916101699161032d565b5f604051808303818686fa925050503d805f81146101a2576040519150601f19603f3d011682016040523d82523d5f602084013e6101a7565b606091505b50915091508180156101bb57506020815110155b156101f357808060200190518101906101d49190610343565b8585815181106101e6576101e66102f9565b6020026020010181815250505b5050505b60010161009f565b509392505050565b80356001600160a01b038116811461021d575f80fd5b919050565b5f805f60408486031215610234575f80fd5b61023d84610207565b9250602084013567ffffffffffffffff811115610258575f80fd5b8401601f81018613610268575f80fd5b803567ffffffffffffffff81111561027e575f80fd5b8660208260051b8401011115610292575f80fd5b939660209190910195509293505050565b602080825282518282018190525f918401906040840190835b818110156102da5783518352602093840193909201916001016102bc565b509095945050505050565b634e487b7160e01b5f52604160045260245ffd5b634e487b7160e01b5f52603260045260245ffd5b5f6020828403121561031d575f80fd5b61032682610207565b9392505050565b5f82518060208501845e5f920191825250919050565b5f60208284031215610353575f80fd5b505191905056fea2646970667358221220dafe95cd9c23481e7ce403d9095ce04f4ae011d2eaaf70bb53eff4ae6712c1d964736f6c634300081a0033';
const READER_ADDRESS: Address = '0x00000000000000000000000000000000000ba1a5';

const balanceReaderAbi = parseAbi([
  'function balancesOf(address account, address[] tokens) view returns (uint256[])',
]);

// The balance of each token, in order. The native token's address reads the native balance.
export function readBalances({
  chainId,
  account,
  tokens,
}: {
  chainId: number;
  account: Address;
  tokens: Address[];
}): Promise<readonly bigint[]> {
  return getPublicClient(chainId).readContract({
    address: READER_ADDRESS,
    abi: balanceReaderAbi,
    functionName: 'balancesOf',
    args: [account, tokens],
    stateOverride: [{ address: READER_ADDRESS, code: BALANCE_READER_CODE }],
  });
}
