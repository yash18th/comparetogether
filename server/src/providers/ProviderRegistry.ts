import { Provider, ProviderStatus } from './Provider.js';
import { SwiggyProvider } from './SwiggyProvider.js';
import { ZomatoProvider } from './ZomatoProvider.js';

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, Provider> = new Map();

  private constructor() {
    this.registerProvider(new SwiggyProvider());
    this.registerProvider(new ZomatoProvider());
  }

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  public registerProvider(provider: Provider): void {
    this.providers.set(provider.code.toLowerCase(), provider);
  }

  public getProvider(code: string): Provider | undefined {
    return this.providers.get(code.toLowerCase());
  }

  public getAllProviders(): Provider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Retrieves status of all registered providers
   */
  public async getStatuses(userId?: string): Promise<Record<string, ProviderStatus>> {
    const statuses: Record<string, ProviderStatus> = {};
    for (const [code, provider] of this.providers.entries()) {
      try {
        statuses[code] = await provider.getStatus(userId);
      } catch (err: any) {
        statuses[code] = {
          configured: false,
          authenticated: false,
          status: 'error',
          message: err.message || 'Status check failed'
        };
      }
    }
    return statuses;
  }
}
