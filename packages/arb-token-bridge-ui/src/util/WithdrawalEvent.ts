import type { L2ToL1EventResult } from '../hooks/arbTokenBridge.types';

export function getUniqueIdOrHashFromEvent(event: L2ToL1EventResult) {
  return 'hash' in event ? event.hash : event.uniqueId;
}
