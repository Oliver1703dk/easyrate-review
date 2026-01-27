# EasyRate TODO

## 1. Review Reply/Answer Functionality

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

## 2. AI Insights (from ai_features_mvp.md)

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

## 3. AI Response Generation (from ai_features_mvp.md)

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

## 4. Google Reviews Integration (from system_overview_full.md)

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

## 5. Fix Flow Screen

**Overview:** Ensure the flow page sidebar shows the correct configuration or preview screen when each flow node is clicked. Currently only the landing node shows a dedicated panel; trigger, SMS, email, branch, internal feedback, external review, and thank-you nodes do not show node-specific content. Each node type should display the appropriate settings, copy, or preview so users can understand and configure that step of the flow.

### Frontend
- [ ] Show correct sidebar panel when trigger node is selected (e.g. trigger description, integration source)
- [ ] Show SMS-specific panel when SMS node is selected (template, delay, toggle state)
- [ ] Show email-specific panel when email node is selected (template, delay, toggle state)
- [ ] Keep/refine landing panel when landing node is selected (rating type, headline, conditions)
- [ ] Show branch-specific panel when branch node is selected (1–3 vs 4–5 star split, conditions)
- [ ] Show internal-feedback panel when internal node is selected (private form preview, copy)
- [ ] Show external-review panel when external node is selected (Google/share options, copy)
- [ ] Show thank-you panel when thank-you node is selected (success copy, CTA)
- [ ] When no node or unknown node is selected, show flow overview or empty state instead of wrong content
- [ ] Remove or relocate debug UI (e.g. channel toggles) so it does not clutter the flow canvas

### Notes
- Sidebar layout and content should match the node type; avoid reusing the landing preview for unrelated nodes.
- Prefer one panel per node type so the flow screen is predictable and easy to use.

---

## 6. EasyTable configuration

- [ ] Verify on EasyTable that the configuration works (connection, API key, order/booking sync)

---

## Notes

- All AI features require human approval before sending
- Danish language optimization required for all AI prompts
- Rate limiting and cost control measures needed
- GDPR compliance: ensure customer consent for email responses
