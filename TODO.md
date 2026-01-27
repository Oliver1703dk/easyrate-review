# EasyRate TODO

## 1. Customer Info in Review Links

**Overview:** Implement JWT-based review links that include customer email and phone information. This enables automatic capture of customer contact details when they submit reviews via notification links (SMS/email), making it possible to reply to customers later. The token will be encrypted and include business ID along with customer contact information. Test links will use static default email and SMS values.

### Backend
- [ ] Create JWT token service for review links (includes businessId, customer email/phone)
- [ ] Update notification service to generate JWT tokens instead of plain business IDs
- [ ] Modify `/api/v1/r/:token` endpoint to extract customer info from JWT
- [ ] Auto-populate customer info when review is submitted via notification link
- [ ] Add migration/update for existing notification links

### Frontend
- [ ] Update review link generation in notification flow
- [ ] Handle JWT token parsing in ReviewPage component
- [ ] Update test tab (TestLinkCard) to generate test links with static default email and default SMS embedded in JWT token

---

## 2. Review Reply/Answer Functionality

**Overview:** Enable businesses to read and reply to internal customer reviews directly from the admin dashboard. This includes storing response data, sending email replies to customers, and displaying the conversation history. All responses require manual approval before sending to ensure quality and compliance.

### Backend
- [ ] Add `response` field to Review model (text, sentAt, sentVia)
- [ ] Create `POST /api/v1/reviews/:id/reply` endpoint
- [ ] Implement email sending service for review responses
- [ ] Add email templates for review responses (Danish)

### Frontend
- [ ] Add reply UI to ReviewCard component (button, textarea, send button)
- [ ] Create reply API hook
- [ ] Display existing responses on review cards
- [ ] Add loading/error states for reply functionality

---

## 3. AI Insights (from ai_features_mvp.md)

**Overview:** Implement AI-powered sentiment analysis and theme extraction from customer reviews. The system will analyze reviews from the last 30 days, generate overall sentiment scores, identify positive and negative themes, and display actionable insights in the dashboard. Insights are cached for 24 hours and can be manually refreshed. This provides businesses with a high-level understanding of customer feedback patterns.

### Backend
- [ ] Create AI provider abstraction interface (`AIProvider`)
- [ ] Implement Grok API provider (with OpenAI fallback)
- [ ] Create `GET /api/v1/insights` endpoint (returns cached insights)
- [ ] Create `POST /api/v1/insights/refresh` endpoint (regenerates insights)
- [ ] Add insights caching logic (24h default, refresh on 10+ new reviews)
- [ ] Add `ai_settings` to Business model
- [ ] Implement batch review analysis (last 30 days)
- [ ] Create InsightsResult data model

### Frontend
- [ ] Add "Indsigter" section to OverviewPage
- [ ] Display sentiment score and themes
- [ ] Add manual refresh button
- [ ] Show review count and date range
- [ ] Add loading states for insights generation

---

## 4. AI Response Generation (from ai_features_mvp.md)

**Overview:** Automatically generate draft responses to customer reviews using AI. The system generates context-aware, tone-appropriate responses in Danish that businesses can edit before sending. Different prompts are used for negative (1-3 stars) vs positive (4-5 stars) reviews. All AI-generated responses require human approval before sending to customers via email.

### Backend
- [ ] Create `POST /api/v1/reviews/:id/generate-response` endpoint
- [ ] Implement response generation prompts (negative/positive reviews)
- [ ] Add ReviewResponse data model
- [ ] Create `POST /api/v1/reviews/:id/send-response` endpoint
- [ ] Integrate with email service to send responses
- [ ] Add rate limiting (50 generations/day per business)

### Frontend
- [ ] Add "Generer svar" button to ReviewCard
- [ ] Create response generation UI (textarea, edit, send)
- [ ] Add loading states during AI generation
- [ ] Display sent responses on review cards
- [ ] Add error handling for AI failures

---

## 5. Google Reviews Integration (from system_overview_full.md)

**Overview:** Integrate with Google Business Profile API to fetch, display, and reply to Google reviews directly in the admin dashboard. This includes syncing external reviews, matching them to internal review flows through attribution, and enabling businesses to reply to Google reviews with AI-generated drafts. Reviews from Google will be displayed alongside internal reviews with filtering capabilities.

### Backend
- [ ] Integrate Google Business Profile API for fetching reviews
- [ ] Create sync service for polling Google reviews (default: every 2 hours)
- [ ] Add manual refresh endpoint for Google reviews
- [ ] Implement review attribution (match external reviews to internal flow by customer name + timestamp)
- [ ] Create `POST /api/v1/reviews/:id/reply-google` endpoint for posting replies to Google
- [ ] Add Google Business Profile configuration to Business model (location IDs, API credentials)
- [ ] Store external reviews in database with source platform identifier
- [ ] Support real-time webhooks via Google My Business Notifications API (optional)

### Frontend
- [ ] Display Google reviews in ReviewsPage alongside internal reviews
- [ ] Add filter for review source (internal vs. Google vs. Trustpilot)
- [ ] Show Google review details (stars, text, date, reviewer name)
- [ ] Add reply UI for Google reviews (AI-generated drafts, editable, send to Google)
- [ ] Add manual refresh button for syncing Google reviews
- [ ] Display review attribution matches (confidence threshold)
- [ ] Add Google Business Profile settings in SettingsPage (API configuration, location IDs)

---

## Notes

- All AI features require human approval before sending
- Danish language optimization required for all AI prompts
- Rate limiting and cost control measures needed
- GDPR compliance: ensure customer consent for email responses
