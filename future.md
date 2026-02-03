# Future Improvements

## AI Insights: xAI Batch Processing

**Goal:** Reduce cost and simplify scheduling by using the xAI (Grok) batch API for AI insight report generation.

**Current behaviour:** The scheduled insights job runs hourly and processes businesses sequentially—one API call per business via `InsightsProcessor` → `createAndProcess` → provider `analyze()`. Each business is processed independently.

**Proposed improvement:**

1. **Batch API usage**  
   Use the xAI batch API so multiple insight-generation requests (one per business) are submitted as a single batch job instead of many real-time calls. Batch pricing is lower and fits non-real-time workloads.

2. **Fixed-time daily run**  
   Run AI insight generation at a single configured time (e.g. 02:00) instead of “every hour, process up to N businesses”. At that time, determine all businesses that need a refresh (e.g. 7+ days since last run or never run), prepare one batch request per business, and submit them as one xAI batch job.

3. **Cost and behaviour**  
   - One batch job per day containing all businesses that need insights.  
   - Lower cost via batch pricing.  
   - Predictable load and simpler scheduling (one cron/scheduler at a fixed time).  
   - Poll or webhook for batch completion, then persist insight runs and update `lastInsightRunAt` (and related state) per business.

**Implementation notes:**

- Extend or add a provider method (e.g. in `BaseAIProvider` / `GrokProvider`) to support batch submission and status/result retrieval for xAI batch API.
- Keep real-time `analyze()` for manual “Refresh insights” so users still get immediate feedback when they trigger a run.
- Scheduled path: fixed-time job → `getBusinessesNeedingRefresh()` → build batch input for all → submit batch → on completion, process results and update DB per business.
- Consider rate limits and batch size caps from xAI when number of businesses is large; may need multiple batch jobs per night with a max size per batch.
