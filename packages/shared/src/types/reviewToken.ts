/**
 * Customer information embedded in review link JWT tokens
 */
export interface ReviewTokenCustomer {
  email?: string;
  phone?: string;
  name?: string;
}

/**
 * Payload for review link JWT tokens
 * Used to embed customer info in notification links for automatic capture
 */
export interface ReviewTokenPayload {
  businessId: string;
  customer?: ReviewTokenCustomer;
  orderId?: string;
  sourcePlatform?: 'dully' | 'easytable' | 'direct';
}
