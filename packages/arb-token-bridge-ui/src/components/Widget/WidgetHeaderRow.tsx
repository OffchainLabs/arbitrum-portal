import { useAccount } from 'wagmi'
import { WidgetHeaderAccountButton } from './WidgetHeaderAccountButton'
import { WidgetModeDropdown } from './WidgetModeDropdown'
import { LifiSettingsButton } from '../TransferPanel/LifiSettingsButton'
import { Button } from '../common/Button'
import { OpenDialogFunction } from '../common/Dialog2'
import { SafeImage } from '../common/SafeImage'

type WidgetHeaderRowProps = {
  openDialog: OpenDialogFunction
}

export function WidgetHeaderRow({ openDialog }: WidgetHeaderRowProps) {
  const { isConnected } = useAccount()

  return (
    <div className="flex h-8 flex-row items-center justify-between text-lg">
      <WidgetModeDropdown />

      <div className="flex flex-row gap-2 text-sm">
        <WidgetHeaderAccountButton />

        {/* widget transaction history */}
        {isConnected && (
          <Button
            variant="secondary"
            className="h-8 p-2 text-white"
            onClick={() => openDialog('widget_transaction_history')}
          >
            <SafeImage
              height={18}
              width={18}
              alt="Tx history logo"
              src="/images/WidgetTxHistoryIcon.svg"
              fallback={
                <div className="bg-gray-dark/70 h-3 w-3 min-w-3 rounded-full" />
              }
            />
          </Button>
        )}

        <LifiSettingsButton />
      </div>
    </div>
  )
}
