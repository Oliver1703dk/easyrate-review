import { INTEGRATION_DELAYS } from '@easyrate/shared';
import { IntegrationRegistry } from './IntegrationRegistry.js';
import { dullyAdapter } from './dully/index.js';
import { easyTableAdapter, easyTablePoller } from './easytable/index.js';
import { orderQueueService } from '../services/OrderQueueService.js';
import { startQueueProcessor, stopQueueProcessor } from '../jobs/processOrderQueue.js';
import { startNotificationProcessor, stopNotificationProcessor } from '../jobs/processNotifications.js';
import { startInsightsProcessor, stopInsightsProcessor } from '../jobs/processInsights.js';

export async function initializeIntegrations(): Promise<void> {
  console.log('[Integrations] Initializing integration layer...');

  // Register adapters with the registry
  IntegrationRegistry.register(dullyAdapter);
  IntegrationRegistry.register(easyTableAdapter);

  // Set up order handlers for both adapters
  const handleOrder = async (businessId: string, order: Parameters<typeof orderQueueService.enqueue>[1]) => {
    const delay = INTEGRATION_DELAYS[order.platform];
    await orderQueueService.enqueue(businessId, order, delay);
  };

  // For Dully, the webhook route will handle business ID and call the handler
  // The adapter's onOrderComplete is for internal notification only
  dullyAdapter.onOrderComplete(async (order) => {
    console.log(`[Dully] Order complete event received: ${order.orderId}`);
    // Note: The actual queueing happens in the webhook route where we have businessId
  });

  // For EasyTable, set up the poller's order handler
  easyTablePoller.setOrderHandler(handleOrder);

  // Start the EasyTable poller
  await easyTablePoller.start();

  // Start the queue processor
  startQueueProcessor();

  // Start the notification processor
  startNotificationProcessor();

  // Start the insights processor (for scheduled AI analysis)
  startInsightsProcessor();

  console.log('[Integrations] Integration layer initialized');
  console.log(`[Integrations] Registered adapters: ${IntegrationRegistry.getAllNames().join(', ')}`);
}

export async function shutdownIntegrations(): Promise<void> {
  console.log('[Integrations] Shutting down integration layer...');

  // Stop the insights processor
  stopInsightsProcessor();

  // Stop the notification processor
  stopNotificationProcessor();

  // Stop the queue processor
  stopQueueProcessor();

  // Stop the EasyTable poller
  await easyTablePoller.stop();

  // Disconnect all adapters
  await IntegrationRegistry.disconnectAll();

  console.log('[Integrations] Integration layer shut down');
}
