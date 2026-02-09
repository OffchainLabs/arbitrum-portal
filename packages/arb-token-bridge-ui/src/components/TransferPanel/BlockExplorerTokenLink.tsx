import { ChainId } from '../../types/ChainId';
import { shortenAddress } from '../../util/CommonUtils';
import { getExplorerUrl } from '../../util/networks';
import { ExternalLink } from '../common/ExternalLink';

export function BlockExplorerTokenLink({
  chainId,
  address,
}: {
  chainId: ChainId;
  address: string | undefined;
}) {
  if (typeof address === 'undefined') {
    return null;
  }

  return (
    <ExternalLink
      href={`${getExplorerUrl(chainId)}/token/${address}`}
      className="arb-hover text-xs underline"
      onClick={(e) => e.stopPropagation()}
    >
      {shortenAddress(address).toLowerCase()}
    </ExternalLink>
  );
}
