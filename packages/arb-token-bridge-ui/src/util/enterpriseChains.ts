import { ChainId } from '../types/ChainId';

export const enterpriseChainIds: ChainId[] = [ChainId.RobinhoodChain];

export function isEnterpriseChain(chainId: number): boolean {
  return enterpriseChainIds.includes(chainId);
}
