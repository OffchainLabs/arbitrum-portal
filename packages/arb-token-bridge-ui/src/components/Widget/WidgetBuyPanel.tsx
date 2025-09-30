import { twMerge } from 'tailwind-merge'
import {
  DialogProps,
  DialogWrapper,
  OpenDialogFunction
} from '../common/Dialog2'
import { WidgetHeaderRow } from './WidgetHeaderRow'
import { TransferPanelMain } from '../TransferPanel/TransferPanelMain'
import { BuyPanel } from '../BuyPanel'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { isBuyFeatureEnabled } from '../../util/queryParamUtils'

type WidgetTransferPanelProps = {
  openDialog: OpenDialogFunction
  dialogProps: DialogProps
}

export function WidgetBuyPanel({
  dialogProps,
  openDialog
}: WidgetTransferPanelProps) {
  const [{ disabledFeatures }] = useArbQueryParams()
  const showBuyPanel = isBuyFeatureEnabled({ disabledFeatures })

  return (
    <>
      <DialogWrapper {...dialogProps} />

      <div
        className={twMerge(
          'relative m-auto flex w-full flex-col gap-4 rounded-lg bg-transparent p-4 text-white'
        )}
      >
        <WidgetHeaderRow openDialog={openDialog} />
        <div
          className={twMerge(
            'relative grid w-full grid-cols-1 gap-4 rounded-lg bg-transparent text-white transition-all duration-300 min-[850px]:grid min-[850px]:grid-cols-1'
          )}
        >
          {/* Left/Top panel */}
          <div className="flex h-full flex-col gap-1 overflow-hidden">
            {showBuyPanel ? <BuyPanel /> : <TransferPanelMain />}
          </div>
        </div>
      </div>
    </>
  )
}
