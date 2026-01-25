import type { IntegrationAdapter, IntegrationConfig, OrderHandler, OrderData } from '@easyrate/shared';

export abstract class BaseAdapter implements IntegrationAdapter {
  abstract readonly name: string;

  protected config: IntegrationConfig | null = null;
  protected connected: boolean = false;
  protected handlers: OrderHandler[] = [];

  get isConnected(): boolean {
    return this.connected;
  }

  get currentConfig(): IntegrationConfig | null {
    return this.config;
  }

  async connect(config: IntegrationConfig): Promise<void> {
    if (!config.enabled) {
      throw new Error(`Integration ${this.name} is not enabled`);
    }

    this.config = config;
    this.connected = true;
    console.log(`[${this.name}] Connected with config`);
  }

  async disconnect(): Promise<void> {
    this.config = null;
    this.connected = false;
    this.handlers = [];
    console.log(`[${this.name}] Disconnected`);
  }

  async testConnection(): Promise<boolean> {
    return this.connected && this.config !== null;
  }

  onOrderComplete(handler: OrderHandler): void {
    this.handlers.push(handler);
    console.log(`[${this.name}] Order handler registered (total: ${this.handlers.length})`);
  }

  protected async notifyHandlers(order: OrderData): Promise<void> {
    console.log(`[${this.name}] Notifying ${this.handlers.length} handlers for order ${order.orderId}`);

    for (const handler of this.handlers) {
      try {
        await handler(order);
      } catch (error) {
        console.error(`[${this.name}] Handler error for order ${order.orderId}:`, error);
      }
    }
  }

  protected validateConfig(): void {
    if (!this.config) {
      throw new Error(`${this.name} not configured`);
    }
    if (!this.connected) {
      throw new Error(`${this.name} not connected`);
    }
  }

  protected log(message: string, data?: unknown): void {
    if (data) {
      console.log(`[${this.name}] ${message}`, data);
    } else {
      console.log(`[${this.name}] ${message}`);
    }
  }

  protected logError(message: string, error: unknown): void {
    console.error(`[${this.name}] ${message}`, error);
  }
}
