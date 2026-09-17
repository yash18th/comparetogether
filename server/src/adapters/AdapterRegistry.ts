import { PlatformAdapter, NormalizedPricing, PricingInput } from './PlatformAdapter.js';
import { ZomatoAdapter } from './ZomatoAdapter.js';
import { SwiggyAdapter } from './SwiggyAdapter.js';
import { EatClubAdapter } from './EatClubAdapter.js';
import { DirectMerchantAdapter } from './DirectMerchantAdapter.js';

export class AdapterRegistry {
  private static instance: AdapterRegistry;
  private adapters: Map<string, PlatformAdapter> = new Map();

  private constructor() {
    this.register(new ZomatoAdapter());
    this.register(new SwiggyAdapter());
    this.register(new EatClubAdapter());
    this.register(new DirectMerchantAdapter());
  }

  public static getInstance(): AdapterRegistry {
    if (!AdapterRegistry.instance) {
      AdapterRegistry.instance = new AdapterRegistry();
    }
    return AdapterRegistry.instance;
  }

  public register(adapter: PlatformAdapter) {
    this.adapters.set(adapter.metadata.code, adapter);
  }

  public getAdapter(code: string): PlatformAdapter | undefined {
    return this.adapters.get(code);
  }

  public getAllAdapters(): PlatformAdapter[] {
    return Array.from(this.adapters.values());
  }

  public getSupportedPlatforms() {
    return this.getAllAdapters().map(a => a.metadata);
  }
}
