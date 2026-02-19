# EasyRate

A SaaS review management platform that automates customer feedback collection for restaurants and service businesses. EasyRate integrates with booking/takeaway platforms to trigger SMS/email review requests, collects feedback through mobile-optimized landing pages, and provides a business dashboard for analytics and management.

## Features

- **Automated Review Requests**: Send SMS/email requests after order completion
- **Smart Routing**: 1-3 star ratings → private feedback form, 4-5 stars → Google review prompt
- **Platform Integrations**: Dully (webhook) and EasyTable (polling) support
- **Business Dashboard**: Analytics, review management, and settings
- **Multi-tenant**: Full business isolation with `business_id` scoping
- **GDPR Compliant**: Consent tracking, data export, and deletion capabilities
- **Photo Uploads**: Customers can attach images to reviews via S3
- **Danish Language**: All customer-facing content in Danish

## Tech Stack

| Layer          | Technology                                          |
| -------------- | --------------------------------------------------- |
| Frontend       | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend        | Node.js, Express.js, TypeScript                     |
| Database       | MongoDB (Mongoose ODM)                              |
| File Storage   | AWS S3                                              |
| SMS Provider   | InMobile                                            |
| Email Provider | Resend                                              |
| Monorepo       | pnpm workspaces, Turborepo                          |
| Testing        | Vitest, Supertest, React Testing Library            |

## Project Structure

```
easyrate_review/
├── apps/
│   ├── frontend/                 # React dashboard + landing pages
│   │   ├── src/
│   │   │   ├── components/       # UI components
│   │   │   │   ├── dashboard/    # Admin dashboard components
│   │   │   │   ├── landing/      # Public review page components
│   │   │   │   └── shared/       # Reusable components
│   │   │   ├── contexts/         # React contexts (Auth)
│   │   │   ├── hooks/            # Custom hooks
│   │   │   ├── lib/              # API client
│   │   │   ├── pages/            # Route pages
│   │   │   │   ├── auth/         # Login, Register
│   │   │   │   ├── dashboard/    # Protected admin pages
│   │   │   │   └── landing/      # Public review submission
│   │   │   └── styles/           # Global styles
│   │   └── package.json
│   │
│   └── backend/                  # Express.js API
│       ├── src/
│       │   ├── routes/           # API endpoints
│       │   ├── services/         # Business logic
│       │   ├── models/           # Mongoose schemas
│       │   ├── middleware/       # Auth, validation, error handling
│       │   ├── integrations/     # Dully, EasyTable adapters
│       │   ├── providers/        # SMS, Email providers
│       │   ├── jobs/             # Background processors
│       │   ├── lib/              # Database, Sentry
│       │   └── utils/            # Helpers
│       └── package.json
│
├── packages/
│   ├── shared/                   # Shared types, schemas, constants
│   │   └── src/
│   │       ├── types/            # TypeScript interfaces
│   │       ├── schemas/          # Zod validation schemas
│   │       └── constants/        # Messages, defaults
│   └── ui/                       # Shared UI components
│
├── package.json                  # Root workspace config
├── pnpm-workspace.yaml           # pnpm monorepo config
├── turbo.json                    # Turborepo build config
└── tsconfig.json                 # TypeScript config
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- MongoDB (local or Atlas)
- AWS account (for S3)
- InMobile account (for SMS)
- Resend account (for Email)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd easyrate_review

# Install dependencies
pnpm install
```

### Environment Setup

Create `.env` files in the respective app directories:

**Backend** (`apps/backend/.env`):

```env
# Server
NODE_ENV=development
PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/easyrate

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Frontend URL (for CORS and review links)
FRONTEND_URL=http://localhost:5173

# AWS S3
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=your-bucket-name
S3_UPLOAD_URL_EXPIRY=300
S3_DOWNLOAD_URL_EXPIRY=3600

# SMS (InMobile)
INMOBILE_API_KEY=your-inmobile-api-key
INMOBILE_SENDER_ID=EasyRate

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=EasyRate

# Error Tracking (optional)
SENTRY_DSN=your-sentry-dsn
```

**Frontend** (`apps/frontend/.env`):

```env
VITE_API_BASE=/api/v1
```

### Running the Application

```bash
# Development mode (all apps)
pnpm run dev

# Or run individually:
pnpm --filter @easyrate/backend dev    # Backend on port 3001
pnpm --filter @easyrate/frontend dev   # Frontend on port 5173
```

### Building for Production

```bash
# Build all packages
pnpm run build

# Start production server
pnpm --filter @easyrate/backend start
```

## Architecture

### Review Collection Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Order Complete │ ──▶ │  Queue + Delay   │ ──▶ │  Send SMS/Email │
│  (Dully/        │     │  (OrderQueue)    │     │  with link      │
│   EasyTable)    │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Thank You      │ ◀── │  Submit Review   │ ◀── │  Customer clicks│
│  Screen         │     │  (1-5 stars)     │     │  link           │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
           ┌───────────────┐     ┌───────────────┐
           │  1-3 stars:   │     │  4-5 stars:   │
           │  Private      │     │  Google       │
           │  feedback     │     │  review       │
           │  form         │     │  prompt       │
           └───────────────┘     └───────────────┘
```

### Integration Adapters

EasyRate uses an adapter pattern for platform integrations:

```typescript
interface IntegrationAdapter {
  name: string;
  connect(config: IntegrationConfig): Promise<void>;
  testConnection(): Promise<boolean>;
  onOrderComplete(handler: OrderHandler): void;
}
```

**Supported Integrations:**

| Platform  | Type               | Trigger            | Default Delay |
| --------- | ------------------ | ------------------ | ------------- |
| Dully     | Webhook            | Order pickup       | 1 hour        |
| EasyTable | REST API (polling) | Booking completion | 2 hours       |

### Message Providers

SMS and Email providers are abstracted behind a common interface:

```typescript
interface MessageProvider {
  send(message: Message): Promise<SendResult>;
  getStatus(messageId: string): Promise<MessageStatus>;
}
```

### Background Jobs

| Job                   | Interval   | Purpose                                     |
| --------------------- | ---------- | ------------------------------------------- |
| OrderQueueProcessor   | 60 seconds | Process queued orders, create notifications |
| NotificationProcessor | 10 seconds | Send pending notifications, handle retries  |

## API Reference

**Base URL**: `/api/v1`

### Authentication

| Endpoint         | Method | Description           |
| ---------------- | ------ | --------------------- |
| `/auth/register` | POST   | Register new business |
| `/auth/login`    | POST   | Login                 |
| `/auth/me`       | GET    | Get current user      |
| `/auth/refresh`  | POST   | Refresh JWT token     |

### Reviews (Protected)

| Endpoint         | Method | Description               |
| ---------------- | ------ | ------------------------- |
| `/reviews`       | GET    | List reviews with filters |
| `/reviews/:id`   | GET    | Get single review         |
| `/reviews/stats` | GET    | Get review statistics     |
| `/reviews/:id`   | DELETE | Delete review             |

**Query Parameters for listing:**

- `page`, `limit` - Pagination
- `rating` - Filter by rating (1-5)
- `sourcePlatform` - Filter by platform
- `fromDate`, `toDate` - Date range
- `search` - Text search

### Business (Protected)

| Endpoint                                     | Method    | Description          |
| -------------------------------------------- | --------- | -------------------- |
| `/businesses/me`                             | GET       | Get current business |
| `/businesses/me`                             | PATCH     | Update business      |
| `/businesses/me/settings`                    | GET/PATCH | Business settings    |
| `/businesses/me/integrations`                | GET       | List integrations    |
| `/businesses/me/integrations/:platform`      | PATCH     | Update integration   |
| `/businesses/me/integrations/:platform/test` | POST      | Test connection      |

### Public Review Submission

| Endpoint               | Method | Description           |
| ---------------------- | ------ | --------------------- |
| `/r/:token`            | GET    | Get landing page data |
| `/r/:token`            | POST   | Submit review         |
| `/r/:token/upload-url` | POST   | Get S3 presigned URL  |

### GDPR

| Endpoint                | Method | Description             |
| ----------------------- | ------ | ----------------------- |
| `/gdpr/export`          | POST   | Export business data    |
| `/gdpr/export/customer` | POST   | Export customer data    |
| `/gdpr/customer`        | DELETE | Delete customer data    |
| `/gdpr/account`         | DELETE | Delete business account |

### Webhooks

| Endpoint             | Method | Description         |
| -------------------- | ------ | ------------------- |
| `/webhooks/dully`    | POST   | Dully order webhook |
| `/webhooks/inmobile` | POST   | SMS status updates  |
| `/webhooks/resend`   | POST   | Email event updates |

## Data Models

### Review

```typescript
{
  id: string;
  businessId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  feedbackText?: string;
  customer: { name?, email?, phone? };
  sourcePlatform: 'dully' | 'easytable' | 'direct';
  photos?: string[];
  isPublic: boolean;
  submittedExternalReview: boolean;
  consent: { given, timestamp, ipAddress?, userAgent?, version };
  createdAt: Date;
  updatedAt: Date;
}
```

### Business

```typescript
{
  id: string;
  name: string;
  email: string;
  settings: {
    defaultDelayMinutes: number;
    smsEnabled: boolean;
    emailEnabled: boolean;
    googleReviewUrl?: string;
    gdpr: { dataRetentionDays, privacyPolicyUrl?, autoDeleteEnabled };
  };
  integrations: IntegrationConfig[];
  messageTemplates: { sms?, email? };
  branding: { primaryColor, logoUrl? };
}
```

### Notification

```typescript
{
  id: string;
  businessId: string;
  type: 'sms' | 'email';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked';
  recipient: string;
  content: string;
  reviewLink: string;
  sentAt?: Date;
  deliveredAt?: Date;
}
```

## Deployment

### Production Environment Variables

```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<secure-random-string>
FRONTEND_URL=https://app.easyrate.app

# AWS
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
S3_BUCKET_NAME=easyrate-uploads-eu

# Providers
INMOBILE_API_KEY=<key>
RESEND_API_KEY=<key>

# Monitoring
SENTRY_DSN=<dsn>
```

### Deployment Options

**Frontend:**

- Vercel (recommended)
- Netlify
- Any static hosting

**Backend:**

- Docker container
- AWS ECS/EKS
- Heroku
- Railway

**Database:**

- MongoDB Atlas (recommended)

### Docker

```dockerfile
# Backend Dockerfile example
FROM node:20-alpine
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
CMD ["node", "apps/backend/dist/index.js"]
```

## Testing

```bash
# Run all tests
pnpm run test

# Run backend tests only
pnpm --filter @easyrate/backend test

# Run frontend tests only
pnpm --filter @easyrate/frontend test

# Run tests with coverage
pnpm run test -- --coverage
```

**Test Structure:**

```
apps/backend/tests/
├── services/        # Unit tests for services
├── routes/          # Integration tests for API
├── integrations/    # Integration adapter tests
└── __mocks__/       # Mock providers
```

**Coverage Targets:**

- Services: 80%
- API routes: 70%

## Security

- **Authentication**: JWT with bcrypt password hashing
- **Authorization**: Business-scoped queries, role-based access
- **Input Validation**: Zod schemas on all endpoints
- **CORS**: Configured for frontend domain only
- **Headers**: Helmet security headers
- **Webhooks**: HMAC-SHA256 (Dully), svix/HMAC-SHA256 (Resend) signature verification
- **File Uploads**: Type/size validation, S3 server-side encryption

## GDPR Compliance

- Consent tracking with IP, User-Agent, timestamp
- Configurable data retention policies
- Customer data export (CSV/ZIP)
- Customer data deletion on request
- Business account deletion with cascade
- Privacy policy URL per business

## Development

### Code Quality

```bash
# Linting
pnpm run lint

# Type checking
pnpm run typecheck

# Format code
pnpm run format
```

### Commit Hooks

Pre-commit hooks via Husky run:

- ESLint
- Prettier
- TypeScript check

### Adding a New Integration

1. Create adapter in `apps/backend/src/integrations/<platform>/`
2. Implement `IntegrationAdapter` interface
3. Register in `IntegrationRegistry`
4. Add webhook route if needed
5. Update `packages/shared/src/types/integration.ts`

### Adding a New Message Provider

1. Create provider in `apps/backend/src/providers/sms/` or `email/`
2. Implement `MessageProvider` interface
3. Register in `ProviderFactory`
4. Add webhook route for status updates

## License

Proprietary - All rights reserved

## Support

For support inquiries, contact: support@easyrate.app
