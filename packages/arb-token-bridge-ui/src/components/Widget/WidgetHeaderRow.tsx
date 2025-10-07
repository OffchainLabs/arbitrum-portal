import { useAccount } from 'wagmi';

import { LifiSettingsButton } from '../TransferPanel/LifiSettingsButton';
import { Button } from '../common/Button';
import { OpenDialogFunction } from '../common/Dialog2';
import { SafeImage } from '../common/SafeImage';
import { WidgetHeaderAccountButton } from './WidgetHeaderAccountButton';
import { WidgetModeDropdown } from './WidgetModeDropdown';

type WidgetHeaderRowProps = {
  openDialog: OpenDialogFunction;
};

export function WidgetHeaderRow({ openDialog }: WidgetHeaderRowProps) {
  const { isConnected } = useAccount();

  return (
    <div className="flex h-10 flex-row items-center justify-between text-lg">
      <WidgetModeDropdown />

      <div className="flex flex-row gap-2 text-sm">
        <WidgetHeaderAccountButton />

        {/* widget transaction history */}
        {isConnected && (
          <Button
            variant="secondary"
            className="h-10 p-[10px] text-white"
            onClick={() => openDialog('widget_transaction_history')}
          >
            <SafeImage
              height={16}
              width={16}
              alt="Tx history logo"
              src="/images/WidgetTxHistoryIcon.svg"
              fallback={<div className="h-4 w-4 min-w-3 rounded-full bg-gray-dark/70" />}
            />
          </Button>
        )}

        <LifiSettingsButton />
      </div>
    </div>
  );
}
