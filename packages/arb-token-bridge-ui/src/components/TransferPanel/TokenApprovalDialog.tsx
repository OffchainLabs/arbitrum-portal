import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';

import { fetchTokenApproval } from '../../application/fetchTokenApproval';
import { TOKEN_APPROVAL_ARTICLE_LINK, ether } from '../../constants';
import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types';
import { useETHPrice } from '../../hooks/useETHPrice';
import { useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { getAccountExplorerUrl } from '../../services/explorer';
import { shortenTxHash } from '../../util/CommonUtils';
import { formatAmount, formatUSD } from '../../util/NumberUtils';
import { isNetwork } from '../../util/networks';
import { useWallets } from '../../wallet/hooks/useWallets';
import { Checkbox } from '../common/Checkbox';
import { Dialog, UseDialogProps } from '../common/Dialog';
import { ExternalLink } from '../common/ExternalLink';
import { NoteBox } from '../common/NoteBox';
import { TokenInfo } from './TokenInfo';
import { useRouteStore } from './hooks/useRouteStore';

export type TokenApprovalDialogProps = UseDialogProps & {
  token: ERC20BridgeToken | null;
};

export function TokenApprovalDialog({
  fetchApproval = fetchTokenApproval,
  ...props
}: TokenApprovalDialogProps & { fetchApproval?: typeof fetchTokenApproval }) {
  const { isOpen, token, onClose } = props;
  const { ethToUSD } = useETHPrice();
  const [networks] = useNetworks();
  const { parentChain, isDepositMode } = useNetworksRelationship(networks);
  const { isEthereumMainnet } = isNetwork(parentChain.id);
  const chainId = networks.sourceChain.id;
  const { sourceWallet } = useWallets();
  const route = useRouteStore((state) => state.selectedRoute);
  const [checked, setChecked] = useState(false);
  const { data } = useSWR(
    isOpen && token
      ? {
          sourceChainId: chainId,
          destinationChainId: networks.destinationChain.id,
          token,
          route,
          walletAddress: sourceWallet.account.address,
          key: 'tokenApproval',
        }
      : null,
    fetchApproval,
  );
  const estimatedGasFees = data?.estimatedGasFees ?? 0;
  const contractAddress = data?.contractAddress ?? '';
  const ethFeeText = useMemo(() => {
    const eth = formatAmount(estimatedGasFees, { symbol: ether.symbol });
    return eth;
  }, [estimatedGasFees]);

  const usdFeeText = useMemo(() => {
    const usd = formatUSD(ethToUSD(estimatedGasFees));
    return `${isEthereumMainnet ? ` (${usd})` : ''}`;
  }, [estimatedGasFees, ethToUSD, isEthereumMainnet]);

  const approvalFeeText = `${ethFeeText} ${usdFeeText}`.trim();

  const closeWithReset = useCallback(
    (confirmed: boolean) => {
      onClose(confirmed);
      setChecked(false);
    },
    [onClose],
  );

  return (
    <Dialog
      {...props}
      onClose={closeWithReset}
      title="Acknowledge approval and deposit fees"
      actionButtonTitle={`Pay approval fee of ${approvalFeeText}`}
      actionButtonProps={{ disabled: !checked }}
    >
      <div className="flex flex-col space-y-4 py-4">
        <TokenInfo token={token} />
        <Checkbox
          label={
            <div>
              <span className="text-sm font-light">
                I understand that I have to{' '}
                <span className="font-medium">pay a one-time approval fee</span> of{' '}
                <span className="font-medium">{ethFeeText}</span> {usdFeeText} for each new token or
                spending cap.
              </span>
            </div>
          }
          checked={checked}
          onChange={setChecked}
        />

        <div className="text-sm">
          This transaction gives permission to the{' '}
          <ExternalLink
            className="arb-hover underline"
            href={getAccountExplorerUrl(chainId, contractAddress)}
            onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
              event.stopPropagation();
            }}
          >
            {shortenTxHash(contractAddress)}
          </ExternalLink>{' '}
          contract to transfer a capped amount of {token?.symbol ?? 'a specific token'}.
        </div>

        <div className="flex flex-col gap-2">
          {data?.requiresMaximumApproval && (
            <NoteBox variant="warning">
              Note: USDT approvals for the LayerZero OFT contract must be set to the maximum amount.
              Please do not modify the approval amount, or the transaction may fail.
            </NoteBox>
          )}

          <NoteBox>
            After approval, you&apos;ll see a second prompt in your wallet for the{' '}
            {isDepositMode ? 'deposit' : 'withdrawal'} transaction.
            <ExternalLink href={TOKEN_APPROVAL_ARTICLE_LINK} className="arb-hover ml-1 underline">
              Learn more.
            </ExternalLink>
          </NoteBox>
        </div>
      </div>
    </Dialog>
  );
}
