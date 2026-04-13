import { OpportunityCategory } from '@/app-types/earn/vaults';

import { LiFiAdapter } from './adapters/LiFiAdapter';
import { PendleAdapter } from './adapters/PendleAdapter';
import { VaultsAdapter } from './adapters/VaultsAdapter';
import { ValidationError } from './lib/validation';
import type { VendorAdapter } from './types';

export class CategoryRouter {
  private readonly lendAdapter: VendorAdapter;
  private readonly liquidStakingAdapter: VendorAdapter;
  private readonly fixedYieldAdapter: VendorAdapter;

  constructor() {
    this.lendAdapter = new VaultsAdapter();
    this.liquidStakingAdapter = new LiFiAdapter();
    this.fixedYieldAdapter = new PendleAdapter();
  }

  routeToAdapter(category: OpportunityCategory): VendorAdapter {
    switch (category) {
      case OpportunityCategory.Lend:
        return this.lendAdapter;
      case OpportunityCategory.LiquidStaking:
        return this.liquidStakingAdapter;
      case OpportunityCategory.FixedYield:
        return this.fixedYieldAdapter;
      default:
        throw new ValidationError(
          'UNSUPPORTED_CATEGORY',
          `Category "${category}" is not supported. Supported categories: ${OpportunityCategory.Lend}, ${OpportunityCategory.LiquidStaking}, ${OpportunityCategory.FixedYield}`,
          501,
        );
    }
  }

  getAllAdapters(): VendorAdapter[] {
    return [this.lendAdapter, this.liquidStakingAdapter, this.fixedYieldAdapter];
  }
}
