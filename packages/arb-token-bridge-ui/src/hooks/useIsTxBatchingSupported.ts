import { useCapabilities } from 'wagmi';

export function useIsTxBatchingSupported(chainId: number) {
  const { data: capabilities } = useCapabilities();

  const v1BatchSupported = capabilities?.[chainId]?.atomicBatch?.supported;
  const v2BatchStatus = capabilities?.[chainId]?.atomic?.status;
  const v2BatchSupported = v2BatchStatus === 'supported' || v2BatchStatus === 'ready';
  const isTxBatchingSupported = v1BatchSupported || v2BatchSupported;

  return isTxBatchingSupported;
}
