import { OpportunityCategory } from '@/app-types/earn/vaults';

import { VaultsAdapter } from './adapters/VaultsAdapter';
import type { VendorAdapter } from './types';

export class CategoryRouter {
  private readonly lendAdapter: VendorAdapter;

  constructor() {
    this.lendAdapter = new VaultsAdapter();
  }

  routeToAdapter(category: OpportunityCategory): VendorAdapter {
    if (category !== OpportunityCategory.Lend) {
      throw new Error(`Unknown category: ${category}`);
    }
    return this.lendAdapter;
  }

  getAllAdapters(): VendorAdapter[] {
    return [this.lendAdapter];
  }
}
