# Dully Integration Implementation Plan

## Overview

This document outlines the implementation plan for integrating EasyRate with Dully's webhook-based order notification system. The integration enables automated review requests to customers after they complete takeaway/delivery orders through Dully.

---

## Current State Analysis

### What's Already Implemented

| Component | Status | Location |
|-----------|--------|----------|
| DullyAdapter class | ✅ Done | `apps/backend/src/integrations/dully/DullyAdapter.ts` |
| Webhook route | ✅ Done | `apps/backend/src/routes/webhooks/dully.ts` |
| Payload types | ✅ Done | `packages/shared/src/types/integration.ts` |
| Zod validation schema | ✅ Done | `packages/shared/src/schemas/integration.ts` |
| HMAC signature verification | ✅ Done | Basic implementation in adapter |
| Order queue integration | ✅ Done | 60-minute delay configured |
| Multi-tenant routing | ✅ Done | `/webhooks/dully/:businessId` |

### Current Implementation Details

**Webhook Endpoint**: `POST /api/v1/webhooks/dully/:businessId`

**Current Signature Verification**:
- Header: `x-dully-signature`
- Method: Simple `HMAC-SHA256(webhookSecret, JSON.stringify(body))`
- Timing-safe comparison: Yes

**Event Handling**:
- Processes: `order.picked_up` only
- Skips: `order.completed`
- Missing: `order.approved`, `order.cancelled`

**Payload Structure** (current):
```typescript
interface DullyWebhookPayload {
  event: 'order.completed' | 'order.picked_up';
  orderId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  totalAmount?: number;
  timestamp: string;
  restaurantId: string;
  signature?: string;
}
```

---

## Gap Analysis

Comparing current implementation against Dully's Standard Webhooks specification:

### 1. Webhook Headers (HIGH PRIORITY)

| Required Header | Current | Expected |
|-----------------|---------|----------|
| `webhook-topic` | ❌ Missing | Event type (e.g., "order.approved") |
| `webhook-timestamp` | ❌ Missing | Unix timestamp of event |
| `webhook-source` | ❌ Missing | "dully" |
| `webhook-signature` | ❌ Using `x-dully-signature` | "v1,{base64_hash}" format |
| `webhook-id` | ❌ Missing | Unique event identifier |

### 2. Signature Validation (HIGH PRIORITY)

**Current**: `HMAC-SHA256(secret, payload)`

**Required (Standard Webhooks)**:
```
signed_payload = "{webhook-timestamp}.{webhook-id}.{body}"
signature = HMAC-SHA256(secret, signed_payload)
format = "v1,{base64(signature)}"
```

### 3. Replay Protection (MEDIUM PRIORITY)

- **Current**: None
- **Required**: Reject events with timestamp older than 5 minutes

### 4. Event Types (MEDIUM PRIORITY)

| Event | Current Handling | Required |
|-------|-----------------|----------|
| `order.picked_up` | ✅ Process | ✅ Process → queue review |
| `order.completed` | ⏭️ Skip | ⏭️ Skip (Dully internal) |
| `order.approved` | ❌ Unknown | ✅ Process → queue review |
| `order.cancelled` | ❌ Missing | ✅ Cancel pending review |

### 5. Payload Structure (LOW-MEDIUM PRIORITY)

Current payload doesn't follow Schema.org/Order. Need to confirm actual Dully payload structure and adapt accordingly.

### 6. Onboarding UI (MEDIUM PRIORITY)

Missing frontend components:
- [ ] "Connect to Dully" button in integrations section
- [ ] Webhook URL generator (displays unique URL for business)
- [ ] Webhook secret input field
- [ ] Step-by-step setup instructions
- [ ] Connection status indicator

### 7. Connection Monitoring (LOW PRIORITY)

Missing:
- [ ] `lastWebhookReceivedAt` tracking per business
- [ ] Dashboard status indicator ("Connected", "Last order: X")
- [ ] Webhook health monitoring/alerts

---

## Implementation Plan

### Phase 1: Standard Webhooks Compliance (Critical)

Updates needed to align with https://www.standardwebhooks.com/

#### Task 1.1: Update Webhook Headers Handling

**File**: `apps/backend/src/routes/webhooks/dully.ts`

**Changes**:
```typescript
// Extract Standard Webhooks headers
const webhookId = req.headers['webhook-id'] as string;
const webhookTimestamp = req.headers['webhook-timestamp'] as string;
const webhookSignature = req.headers['webhook-signature'] as string;
const webhookTopic = req.headers['webhook-topic'] as string;
const webhookSource = req.headers['webhook-source'] as string;

// Validate required headers exist
if (!webhookId || !webhookTimestamp || !webhookSignature) {
  throw new UnauthorizedError('Manglende webhook headers');
}

// Optionally verify source is "dully"
if (webhookSource && webhookSource !== 'dully') {
  throw new UnauthorizedError('Ugyldig webhook kilde');
}
```

#### Task 1.2: Implement Standard Webhooks Signature Verification

**File**: `apps/backend/src/integrations/dully/DullyAdapter.ts`

**Changes**:
```typescript
verifyStandardWebhookSignature(
  payload: string,
  signature: string,
  webhookId: string,
  timestamp: string
): boolean {
  if (!this.config?.webhookSecret) {
    return false;
  }

  // Standard Webhooks signed payload format
  const signedPayload = `${timestamp}.${webhookId}.${payload}`;

  // Compute expected signature
  const expectedSignature = crypto
    .createHmac('sha256', this.config.webhookSecret)
    .update(signedPayload)
    .digest('base64');

  // Parse version prefix from signature header (e.g., "v1,abc123=")
  const signatures = signature.split(' ');
  for (const sig of signatures) {
    const [version, hash] = sig.split(',');
    if (version === 'v1' && hash) {
      try {
        return crypto.timingSafeEqual(
          Buffer.from(hash, 'base64'),
          Buffer.from(expectedSignature, 'base64')
        );
      } catch {
        continue;
      }
    }
  }

  return false;
}
```

#### Task 1.3: Implement Replay Protection

**File**: `apps/backend/src/integrations/dully/DullyAdapter.ts`

**Changes**:
```typescript
const WEBHOOK_TOLERANCE_SECONDS = 300; // 5 minutes

isTimestampValid(timestamp: string): boolean {
  const webhookTime = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);

  // Reject if timestamp is too old or in the future
  return Math.abs(now - webhookTime) <= WEBHOOK_TOLERANCE_SECONDS;
}
```

**Update webhook route**:
```typescript
// Verify timestamp is recent (replay protection)
if (!dullyAdapter.isTimestampValid(webhookTimestamp)) {
  throw new UnauthorizedError('Webhook tidsstempel udløbet');
}
```

#### Task 1.4: Idempotency Check (Duplicate Prevention)

**File**: `apps/backend/src/services/OrderQueueService.ts`

The current implementation already has duplicate prevention via unique compound index `{businessId, orderId, platform}`. Verify this handles retries correctly.

**Additional**: Consider tracking `webhook-id` to prevent duplicate processing:

```typescript
// In webhook route, before processing
const existingOrder = await orderQueueService.findByWebhookId(businessId, webhookId);
if (existingOrder) {
  return res.status(200).json({ success: true, message: 'Already processed' });
}
```

---

### Phase 2: Event Type Handling

#### Task 2.1: Update Event Type Definitions

**File**: `packages/shared/src/types/integration.ts`

```typescript
export interface DullyWebhookPayload {
  event: 'order.created' | 'order.approved' | 'order.completed' | 'order.picked_up' | 'order.cancelled';
  orderId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  totalAmount?: number;
  timestamp: string;
  restaurantId: string;
  // Remove signature from payload - it comes in headers
}
```

#### Task 2.2: Update Zod Schema

**File**: `packages/shared/src/schemas/integration.ts`

```typescript
export const dullyWebhookPayloadSchema = z.object({
  event: z.enum([
    'order.created',
    'order.approved',
    'order.completed',
    'order.picked_up',
    'order.cancelled'
  ]),
  orderId: z.string().min(1),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional(),
  totalAmount: z.number().optional(),
  timestamp: z.string(),
  restaurantId: z.string(),
});
```

#### Task 2.3: Handle order.approved Events

**File**: `apps/backend/src/integrations/dully/DullyAdapter.ts`

```typescript
shouldProcess(payload: DullyWebhookPayload): boolean {
  // Process both picked_up and approved events
  return ['order.picked_up', 'order.approved'].includes(payload.event);
}
```

#### Task 2.4: Handle order.cancelled Events

**File**: `apps/backend/src/routes/webhooks/dully.ts`

Add cancellation logic:

```typescript
// Handle cancellation events
if (payload.event === 'order.cancelled') {
  const cancelled = await orderQueueService.cancelByOrderId(
    businessId,
    payload.orderId,
    'dully'
  );

  console.log(
    `[DullyWebhook] Order ${payload.orderId} cancellation ${cancelled ? 'processed' : 'not found'}`
  );

  return res.status(200).json({
    success: true,
    message: cancelled ? 'Ordre annulleret' : 'Ordre ikke fundet',
  });
}
```

**File**: `apps/backend/src/services/OrderQueueService.ts`

Add cancellation method:

```typescript
async cancelByOrderId(
  businessId: string,
  orderId: string,
  platform: string
): Promise<boolean> {
  const result = await OrderQueue.updateOne(
    {
      businessId,
      'orderData.orderId': orderId,
      'orderData.platform': platform,
      status: 'pending',
    },
    {
      $set: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}
```

---

### Phase 3: Onboarding UI

#### Task 3.1: Webhook URL Generation Component

**File**: `apps/frontend/src/components/integrations/DullySetup.tsx`

```tsx
function DullySetup({ businessId }: { businessId: string }) {
  const webhookUrl = `${API_BASE_URL}/api/v1/webhooks/dully/${businessId}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forbind til Dully</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          <li>
            <Label>1. Kopier din webhook URL</Label>
            <div className="flex gap-2 mt-1">
              <Input value={webhookUrl} readOnly />
              <Button onClick={() => copyToClipboard(webhookUrl)}>
                Kopier
              </Button>
            </div>
          </li>
          <li>
            <Label>2. Log ind på Dully dashboard</Label>
            <p className="text-sm text-muted-foreground">
              Gå til Integrationer → Webhooks
            </p>
          </li>
          <li>
            <Label>3. Tilføj webhook URL og kopier din signing secret</Label>
          </li>
          <li>
            <Label>4. Indsæt din signing secret her</Label>
            <Input
              type="password"
              placeholder="whsec_..."
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
            />
          </li>
        </ol>
        <Button onClick={saveIntegration} className="mt-4">
          Gem forbindelse
        </Button>
      </CardContent>
    </Card>
  );
}
```

#### Task 3.2: Integration Status API

**File**: `apps/backend/src/routes/integrations.ts`

Add endpoint to save Dully configuration:

```typescript
// POST /api/v1/integrations/dully
router.post('/dully', authenticateJWT, async (req, res) => {
  const { webhookSecret } = req.body;
  const businessId = req.user.businessId;

  // Validate secret format (should start with whsec_)
  if (!webhookSecret?.startsWith('whsec_')) {
    throw new ValidationError('Ugyldig signing secret format');
  }

  // Update or add Dully integration
  await Business.findByIdAndUpdate(businessId, {
    $set: {
      'integrations.$[elem].webhookSecret': webhookSecret,
      'integrations.$[elem].enabled': true,
      'integrations.$[elem].connectedAt': new Date(),
    },
  }, {
    arrayFilters: [{ 'elem.platform': 'dully' }],
    upsert: true,
  });

  res.json({ success: true });
});
```

#### Task 3.3: Connection Status Tracking

**File**: `packages/shared/src/types/business.ts`

Update IntegrationConfig:

```typescript
export interface IntegrationConfig {
  platform: 'dully' | 'easytable';
  apiKey?: string;
  webhookSecret?: string;
  enabled: boolean;
  settings?: Record<string, unknown>;
  // New fields
  connectedAt?: Date;
  lastWebhookAt?: Date;
  webhookCount?: number;
}
```

**File**: `apps/backend/src/routes/webhooks/dully.ts`

Update last received timestamp on successful webhook:

```typescript
// After successful processing
await Business.updateOne(
  { _id: businessId, 'integrations.platform': 'dully' },
  {
    $set: { 'integrations.$.lastWebhookAt': new Date() },
    $inc: { 'integrations.$.webhookCount': 1 },
  }
);
```

---

### Phase 4: Payload Structure Alignment

#### Task 4.1: Confirm Actual Dully Payload Structure

**Action**: Request sample webhook payload from Dully (Laurent/Frank) to confirm:
- Schema.org/Order compliance level
- Actual field names and structure
- All possible event types

#### Task 4.2: Update Types Based on Actual Structure

Once confirmed, update `DullyWebhookPayload` interface to match Schema.org/Order structure if applicable:

```typescript
// Example if Dully uses Schema.org/Order
interface DullyWebhookPayload {
  '@context': 'https://schema.org';
  '@type': 'Order';
  orderNumber: string;
  orderStatus: 'OrderDelivered' | 'OrderCancelled' | 'OrderProcessing';
  customer: {
    '@type': 'Person';
    name?: string;
    email?: string;
    telephone?: string;
  };
  merchant: {
    '@type': 'Restaurant';
    name: string;
    identifier: string;
  };
  orderDate: string;
  // ... etc
}
```

---

### Phase 5: Testing & Monitoring

#### Task 5.1: Unit Tests for Signature Verification

**File**: `apps/backend/tests/integrations/dully/DullyAdapter.test.ts`

```typescript
describe('DullyAdapter', () => {
  describe('verifyStandardWebhookSignature', () => {
    it('should verify valid signature', () => {
      const secret = 'whsec_test123';
      const webhookId = 'evt_123';
      const timestamp = '1234567890';
      const payload = '{"event":"order.approved"}';

      // Generate valid signature
      const signedPayload = `${timestamp}.${webhookId}.${payload}`;
      const signature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('base64');

      adapter.connect({ platform: 'dully', webhookSecret: secret, enabled: true });

      expect(
        adapter.verifyStandardWebhookSignature(payload, `v1,${signature}`, webhookId, timestamp)
      ).toBe(true);
    });

    it('should reject invalid signature', () => { /* ... */ });
    it('should reject expired timestamp', () => { /* ... */ });
  });
});
```

#### Task 5.2: Integration Tests for Webhook Endpoint

**File**: `apps/backend/tests/routes/webhooks/dully.test.ts`

```typescript
describe('POST /api/v1/webhooks/dully/:businessId', () => {
  it('should process valid order.approved event', async () => {
    const business = await createTestBusiness({ dullySecret: 'whsec_test' });
    const payload = { event: 'order.approved', orderId: '123', /* ... */ };

    const response = await request(app)
      .post(`/api/v1/webhooks/dully/${business._id}`)
      .set('webhook-id', 'evt_123')
      .set('webhook-timestamp', String(Math.floor(Date.now() / 1000)))
      .set('webhook-signature', generateSignature(payload, 'whsec_test'))
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should reject expired timestamp', () => { /* ... */ });
  it('should cancel pending order on cancellation event', () => { /* ... */ });
});
```

#### Task 5.3: Webhook Health Monitoring

Add logging and alerting for:
- Signature verification failures
- High error rates per business
- Stale connections (no webhooks in X days)

---

## Implementation Priority

| Priority | Task | Effort | Risk |
|----------|------|--------|------|
| 🔴 Critical | 1.1-1.3 Standard Webhooks headers & signature | 4h | High - security |
| 🔴 Critical | 1.4 Idempotency check | 1h | Medium - duplicates |
| 🟡 High | 2.1-2.4 Event type handling | 3h | Medium - missed orders |
| 🟡 High | 3.1-3.3 Onboarding UI | 6h | Medium - UX |
| 🟢 Medium | 4.1-4.2 Payload structure | 2h | Low - depends on Dully |
| 🟢 Medium | 5.1-5.3 Testing & monitoring | 4h | Low - quality |

**Total Estimated Effort**: ~20 hours

---

## Action Items

### Immediate (Before Go-Live)

- [ ] **Confirm with Dully**: Request exact webhook headers and payload format
- [ ] **Implement Phase 1**: Standard Webhooks compliance
- [ ] **Implement Phase 2**: Event type handling
- [ ] **Test with Dully demo**: Validate end-to-end flow

### Short-term

- [ ] **Implement Phase 3**: Onboarding UI
- [ ] **Implement Phase 5**: Testing suite

### Future

- [ ] **Phase 4**: Payload structure alignment (after Dully confirmation)
- [ ] Automated monitoring and alerts
- [ ] Dashboard analytics for webhook success rates

---

## Dependencies & Coordination

| Dependency | Owner | Status |
|------------|-------|--------|
| Dully webhook documentation | Dully (Laurent/Frank) | Pending - need confirmation |
| Sample webhook payloads | Dully | Pending |
| Test webhook endpoint access | Dully | Pending |
| Frontend integration section | EasyRate Frontend | Not started |

---

## Questions for Dully

1. **Headers**: Are you using Standard Webhooks headers (`webhook-id`, `webhook-timestamp`, `webhook-signature`, `webhook-topic`, `webhook-source`)?

2. **Signature format**: Is the signature in `v1,{base64_hash}` format with signed payload `{timestamp}.{webhook-id}.{body}`?

3. **Events**: Which events do you send? (`order.approved`, `order.picked_up`, `order.cancelled`, others?)

4. **Payload**: Do you follow Schema.org/Order structure? Can we get a sample payload?

5. **Retry policy**: What's your retry strategy for failed webhook deliveries?

6. **Testing**: Do you have a sandbox/demo environment for testing webhooks?

---

## Appendix: Standard Webhooks Reference

From https://www.standardwebhooks.com/:

### Headers

```
webhook-id: evt_1234567890
webhook-timestamp: 1614265330
webhook-signature: v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=
```

### Signature Verification

```
signed_payload = "${webhook-timestamp}.${webhook-id}.${body}"
expected_signature = Base64(HMAC-SHA256(secret, signed_payload))
```

### Tolerance

- Default: 5 minutes (300 seconds)
- Reject if `|current_time - webhook_timestamp| > tolerance`
