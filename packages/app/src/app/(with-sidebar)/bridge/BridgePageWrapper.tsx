import { BridgePageProps, initializeBridgePage } from '../../../utils/bridgePageUtils';
import BridgeClient from './BridgeClient';

export default async function BridgePageWrapper({ searchParams, redirectPath }: BridgePageProps) {
  await initializeBridgePage(searchParams, redirectPath);

  return (
    <main className="relative flex h-full flex-1 flex-col overflow-y-auto">
      <BridgeClient />
    </main>
  );
}
