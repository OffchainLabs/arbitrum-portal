import { OpportunityCategory } from '@/app-types/earn/vaults';

import { VaultsAdapter } from './adapters/VaultsAdapter';
import { ValidationError } from './lib/validation';
import type { VendorAdapter } from './types';

export class CategoryRouter {
  private readonly lendAdapter: VendorAdapter;

  constructor() {
    this.lendAdapter = new VaultsAdapter();
  }

  routeToAdapter(category: OpportunityCategory): VendorAdapter {
    if (category !== OpportunityCategory.Lend) {
      throw new ValidationError(
        'UNSUPPORTED_CATEGORY',
        `Category "${category}" is not supported in this phase. Supported categories: ${OpportunityCategory.Lend}`,
        501,
      );
    }
    return this.lendAdapter;
  }

  getAllAdapters(): VendorAdapter[] {
    return [this.lendAdapter];
  }
}
