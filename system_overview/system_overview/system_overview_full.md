# **EasyRate - Full Product Specification**

> This document describes the complete product vision when fully developed, including all planned features, integrations, and capabilities.

---

## **System Overview**

EasyRate is a SaaS-based digital review management platform that automates customer feedback collection, routes it intelligently based on sentiment, and provides tools for analysis and response management. The system integrates with booking and takeaway platforms to trigger review requests post-order.

### **Key Capabilities (Full Product)**

- **Multi-location support**: Restaurant chains and multi-site businesses under a single account with centralized management and per-location customization
- **Multi-platform reviews**: Google, Trustpilot, and TripAdvisor integration
- **No-code workflow builder**: Drag-and-drop interface for custom review flows
- **AI-powered insights**: Automated response generation, sentiment analysis, and theme extraction
- **Hybrid digital + physical**: NFC/QR stand integration from easyrate.dk
- **Multi-language**: Danish (primary), English, and expandable to other languages
- **White-label messaging**: Business-branded SMS and email communications

### **Key Goals**

1. Boost positive public reviews on Google, Trustpilot, and TripAdvisor
2. Keep negative feedback private for internal improvement
3. Leverage AI for efficient response generation and actionable insights
4. Provide a no-code workflow builder for maximum customization
5. Support multi-location businesses with centralized management

---

## **Core Workflow**

### **1. Data Collection**

Businesses connect their booking/takeaway systems via API to capture order data:

- **Customer details**: Name, email, phone number
- **Order metadata**: Timestamp, ID, details (e.g., items, location if multi-site)
- **Opt-in/consent flags**: GDPR compliance tracking

### **2. Review Request Flow** (Customer-Facing, Mobile-Optimized)

1. **Trigger**: Post-order via webhook (preferred) or polling from integrations
2. **Notification**: Customer receives personalized SMS (sender: business name, optional logo via RCS) and/or email with a short link (e.g., easyrate.link or custom domain)
3. **Landing Page**: Friendly, emoji-rich interface asking "Hvordan var din oplevelse?" with 1-5 star rating
   - Optional: Photo upload ("Vedhæft billede")
   - Category hints (e.g., Kvalitet, service, ventetid, andet) as prompts, tags, or dropdowns
   - Timer note: "Det tager kun 10 sekunder"
4. **Branching**:
   - **1-3 stars (negative)**: Private internal form for detailed text feedback with privacy disclaimer. Must include option for external review (legal requirement)
   - **4-5 stars (positive)**: Prompt to share publicly with buttons for Google, Trustpilot, TripAdvisor (single or multi-select). Skip option ("Nej tak") available. Must include option for internal feedback
5. **Analytics tracking**: Drop-off points, completion time, conversion rates, SMS vs. email performance
6. **Follow-ups**: Configurable reminders (1-2) for non-responders with delays (e.g., email 1 hour after SMS, reminder 24 hours post-order)

### **3. Review Handling & Response**

- Negative feedback stored internally with notifications
- Positive reviews routed to external platforms
- AI analyzes aggregated reviews for themes/insights
- AI auto-generates responses with human approval or auto-post with delay
- Monthly PDF reports summarizing insights sent via email
- GDPR compliance: consent tracking, data retention policies, opt-out handling

---

## **Admin Web Platform**

The admin dashboard is a single-page React application (SPA) with sidebar navigation supporting multi-location management.

### **1. Dashboard (Overview)**

**Key Metrics** (filterable by date, location, flow/integration):
- Total requests sent
- Response rate (%)
- Average rating
- New reviews count (internal + public)
- NPS score (calculated via standard formula)
- Channel performance (SMS vs. Email response rates)
- Conversion funnel analytics (flow completion rates)

**Visualizations**:
- Charts/graphs for trends (feedback over time, positive/negative breakdown)
- Aggregated view for chains with drill-down per location
- AI Analysis section with clickable dropdown for detailed insights

**Export Options**:
- CSV and PDF export for all data

### **2. Reviews Management Page**

**Review List**:
- **Internal reviews**: Cards with stars, text, date, photos (if uploaded), categories, source platform
- **External reviews**: Fetched from Google, Trustpilot, TripAdvisor - showing stars, text, date, reviewer name

**Reply Functionality**:
- AI-generated drafts (context-aware, tone-adjusted)
- Post to Google via API; email for internal (from business sender)
- Manual edit/approve before sending
- Auto-post option with configurable delay

**AI Integration**:
- Auto-generate responses
- Analyze reviews: Summaries of themes (e.g., keyword clouds), actionable insights
- Sentiment analysis by category
- Flag urgent issues (e.g., "cold food", "rude staff")
- Prioritized action recommendations

**Review Attribution**:
- Match external reviews to our flow by customer name + timestamp
- Optional email matching
- Probabilistic confidence threshold (e.g., 70% certainty)
- Location-based matching if available

**Sync Settings**:
- Polling frequency (default: every 2 hours, configurable)
- Manual refresh button
- Real-time webhooks via Google My Business Notifications API

### **3. Review Settings**

**External Platforms**:
- Google Business Profile (location IDs for multi-site)
- Trustpilot API configuration
- TripAdvisor API configuration

**AI Controls**:
- Enable/disable auto-generation
- Toggle auto-posting
- Delay timer (default/min-max sliders)
- Tone/style presets:
  - Venlig (friendly)
  - Professionel (professional)
  - Apologetic
  - Custom prompts
- Per-rating tone selection (e.g., different tone for 1-star vs 3-star)

**SMS/Email Channels**:
- Provider API keys configuration
- Message templates with personalization variables
- Sender branding (business name/logo)
- White-label sender domains

**Multi-location Settings**:
- Per-location overrides (different tones, templates per store)
- Global vs. local configuration inheritance

### **4. Integrations**

**Booking/Takeaway Platforms**:
- **Priority**: Dully.io, EasyTable (easytable.com)
- **Additional**: FoodBooking, WooCommerce, Shopify, Geckobooking, Understory, EasyPractice, SimplyBook.me

**Integration Features**:
- Connect via API keys/tokens
- Webhook support (preferred) with polling fallback
- Modular plugin architecture for new platforms
- Auto-pull location data for chains
- "Test API" button for validation
- Field mapping (customer info, order details)
- Error notifications and retry logic

**Review Platforms**:
- Google Business Profile API (polling + replies, multi-location)
- Trustpilot API
- TripAdvisor API

### **5. Flows (Workflow Builder)**

**No-Code Drag-and-Drop Interface** (React Flow):

**Default Flow Structure**:
1. **Trigger**: New order/booking from integration (configurable fields, timing)
2. **Send SMS**: Custom text, delay (1-24 hours), personalization variables
3. **Send Email**: Parallel or fallback, with business sender
4. **Condition**: Based on rating (1-3 vs. 4-5 stars) or custom logic
5. **Landing Pages**: Configurable screens (rating, private form, public share buttons, thank-you)

**Advanced Features**:
- Duplicate/edit flows
- Preview and test mode
- A/B testing variants
- Complex branching conditions (sentiment, customer history, etc.)
- Multi-location: Flows per location or global with overrides
- Multiple custom flows per business (e.g., separate for takeaway vs. dine-in)

### **6. Physical Products (Fysiske produkter)**

- NFC stand management
- QR code generation and tracking
- Integration with easyrate.dk physical products
- Analytics for physical vs. digital touchpoints

### **7. Reports**

- Monthly automated PDF reports via email
- Custom report generation
- Exportable data (CSV, PDF)
- Scheduled report delivery

---

## **Technical Architecture**

### **Frontend**

- **Framework**: React.js (TypeScript)
- **UI Library**: Tailwind CSS + shadcn/ui, Radix UI
- **Workflow Builder**: React Flow (xyflow/react-flow)
- **i18n**: Multi-language support (Danish primary, English, expandable)
- **Deployment**: Vercel (edge CDN, instant previews, auto-scaling)

### **Backend**

- **Runtime**: Node.js (TypeScript)
- **Framework**: Express.js
- **API**: REST with OpenAPI/Swagger auto-generated from Zod schemas + Webhooks
- **Workflow Engine**: n8n (self-hosted), Temporal.io, or Camunda for complex flows
- **Deployment**: AWS ECS on Fargate (auto-scaling containers) or Railway/Render
- **Event-driven**: AWS Lambda + EventBridge for webhook receivers and scheduled polling

**Security**:
- Helmet, CORS, rate limiting
- Zod validation
- Centralized error handling

**Code Quality**:
- ESLint, Prettier, Husky
- Semantic release for versioning
- Vitest with Supertest for testing

### **AI System**

- **Primary Model**: Grok API (large context window, Danish capability)
- **Architecture**: Modular/switchable providers
- **Fallback**: OpenAI GPT, Claude

**Use Cases**:
- Response generation (context-aware, tone-adjusted)
- Sentiment analysis
- Theme extraction
- Photo analysis
- Monthly report generation
- Critical review detection
- Future: AI phone calls for urgent issues

### **Database & Storage**

- **Database**: MongoDB (multi-tenant with tenant_id + location_id filtering)
- **File Storage**: AWS S3 (EU region, server-side encryption, GDPR-compliant)

### **Communication Channels**

**SMS**:
- Provider options: Gateway API (~20 øre), Synac (~26 øre), Twilio (~30-40 øre)
- Alphanumeric sender IDs (business name)
- Danish character support
- Opt-out handling
- Future: RCS for rich media/logos

**Email**:
- Providers: SendGrid or Amazon SES
- White-label: Business name as sender
- Domain verification with SPF/DKIM
- Sender aliasing for customer domains

### **Infrastructure & DevOps**

- **Cloud**: AWS (EU region: eu-central-1 Frankfurt)
- **Structure**: Monorepo (Turborepo/pnpm workspaces)
  - `/apps/frontend`
  - `/apps/backend`
  - `/packages/shared` (types, DTOs)
- **CI/CD**: GitHub Actions with selective deploys
- **Auth**: Passport.js (Local, Facebook, Google OAuth), JWT, SMS verification
- **Multi-tenancy**: tenant_id + location_id filtering

---

## **Compliance & Legal**

### **GDPR**

- Document all stored data and processing purposes
- User rights: data access, deletion, export
- Consent tracking in all communications
- Data retention policies with automatic cleanup
- EU data hosting (AWS eu-central-1)
- Data processing agreements with third parties

### **ePrivacy**

- SMS/email consent requirements
- Opt-out mechanisms in all communications
- Unsubscribe handling

### **Review Platform Compliance**

- Both positive and negative paths must include external review option
- No incentivization of reviews (no discounts for screenshots, etc.)
- Clear privacy disclaimers on internal feedback forms

---

## **Multi-Location Architecture**

### **Account Hierarchy**

- **Main Account**: Chain/franchise owner with full access
- **Sub-accounts**: Per-location with limited access
- Main account can view all sub-location data aggregated or individually

### **Features**

- Location selector dropdown in dashboard
- Per-location metrics and reviews
- Global flows with per-location overrides
- Centralized settings with location exceptions
- Multi-location Google Business Profile support

### **Use Cases**

- Restaurant chains (e.g., C-Rix with 18 locations)
- Franchise businesses
- Multi-city operations

---

## **Market Context**

### **Target Customers**

- Restaurants, cafés, takeaway businesses
- Workshops, clinics, service businesses
- Webshops (via WooCommerce, Shopify)
- Multi-location chains and franchises

### **Partner Platforms**

- **Dully**: 5,000+ Danish customers
- **EasyTable**: 2,800+ restaurants across multiple countries

### **Geographic Focus**

- **Primary**: Denmark (Copenhagen, Aalborg, Aarhus)
- **Secondary**: International expansion (English-speaking markets)

### **Pricing Model**

- Tiered by customer volume (e.g., 0-200: 299 DKK, 200-500: 599 DKK)
- Separate SMS charges per message
- Optional premium features (advanced AI, multi-location)

---

## **Future Roadmap**

1. AI phone calls for critical negative reviews
2. Advanced sentiment analysis with photo recognition
3. Competitor review monitoring
4. Social media integration (Facebook, Instagram reviews)
5. Customer loyalty program integration
6. Advanced A/B testing with statistical significance
7. Mobile admin app
8. API for third-party integrations
9. White-label reseller program
