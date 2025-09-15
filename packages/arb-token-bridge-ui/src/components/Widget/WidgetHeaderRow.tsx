import { useAccount } from 'wagmi'
import Image from 'next/image'
import { WidgetHeaderAccountButton } from './WidgetHeaderAccountButton'
import { WidgetModeDropdown } from './WidgetModeDropdown'
import { LifiSettingsButton } from '../TransferPanel/LifiSettingsButton'
import { Button } from '../common/Button'
import WidgetTxHistoryIcon from '@/images/WidgetTxHistoryIcon.svg'
import { OpenDialogFunction } from '../common/Dialog2'

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
            <Image
              height={18}
              width={18}
              alt="Tx history logo"
              src={WidgetTxHistoryIcon}
            />
          </Button>
        )}

        <LifiSettingsButton />
      </div>
    </div>
  )
}
