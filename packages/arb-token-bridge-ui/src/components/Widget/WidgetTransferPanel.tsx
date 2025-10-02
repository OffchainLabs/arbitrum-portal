import { usePathname } from 'next/navigation';
import { twMerge } from 'tailwind-merge';
import { useAccount } from 'wagmi';

import { BUY_EMBED_PATHNAME } from '@/bridge/constants';
import { isOnrampEnabled } from '@/bridge/util/featureFlag';

import { TabParamEnum, indexToTab, useArbQueryParams } from '../../hooks/useArbQueryParams';
import { MoveFundsButton } from '../TransferPanel/MoveFundsButton';
import { ReceiveFundsHeader } from '../TransferPanel/ReceiveFundsHeader';
import { ToSConfirmationCheckbox } from '../TransferPanel/ToSConfirmationCheckbox';
import { TokenImportDialog } from '../TransferPanel/TokenImportDialog';
import { TransferPanelMain } from '../TransferPanel/TransferPanelMain';
import { UseDialogProps } from '../common/Dialog';
import { DialogProps, DialogWrapper, OpenDialogFunction } from '../common/Dialog2';
import { WidgetConnectWalletButton } from './WidgetConnectWalletButton';
import { WidgetHeaderRow } from './WidgetHeaderRow';
import { WidgetRoutes } from './WidgetRoutes';

type WidgetTransferPanelProps = {
  moveFundsButtonOnClick: () => void;
  isTokenAlreadyImported?: boolean;
  tokenFromSearchParams?: string;
  tokenImportDialogProps: UseDialogProps;
  openDialog: OpenDialogFunction;
  dialogProps: DialogProps;
  closeWithResetTokenImportDialog: () => void;
};

export function WidgetTransferPanel({
  dialogProps,
  openDialog,
  moveFundsButtonOnClick,
  isTokenAlreadyImported,
  tokenFromSearchParams,
  tokenImportDialogProps,
  closeWithResetTokenImportDialog,
}: WidgetTransferPanelProps) {
  const { isConnected } = useAccount();
  const pathname = usePathname();
  const isBuyMode = pathname === BUY_EMBED_PATHNAME;

  return (
    <>
      <DialogWrapper {...dialogProps} />

      <div
        className={twMerge(
          'relative m-auto flex w-full flex-col gap-4 rounded-lg bg-transparent p-4 text-white',
        )}
      >
        <WidgetHeaderRow openDialog={openDialog} />
        <div
          className={twMerge(
            'relative grid w-full grid-cols-1 gap-4 rounded-lg bg-transparent text-white transition-all duration-300 min-[850px]:grid min-[850px]:grid-cols-2',
            isBuyMode && 'grid-cols-1 min-[850px]:grid-cols-1',
          )}
        >
          {/* Left/Top panel */}
          <div className="flex h-full flex-col gap-1 overflow-hidden">
            <TransferPanelMain />
          </div>
          {/* Right/Bottom panel - only show for bridge mode */}
          <div className="flex h-full flex-col gap-1 rounded-lg min-[850px]:justify-between min-[850px]:bg-white/5 min-[850px]:p-4">
            <div className="flex flex-col gap-4">
              <ReceiveFundsHeader />

              <WidgetRoutes />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <ToSConfirmationCheckbox />

              {isConnected ? (
                <MoveFundsButton onClick={moveFundsButtonOnClick} />
              ) : (
                <WidgetConnectWalletButton />
              )}
            </div>
          </div>
        </div>
      </div>

      {isTokenAlreadyImported === false && tokenFromSearchParams && (
        <TokenImportDialog
          {...tokenImportDialogProps}
          onClose={closeWithResetTokenImportDialog}
          tokenAddress={tokenFromSearchParams}
        />
      )}
    </>
  );
}
