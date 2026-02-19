# EasyRate Development Guide

## Project Overview

EasyRate is a SaaS review management platform that automates customer feedback collection for restaurants and service businesses. The system integrates with booking/takeaway platforms (Dully, EasyTable) to trigger SMS/email review requests after orders, collects feedback through mobile-optimized landing pages, and provides a business dashboard.

### Core Flow

1. Customer completes order/booking on integrated platform
2. System sends SMS (primary) or email after configurable delay
3. Customer clicks link → mobile landing page with 1-5 star rating
4. Negative (1-3): Private feedback form | Positive (4-5): Google review prompt
5. Business views feedback in admin dashboard

## Tech Stack

- **Frontend**: React.js + TypeScript, Tailwind CSS + shadcn/ui, Vercel
- **Backend**: Node.js + TypeScript, Express.js, REST API + Webhooks
- **Database**: MongoDB (multi-tenant with `business_id` scoping)
- **File Storage**: AWS S3 (EU region: eu-central-1)
- **SMS**: InMobile (alphanumeric sender ID)
- **Email**: SendGrid or AWS SES
- **Monorepo**: pnpm workspaces + Turborepo

## Project Structure

```
/apps
  /frontend          # React dashboard + landing pages
  /backend           # Express.js API server
/packages
  /shared            # Types, schemas, constants
  /ui                # Shared UI components
```

## Key Patterns

### Multi-Tenancy
All data models include `business_id`. Every database query must be scoped by tenant.

### Integration Adapters
Integrations use a common adapter interface for extensibility:

```typescript
interface IntegrationAdapter {
  name: string;
  connect(config: IntegrationConfig): Promise<void>;
  testConnection(): Promise<boolean>;
  onOrderComplete(handler: OrderHandler): void;
}
```

### Provider Abstraction
SMS/Email providers are abstracted behind interfaces to allow switching:

```typescript
interface MessageProvider {
  send(message: Message): Promise<SendResult>;
  getStatus(messageId: string): Promise<MessageStatus>;
}
```

## Data Models

- **Business**: Account with integrations config, message templates, branding
- **Review**: Customer feedback with rating (1-5), text, photos, source platform
- **Notification**: SMS/email tracking with status and delivery info

Reserved fields for future: `location_id`, `metadata` (JSON), `tags` (array)

## Integrations

| Platform   | Type     | Trigger Delay |
|------------|----------|---------------|
| Dully      | Webhook  | 1 hour after pickup |
| EasyTable  | REST API | 2 hours after booking |

## Language & Locale

- Primary language: Danish
- All customer-facing UI and messages in Danish
- Example: "Hvordan var din oplevelse?" (How was your experience?)

## Compliance Requirements

- **GDPR**: EU data hosting, consent tracking, data retention, deletion/export capability
- **Legal**: Both positive and negative paths must offer external review option
- **No incentivization**: Cannot offer discounts for reviews

## Development Guidelines

1. Use TypeScript strict mode throughout
2. Validate all API inputs with Zod schemas
3. Keep business logic in service layer, not components
4. Use adapter pattern for all external integrations
5. Scope all database queries by `business_id`
6. Handle Danish characters properly in SMS

## Testing Strategy

1. Write unit tests for all service layer functions
2. Integration tests for API endpoints using supertest
3. Use Vitest as test runner (fast, TypeScript-native)
4. Mock external services (SMS, email, S3) in tests
5. Test coverage targets: Services 80%, API routes 70%
6. Test Danish character handling explicitly
7. E2E tests for critical flows (rating submission, notification delivery)

### Test File Location

Separate `/tests` folder mirroring `/src` structure:

```
/apps
  /backend
    /src
    /tests              # Mirrors /src structure
      /services
      /routes
      /integrations
  /frontend
    /src
    /tests
```

- Test files: `*.test.ts` or `*.spec.ts`
- Test utilities and mocks: `/tests/__mocks__/`

## API Structure

- API versioning: `/api/v1/`
- Authentication: JWT for dashboard, API keys for integrations
- Error responses: Structured JSON with error codes

## Environment

- Cloud region: AWS eu-central-1 (Frankfurt)
- Domain: api.easyrate.app
