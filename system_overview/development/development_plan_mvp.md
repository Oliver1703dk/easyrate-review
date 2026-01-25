# EasyRate MVP2 - Development Plan

> Development plan designed for extensibility to the full EasyRate system.

---

## Overview

**Estimated Effort**: 30-40 hours  
**Target Launch**: March 1, 2026  
**Development Start**: February 2026  
**Dully API Available**: February 15, 2026

This plan structures MVP2 development in phases that create a solid foundation for the full system. Each component is designed with extensibility in mind, using patterns that scale to multi-location, multi-platform, and AI-powered features.

---

## Architecture Principles for Extensibility

### 1. Multi-Tenant from Day One

All data models include `business_id` (tenant identifier). This prepares for:
- Full system: Add `location_id` for multi-location support
- Query patterns: All queries scoped by tenant from the start

### 2. Modular Integration Layer

Build integrations as isolated modules with a common interface:

```typescript
interface IntegrationAdapter {
  name: string;
  connect(config: IntegrationConfig): Promise<void>;
  disconnect(): Promise<void>;
  onOrderComplete(handler: OrderHandler): void;
  testConnection(): Promise<boolean>;
}
```

This allows easy addition of new platforms (WooCommerce, Shopify, etc.).

### 3. Workflow-Ready Notification System

Structure notification logic as discrete steps that can later become workflow nodes:

```typescript
interface NotificationStep {
  type: 'sms' | 'email';
  delay: number;
  template: string;
  conditions?: Condition[];
}
```

### 4. Pluggable Communication Providers

Abstract SMS/Email providers behind interfaces for easy switching:

```typescript
interface SmsProvider {
  send(to: string, message: string, sender: string): Promise<SendResult>;
}
```

### 5. Prepared Database Schema

Include reserved fields for future features:
- `location_id`: null for MVP, used in full system
- `metadata`: JSON field for platform-specific data
- `tags`: Array for future categorization

---

## Development Phases

### Phase 1: Project Foundation (4-6 hours)

**Goal**: Set up monorepo, tooling, and shared packages.

#### Tasks

- [ ] **1.1 Initialize Monorepo**
  - pnpm workspaces with Turborepo
  - Structure:
    ```
    /apps/frontend
    /apps/backend
    /packages/shared (types, DTOs, validation)
    /packages/ui (shared components)
    ```

- [ ] **1.2 Configure Development Tooling**
  - TypeScript configuration (strict mode)
  - ESLint + Prettier
  - Husky for pre-commit hooks

- [ ] **1.3 Set Up Shared Package**
  - Data models (Business, Review, Notification)
  - Zod validation schemas
  - API type definitions

- [ ] **1.4 Configure CI/CD**
  - GitHub Actions workflow
  - Lint, type-check, test on PR
  - Deploy preview for frontend

**Extensibility Notes**:
- Shared package becomes the source of truth for types
- Monorepo enables code sharing between future services
- Same structure supports full system microservices

---

### Phase 2: Database & Core Backend (6-8 hours)

**Goal**: Establish data layer and API foundation.

#### Tasks

- [ ] **2.1 MongoDB Setup**
  - Database creation (MongoDB Atlas or self-hosted)
  - Connection configuration with environment variables
  - Multi-tenant indexing strategy

- [ ] **2.2 Data Models Implementation**
  ```typescript
  // Business - extensible for multi-location
  {
    id: string
    name: string
    logo_url: string
    sms_template: string
    email_template: string
    integrations: IntegrationConfig[]
    settings: BusinessSettings  // Future: AI settings, tone presets
    location_id: string | null  // Reserved for full system
    created_at: Date
    updated_at: Date
  }
  
  // Review - extensible for external reviews
  {
    id: string
    business_id: string
    location_id: string | null  // Reserved
    customer_name: string
    customer_email: string
    customer_phone: string
    rating: number
    feedback_text: string
    photos: string[]
    source: string  // 'dully' | 'easytable' | future platforms
    source_order_id: string
    type: 'internal'  // Future: 'google' | 'trustpilot'
    metadata: object  // Platform-specific data
    created_at: Date
  }
  
  // Notification - extensible for workflow steps
  {
    id: string
    business_id: string
    customer_email: string
    customer_phone: string
    type: 'sms' | 'email'
    status: string
    step_id: string | null  // Reserved for workflow engine
    sent_at: Date
    delivered_at: Date | null
    response_received: boolean
    metadata: object
  }
  ```

- [ ] **2.3 Express.js API Foundation**
  - Route structure with versioning (`/api/v1/`)
  - Middleware setup (CORS, Helmet, rate limiting)
  - Error handling with structured responses
  - Request validation with Zod

- [ ] **2.4 Authentication Setup**
  - JWT-based authentication
  - Business/user session management
  - API key authentication for integrations

**Extensibility Notes**:
- Schema includes reserved fields for location_id, metadata
- Authentication supports future OAuth providers
- API versioning allows non-breaking changes

---

### Phase 3: Integration Layer (5-7 hours)

**Goal**: Build modular integration system for Dully and EasyTable.

#### Tasks

- [ ] **3.1 Integration Adapter Interface**
  - Define common adapter interface
  - Event-driven architecture for order events
  - Connection state management

- [ ] **3.2 Dully Integration**
  - Webhook receiver endpoint
  - Order data parsing and validation
  - Trigger timing logic (1 hour delay)
  - Connection test functionality

- [ ] **3.3 EasyTable Integration**
  - REST API client
  - Polling mechanism with scheduling
  - Booking data parsing
  - Trigger timing logic (2 hours delay)
  - Connection test functionality

- [ ] **3.4 Integration Registry**
  - Dynamic integration loading
  - Configuration storage
  - Status monitoring

**Extensibility Notes**:
- Adapter pattern enables adding new platforms without core changes
- Event-driven triggers prepare for workflow engine
- Registry pattern supports dynamic platform loading

---

### Phase 4: Notification System (4-6 hours)

**Goal**: Implement SMS and email delivery with provider abstraction.

#### Tasks

- [ ] **4.1 Provider Abstraction Layer**
  ```typescript
  interface MessageProvider {
    type: 'sms' | 'email';
    send(message: Message): Promise<SendResult>;
    getStatus(messageId: string): Promise<MessageStatus>;
  }
  ```

- [ ] **4.2 SMS Provider Implementation**
  - Gateway API integration (primary)
  - Alphanumeric sender ID support
  - Danish character handling
  - Delivery status tracking

- [ ] **4.3 Email Provider Implementation**
  - SendGrid or SES integration
  - HTML email templates
  - Personalization variable replacement
  - Delivery tracking

- [ ] **4.4 Notification Queue**
  - Scheduled sending with delays
  - Retry logic for failures
  - Rate limiting per provider
  - Fallback from SMS to email

- [ ] **4.5 Template Engine**
  - Variable substitution ({name}, {business})
  - Default templates in Danish
  - Template validation

**Extensibility Notes**:
- Provider abstraction allows switching SMS providers
- Queue system prepares for workflow step execution
- Template engine supports future rich content (RCS)

---

### Phase 5: Customer Landing Pages (5-7 hours)

**Goal**: Build mobile-optimized review collection flow.

#### Tasks

- [ ] **5.1 Landing Page Framework**
  - Next.js pages with dynamic routing
  - Mobile-first responsive design
  - Danish language UI
  - Business branding injection

- [ ] **5.2 Screen 1: Rating**
  - Emoji-rich 1-5 star interface
  - "Hvordan var din oplevelse?" heading
  - Timer note ("Det tager kun 10 sekunder")
  - Photo upload option
  - Smooth animations

- [ ] **5.3 Screen 2: Conditional Feedback**
  - **Negative path (1-3 stars)**:
    - Text feedback form
    - Privacy disclaimer
    - Optional Google review link
  - **Positive path (4-5 stars)**:
    - Thank you message
    - Google review prompt with direct link
    - Skip option ("Nej tak")

- [ ] **5.4 Screen 3: Thank You**
  - Confirmation message
  - Business branding

- [ ] **5.5 Photo Upload**
  - S3 presigned URL generation
  - Image compression client-side
  - Upload progress indicator

- [ ] **5.6 Analytics Tracking**
  - Page view events
  - Rating selection events
  - Completion events
  - Drop-off tracking

**Extensibility Notes**:
- Component structure supports flow customization
- Branching logic can become workflow nodes
- Analytics prepares for A/B testing

---

### Phase 6: Admin Dashboard (6-8 hours)

**Goal**: Build business-facing dashboard for review management.

#### Tasks

- [ ] **6.1 Dashboard Layout**
  - React SPA with sidebar navigation
  - Responsive design
  - Danish language UI

- [ ] **6.2 Overview Page**
  - Metric cards:
    - Total SMS sent
    - Total emails sent
    - Total reviews received
    - Response rate (%)
  - Simple trend indicators
  - Date range selector

- [ ] **6.3 Reviews Page**
  - Review list with:
    - Star rating display
    - Review text
    - Submission date/time
    - Source platform badge
    - Photo thumbnails
  - Chronological sorting
  - Basic search functionality

- [ ] **6.4 Settings Page**
  - Message template editors
  - Personalization variable insertion
  - Business profile (name, logo)
  - Integration status display

- [ ] **6.5 Integrations Page**
  - Dully configuration:
    - Webhook URL display
    - API key input
    - Connection test button
    - Status indicator
  - EasyTable configuration:
    - API key input
    - Connection test button
    - Status indicator
    - Setup guide

**Extensibility Notes**:
- Page structure supports adding AI insights, workflows
- Settings page extensible for tone presets, auto-reply
- Component library reusable for workflow builder

---

### Phase 7: File Storage & GDPR (2-3 hours)

**Goal**: Implement secure file storage and compliance features.

#### Tasks

- [ ] **7.1 AWS S3 Configuration**
  - Bucket in EU region (eu-central-1)
  - Server-side encryption
  - CORS configuration
  - Lifecycle policies

- [ ] **7.2 Presigned URL System**
  - Upload URL generation
  - Download URL generation with expiry
  - File type validation

- [ ] **7.3 GDPR Compliance**
  - Consent tracking in notifications
  - Data retention configuration
  - User data export endpoint
  - User data deletion endpoint
  - Privacy policy links

**Extensibility Notes**:
- S3 structure supports multi-location file organization
- GDPR endpoints ready for self-service portal

---

### Phase 8: Testing & Deployment (2-4 hours)

**Goal**: Ensure stability and deploy to production.

#### Tasks

- [ ] **8.1 Testing**
  - Unit tests for business logic
  - Integration tests for APIs
  - End-to-end flow testing
  - Mobile device testing

- [ ] **8.2 Deployment Configuration**
  - Frontend: Vercel deployment
  - Backend: Railway or Render
  - Environment variables setup
  - Domain configuration (api.easyrate.app)

- [ ] **8.3 Monitoring Setup**
  - Error tracking (Sentry)
  - Basic logging
  - Uptime monitoring

- [ ] **8.4 Documentation**
  - Integration setup guides
  - API documentation
  - Internal runbook

---

## Extensibility Mapping: MVP2 to Full System

| MVP2 Component | Full System Extension |
|----------------|----------------------|
| Single business account | Multi-location hierarchy |
| Dully + EasyTable integrations | Integration registry with 10+ platforms |
| SMS/Email notifications | RCS, rich media, custom channels |
| Hardcoded review flow | No-code workflow builder (React Flow) |
| Internal reviews only | Google, Trustpilot, TripAdvisor sync |
| Basic metrics | AI insights, sentiment analysis |
| Manual review reading | AI response generation |
| Danish only | Multi-language (i18n) |
| Simple templates | Per-location template overrides |
| Basic search | Advanced filtering, analytics |

---

## Technical Debt to Avoid

1. **Avoid hardcoding integration logic** - Use adapter pattern from the start
2. **Don't skip tenant_id scoping** - Every query must be scoped
3. **Don't embed business logic in components** - Use service layer
4. **Avoid provider lock-in** - Abstract all external services
5. **Don't skip typing** - Full TypeScript coverage

---

## Dependencies & External Services

### Required Before Development

- [ ] MongoDB Atlas account or self-hosted instance
- [ ] SMS provider account (Gateway API recommended)
- [ ] SendGrid or AWS SES account
- [ ] AWS account for S3
- [ ] Vercel account for frontend
- [ ] Railway/Render account for backend
- [ ] GitHub repository

### Required Before Launch

- [ ] Dully API access and documentation (Feb 15)
- [ ] EasyTable API access
- [ ] Domain DNS configuration
- [ ] SSL certificates (automatic via Vercel/Railway)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Dully API delayed | Start with EasyTable, mock Dully webhook |
| SMS delivery issues | Implement email fallback from day one |
| Photo upload failures | Client-side compression, retry logic |
| Integration complexity | Start with simpler EasyTable, then Dully |

---

## Success Criteria

1. SMS and email notifications deliver successfully (>95% delivery rate)
2. Landing pages load in <2 seconds on mobile
3. Reviews are collected and stored correctly
4. Dashboard displays accurate metrics
5. System runs stable without critical errors
6. All 6 initial customers onboarded successfully

---

## Post-MVP2 Priorities (Bridge to Full System)

After MVP2 launch, prioritize in order:

1. **Multi-location support** - Add location_id throughout
2. **Google Reviews integration** - Read and display external reviews
3. **AI response suggestions** - Add Grok/OpenAI integration
4. **Workflow builder** - React Flow implementation
5. **Additional integrations** - WooCommerce, Shopify
6. **Advanced analytics** - Charts, trends, NPS

---

## File Structure Reference

```
/apps
  /frontend
    /src
      /components
        /dashboard
        /landing
        /shared
      /pages
      /hooks
      /lib
      /styles
  /backend
    /src
      /routes
      /services
      /integrations
        /dully
        /easytable
      /providers
        /sms
        /email
      /models
      /middleware
      /utils

/packages
  /shared
    /types
    /schemas
    /constants
  /ui
    /components
```

---

*Last updated: January 2026*
