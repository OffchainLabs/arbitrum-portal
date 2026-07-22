import { ChainId } from '../types/ChainId';

// Chains operated for enterprise partners; their monitoring alerts route to
// dedicated Slack channels instead of the shared orbit channels.
export const enterpriseChainIds: ChainId[] = [ChainId.RobinhoodChain];

export function isEnterpriseChain(chainId: number): boolean {
  return enterpriseChainIds.includes(chainId);
}
