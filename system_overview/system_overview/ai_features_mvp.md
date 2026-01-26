# **EasyRate - AI Features MVP Specification**

> This document describes the MVP implementation of AI-powered insights and auto-generated responses. The design prioritizes simplicity while enabling extension to the full system capabilities.

---

## **Overview**

The AI MVP adds two core capabilities to the existing review management system:

1. **AI Insights**: Basic sentiment analysis and theme extraction from collected reviews
2. **AI Response Generation**: Automated draft responses for internal reviews

### **Design Principles**

- **Provider-agnostic**: Abstract AI calls behind a common interface for easy provider switching
- **Opt-in features**: Businesses can enable/disable AI features independently
- **Human-in-the-loop**: All AI-generated responses require manual approval before sending
- **Danish-first**: Prompts and outputs optimized for Danish language

---

## **Feature 1: AI Insights**

### **MVP Scope**

Provide businesses with a simple, aggregated view of customer feedback patterns.

#### **Capabilities**

| Feature | MVP | Full System |
|---------|-----|-------------|
| Overall sentiment score | ✅ | ✅ |
| Top positive themes | ✅ (3-5 themes) | ✅ (unlimited) |
| Top negative themes | ✅ (3-5 themes) | ✅ (unlimited) |
| Per-category sentiment | ❌ | ✅ |
| Keyword clouds | ❌ | ✅ |
| Trend analysis over time | ❌ | ✅ |
| Critical issue flagging | ❌ | ✅ |
| Photo analysis | ❌ | ✅ |

#### **How It Works**

1. **Batch Processing**: Insights are generated on-demand or via scheduled job (not real-time)
2. **Input**: All reviews from the last 30 days (configurable)
3. **Output**: Structured JSON with sentiment score and extracted themes

#### **Data Flow**

```
Reviews (last 30 days)
        ↓
   Batch Collector
        ↓
   AI Provider (Grok/OpenAI)
        ↓
   Structured Insights JSON
        ↓
   Store in Database
        ↓
   Display in Dashboard
```

#### **Dashboard Display**

A new "Indsigter" (Insights) section on the Overview page:

- **Overordnet stemning** (Overall sentiment): Positive / Neutral / Negative indicator with percentage
- **Hvad kunderne elsker** (What customers love): 3-5 bullet points
- **Hvad kan forbedres** (What can be improved): 3-5 bullet points
- **Baseret på X anmeldelser** (Based on X reviews): Source count for transparency

#### **Prompt Strategy**

Use a single, focused prompt that extracts both sentiment and themes:

```
System: You are analyzing customer reviews for a Danish restaurant/service business.
Respond only in Danish. Be concise and actionable.

User: Analyze these {count} customer reviews and provide:
1. Overall sentiment (positive/neutral/negative) with confidence percentage
2. Top 3-5 positive themes customers mention
3. Top 3-5 areas for improvement
4. A one-sentence summary

Reviews:
{reviews_text}

Respond in this JSON format:
{
  "sentiment": "positive" | "neutral" | "negative",
  "sentiment_score": 0-100,
  "positive_themes": ["theme1", "theme2", ...],
  "negative_themes": ["theme1", "theme2", ...],
  "summary": "..."
}
```

#### **Caching & Refresh**

- Cache insights for 24 hours by default
- Manual refresh button in dashboard
- Re-generate when significant new reviews arrive (e.g., 10+ since last generation)

---

## **Feature 2: AI Response Generation**

### **MVP Scope**

Generate draft responses for internal reviews that businesses can edit and send via email.

#### **Capabilities**

| Feature | MVP | Full System |
|---------|-----|-------------|
| Draft response generation | ✅ | ✅ |
| Single tone option | ✅ (friendly) | ❌ |
| Multiple tone presets | ❌ | ✅ |
| Per-rating tone selection | ❌ | ✅ |
| Custom tone prompts | ❌ | ✅ |
| Auto-post with delay | ❌ | ✅ |
| Google review replies | ❌ | ✅ |

#### **How It Works**

1. **On-demand generation**: User clicks "Generer svar" (Generate response) on a review
2. **Context-aware**: AI receives the review rating, text, and business name
3. **Editable draft**: Response appears in a text area for editing before sending
4. **Manual send**: User approves and clicks "Send email" to dispatch

#### **Data Flow**

```
User clicks "Generer svar"
        ↓
   Fetch review context
        ↓
   AI Provider (Grok/OpenAI)
        ↓
   Draft response text
        ↓
   Display in editable field
        ↓
   User edits (optional)
        ↓
   User clicks "Send"
        ↓
   Email sent to customer
```

#### **Prompt Strategy**

Separate prompts for negative (1-3 stars) and positive (4-5 stars) reviews:

**Negative Review Prompt:**
```
System: You are writing a response to a negative customer review for {business_name}.
Be empathetic, professional, and solution-oriented. Write in Danish.
Keep the response under 100 words.

User: Write a response to this {rating}-star review:
"{review_text}"

The response should:
- Thank the customer for their feedback
- Acknowledge their concerns
- Express commitment to improvement
- Invite further dialogue if appropriate
```

**Positive Review Prompt:**
```
System: You are writing a response to a positive customer review for {business_name}.
Be warm, genuine, and appreciative. Write in Danish.
Keep the response under 75 words.

User: Write a response to this {rating}-star review:
"{review_text}"

The response should:
- Thank the customer sincerely
- Reference something specific from their review if possible
- Express hope to see them again
```

#### **UI Integration**

On the Reviews page, each review card includes:

- **"Generer svar" button**: Triggers AI response generation
- **Response text area**: Shows generated draft (editable)
- **"Send email" button**: Sends the response to the customer
- **Loading state**: Spinner while AI generates

---

## **Technical Architecture**

### **AI Provider Interface**

Create an abstraction layer to support multiple providers:

```typescript
interface AIProvider {
  name: string;
  generateInsights(reviews: Review[]): Promise<InsightsResult>;
  generateResponse(review: Review, business: Business): Promise<string>;
}
```

### **MVP Provider: Grok API**

- **Primary choice**: Large context window, good Danish support
- **Fallback**: OpenAI GPT-4 if Grok unavailable
- **Model selection**: Use cost-effective models for MVP (e.g., grok-2, gpt-4o-mini)

### **Configuration**

Store AI settings in the Business model:

```typescript
// Addition to Business data model
{
  ai_settings: {
    insights_enabled: boolean       // Default: true
    responses_enabled: boolean      // Default: true
    last_insights_generated: datetime
    insights_cache: InsightsResult  // Cached insights
  }
}
```

### **API Endpoints**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/insights` | GET | Get cached insights for business |
| `/api/v1/insights/refresh` | POST | Force regenerate insights |
| `/api/v1/reviews/:id/generate-response` | POST | Generate response for a review |
| `/api/v1/reviews/:id/send-response` | POST | Send response email to customer |

### **Rate Limiting & Cost Control**

- **Insights**: Max 1 refresh per hour per business
- **Responses**: Max 50 generations per day per business
- **Token limits**: Cap input reviews at ~20 for insights to control costs

---

## **Data Models**

### **InsightsResult**

```typescript
{
  id: string
  business_id: string
  generated_at: datetime
  review_count: number
  date_range: {
    from: datetime
    to: datetime
  }
  sentiment: "positive" | "neutral" | "negative"
  sentiment_score: number  // 0-100
  positive_themes: string[]
  negative_themes: string[]
  summary: string
}
```

### **ReviewResponse**

```typescript
{
  id: string
  review_id: string
  generated_text: string
  edited_text: string      // After user edits
  sent_at: datetime | null
  sent_via: "email"        // MVP: email only
}
```

---

## **Extension Points for Full System**

The MVP architecture supports these future enhancements:

### **1. Multiple AI Providers**

The `AIProvider` interface allows adding:
- Claude for nuanced responses
- Local models for cost reduction
- Specialized models for sentiment analysis

### **2. Advanced Insights**

Extend `InsightsResult` with:
- `category_sentiment: Record<string, number>` for per-category analysis
- `keywords: string[]` for word clouds
- `trends: TrendData[]` for time-series analysis
- `critical_issues: Issue[]` for flagged problems

### **3. Response Customization**

Extend `ai_settings` with:
- `tone_preset: "friendly" | "professional" | "apologetic"`
- `custom_tone_prompt: string`
- `per_rating_tones: Record<number, string>`
- `auto_post_enabled: boolean`
- `auto_post_delay_minutes: number`

### **4. Google Reviews Integration**

Add to `ReviewResponse`:
- `sent_via: "email" | "google" | "trustpilot"`
- `external_review_id: string`

### **5. Scheduled Reports**

Add new service for:
- Monthly PDF generation with AI insights
- Email delivery to business owners
- Trend comparisons month-over-month

---

## **Implementation Priority**

| Priority | Feature | Effort |
|----------|---------|--------|
| 1 | AI Provider abstraction layer | Low |
| 2 | Response generation endpoint | Medium |
| 3 | Response UI in dashboard | Medium |
| 4 | Insights generation endpoint | Medium |
| 5 | Insights UI section | Low |
| 6 | Caching and refresh logic | Low |

---

## **Success Metrics**

1. AI responses are generated in under 5 seconds
2. Generated responses require minimal editing (< 20% change rate)
3. Insights accurately reflect review content (spot-check validation)
4. Businesses engage with AI features (> 50% of businesses use at least once)
5. No AI-related errors or timeouts in production

---

## **Risks & Mitigations**

| Risk | Mitigation |
|------|------------|
| AI generates inappropriate content | Human approval required before sending |
| High API costs | Rate limiting, token caps, caching |
| Slow response times | Async generation with loading states |
| Danish language quality issues | Test extensively, use Danish-optimized models |
| Provider downtime | Fallback provider configuration |

---

## **Out of Scope for MVP**

- Auto-posting responses without approval
- Replying to external Google/Trustpilot reviews
- Real-time insights updates
- Advanced sentiment analysis (per-category, photos)
- AI phone calls for critical reviews
- Custom tone configuration
- Monthly automated reports
