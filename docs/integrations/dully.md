# Dully Integration Guide

## Overview

Dully is a takeaway/delivery platform. This integration receives webhook notifications when orders are completed, triggering the review request flow.

## Setup Instructions

### 1. Configure Integration in EasyRate Dashboard

1. Log in to your EasyRate dashboard
2. Navigate to **Settings** → **Integrations**
3. Click **Add Integration** → **Dully**
4. Copy the **Webhook URL** shown (e.g., `https://api.easyrate.app/api/v1/webhooks/dully/{businessId}`)
5. Note the **Webhook Secret** - you'll need this for Dully configuration

### 2. Configure Webhook in Dully

1. Log in to your Dully merchant dashboard
2. Navigate to **Settings** → **Integrations** → **Webhooks**
3. Add a new webhook:
   - **URL:** Paste the webhook URL from EasyRate
   - **Events:** Select "Order Completed"
   - **Secret:** Enter the webhook secret from EasyRate
4. Save and test the webhook

### 3. Verify Integration

1. Return to EasyRate dashboard
2. Click **Test Connection** on the Dully integration
3. You should see a success message

## Webhook Payload Format

Dully sends the following payload when an order is completed:

```json
{
  "event": "order.completed",
  "timestamp": "2024-01-15T14:30:00Z",
  "data": {
    "orderId": "dully-order-123",
    "completedAt": "2024-01-15T14:30:00Z",
    "customer": {
      "name": "Anders Jensen",
      "email": "anders@example.com",
      "phone": "+4512345678"
    },
    "restaurant": {
      "id": "restaurant-456",
      "name": "Pizza Place"
    },
    "orderDetails": {
      "total": 249.00,
      "currency": "DKK",
      "items": [
        { "name": "Pepperoni Pizza", "quantity": 2 }
      ]
    }
  }
}
```

## Timing Configuration

Default timing:
- **Delay:** 1 hour after order completion
- **Purpose:** Allows time for food delivery and consumption

To adjust the delay:
1. Go to **Settings** → **Integrations** → **Dully**
2. Modify **Notification Delay** (in minutes)
3. Save changes

## Webhook Security

The webhook endpoint verifies requests using HMAC-SHA256:

```
X-Dully-Signature: sha256=<signature>
```

The signature is computed as:
```
HMAC-SHA256(webhook_secret, request_body)
```

EasyRate automatically validates this signature and rejects requests with invalid or missing signatures.

## Troubleshooting

### Webhook Not Triggering

1. Verify the webhook URL is correct in Dully settings
2. Check that "Order Completed" event is selected
3. Test with a real order

### Signature Verification Failed

1. Verify the webhook secret matches in both Dully and EasyRate
2. Ensure the secret hasn't been regenerated

### Notifications Not Sending

1. Check the notification queue in EasyRate dashboard
2. Verify customer has valid phone/email
3. Review SMS/Email provider settings

### Customer Not Receiving SMS

1. Verify phone number format (+45XXXXXXXX)
2. Check SMS provider balance
3. Review notification status in dashboard

## API Endpoints

### Webhook Endpoint

```
POST /api/v1/webhooks/dully/{businessId}
```

### Manual Retry

If a notification fails, you can retry from the dashboard or via API:

```bash
POST /api/v1/notifications/{notificationId}/retry
Authorization: Bearer <token>
```

## Contact Support

For integration issues:
- **EasyRate Support:** support@easyrate.app
- **Dully Support:** [Dully's support channels]
