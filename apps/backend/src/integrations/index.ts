export { BaseAdapter } from './BaseAdapter.js';
export { IntegrationRegistry, type IntegrationStatus } from './IntegrationRegistry.js';
export { initializeIntegrations, shutdownIntegrations } from './initialize.js';

// Platform-specific exports
export * from './dully/index.js';
export * from './easytable/index.js';
