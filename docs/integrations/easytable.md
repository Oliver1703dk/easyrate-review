# EasyTable Integration Guide

## Overview

EasyTable is a restaurant booking platform. This integration polls the EasyTable API for completed bookings and triggers the review request flow.

## Setup Instructions

### 1. Obtain API Credentials from EasyTable

1. Log in to your EasyTable merchant dashboard
2. Navigate to **Settings** → **API Access**
3. Generate a new API key
4. Note down:
   - **API Key**
   - **Restaurant ID**

### 2. Configure Integration in EasyRate Dashboard

1. Log in to your EasyRate dashboard
2. Navigate to **Settings** → **Integrations**
3. Click **Add Integration** → **EasyTable**
4. Enter your credentials:
   - **API Key:** Your EasyTable API key
   - **Restaurant ID:** Your EasyTable restaurant ID
5. Click **Save & Test Connection**

### 3. Verify Integration

1. After saving, click **Test Connection**
2. The integration will attempt to fetch recent bookings
3. You should see a success message with booking count

## How It Works

1. EasyRate polls the EasyTable API every 15 minutes
2. Completed bookings are queued for review notifications
3. After the configured delay (default: 2 hours), customers receive review requests

## Timing Configuration

Default timing:
- **Poll Interval:** Every 15 minutes
- **Notification Delay:** 2 hours after booking end time
- **Purpose:** Ensures dining experience is complete before requesting feedback

To adjust the delay:
1. Go to **Settings** → **Integrations** → **EasyTable**
2. Modify **Notification Delay** (in minutes)
3. Save changes

## API Authentication

EasyRate authenticates with EasyTable using:

```
Authorization: Bearer <api_key>
X-Restaurant-ID: <restaurant_id>
```

## Data Retrieved

For each completed booking, EasyTable provides:

```json
{
  "bookingId": "et-booking-789",
  "status": "completed",
  "completedAt": "2024-01-15T21:00:00Z",
  "customer": {
    "name": "Maria Nielsen",
    "email": "maria@example.com",
    "phone": "+4587654321"
  },
  "booking": {
    "date": "2024-01-15",
    "time": "19:00",
    "partySize": 4,
    "tableNumber": "A12"
  },
  "restaurant": {
    "id": "restaurant-123",
    "name": "Fine Dining Copenhagen"
  }
}
```

## Troubleshooting

### Connection Test Fails

1. Verify API key is correct and active
2. Check Restaurant ID matches your EasyTable account
3. Ensure API access is enabled in EasyTable settings

### Bookings Not Being Detected

1. Verify bookings are marked as "completed" in EasyTable
2. Check polling schedule (every 15 minutes)
3. Review integration logs in dashboard

### Duplicate Notifications

The system tracks processed bookings by ID. If duplicates occur:
1. Check for multiple integrations configured
2. Review notification history for patterns
3. Contact support if issue persists

### Notifications Delayed

1. Review queue status in dashboard
2. Check notification processor logs
3. Verify SMS/Email provider configuration

## Rate Limits

- **EasyTable API:** Respects rate limits (typically 60 requests/minute)
- **EasyRate Polling:** Every 15 minutes per integration
- **Notification Sending:** Batched, up to 10 per minute

## Manual Sync

To manually trigger a sync:

1. Go to **Settings** → **Integrations** → **EasyTable**
2. Click **Sync Now**
3. New completed bookings will be queued immediately

## API Endpoints

### Check Integration Status

```bash
GET /api/v1/businesses/{businessId}/integrations/easytable/status
Authorization: Bearer <token>
```

### Manual Sync

```bash
POST /api/v1/businesses/{businessId}/integrations/easytable/sync
Authorization: Bearer <token>
```

## Best Practices

1. **Test with Real Bookings:** Make a test booking and complete it to verify the full flow
2. **Monitor Queue:** Regularly check the notification queue for stuck items
3. **Review Timing:** Adjust notification delay based on typical dining duration
4. **Customer Communication:** Inform staff about the review system so they can mention it to guests

## Contact Support

For integration issues:
- **EasyRate Support:** support@easyrate.app
- **EasyTable Support:** [EasyTable's support channels]
