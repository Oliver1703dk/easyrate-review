import type { IntegrationAdapter } from '@easyrate/shared';

export interface IntegrationStatus {
  name: string;
  connected: boolean;
  hasConfig: boolean;
}

class IntegrationRegistryClass {
  private adapters: Map<string, IntegrationAdapter> = new Map();
  private static instance: IntegrationRegistryClass;

  private constructor() {}

  static getInstance(): IntegrationRegistryClass {
    if (!IntegrationRegistryClass.instance) {
      IntegrationRegistryClass.instance = new IntegrationRegistryClass();
    }
    return IntegrationRegistryClass.instance;
  }

  register(adapter: IntegrationAdapter): void {
    if (this.adapters.has(adapter.name)) {
      console.warn(`[IntegrationRegistry] Adapter '${adapter.name}' already registered, replacing`);
    }
    this.adapters.set(adapter.name, adapter);
    console.log(`[IntegrationRegistry] Registered adapter: ${adapter.name}`);
  }

  get(platform: string): IntegrationAdapter | undefined {
    return this.adapters.get(platform);
  }

  getOrThrow(platform: string): IntegrationAdapter {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new Error(`Integration adapter '${platform}' not found`);
    }
    return adapter;
  }

  getAll(): IntegrationAdapter[] {
    return Array.from(this.adapters.values());
  }

  getAllNames(): string[] {
    return Array.from(this.adapters.keys());
  }

  has(platform: string): boolean {
    return this.adapters.has(platform);
  }

  async getStatus(platform: string): Promise<IntegrationStatus | null> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      return null;
    }

    return {
      name: adapter.name,
      connected: await adapter.testConnection(),
      hasConfig: true,
    };
  }

  async getAllStatuses(): Promise<IntegrationStatus[]> {
    const statuses: IntegrationStatus[] = [];

    for (const adapter of this.adapters.values()) {
      statuses.push({
        name: adapter.name,
        connected: await adapter.testConnection(),
        hasConfig: true,
      });
    }

    return statuses;
  }

  async disconnectAll(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      try {
        await adapter.disconnect();
      } catch (error) {
        console.error(`[IntegrationRegistry] Error disconnecting ${adapter.name}:`, error);
      }
    }
  }

  clear(): void {
    this.adapters.clear();
    console.log('[IntegrationRegistry] Cleared all adapters');
  }
}

export const IntegrationRegistry = IntegrationRegistryClass.getInstance();
