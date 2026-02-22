import type {
  AIAnalysisInput,
  AIAnalysisResult,
  AIProviderType,
  AIResponseGenerationInput,
  AIResponseGenerationResult,
} from '@easyrate/shared';

export interface AIProviderConfig {
  apiKey: string;
  model?: string | undefined;
  [key: string]: unknown;
}

/**
 * Abstract base class for AI providers (Grok, OpenAI)
 * Provides common functionality for prompt building and response parsing
 */
export abstract class BaseAIProvider {
  protected abstract readonly providerName: AIProviderType;
  protected config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  /**
   * Analyze reviews and extract insights - must be implemented by subclasses
   */
  abstract analyze(input: AIAnalysisInput): Promise<AIAnalysisResult>;

  /**
   * Generate a response to a customer review - must be implemented by subclasses
   */
  abstract generateResponse(input: AIResponseGenerationInput): Promise<AIResponseGenerationResult>;

  /**
   * Check if the provider is properly configured
   */
  abstract isConfigured(): boolean;

  /**
   * Get the provider name
   */
  getName(): AIProviderType {
    return this.providerName;
  }

  /**
   * Build the analysis prompt for the AI model
   */
  protected buildAnalysisPrompt(input: AIAnalysisInput): string {
    const fromDate =
      input.reviews.length > 0
        ? new Date(Math.min(...input.reviews.map((r) => new Date(r.createdAt).getTime())))
            .toISOString()
            .slice(0, 10)
        : new Date().toISOString().slice(0, 10);
    const toDate = new Date().toISOString().slice(0, 10);

    const reviewsText = input.reviews
      .map((r, i) => {
        const text = r.feedbackText ? `"${r.feedbackText}"` : '(no text)';
        return `${String(i + 1)}. Rating: ${String(r.rating)}/5 - ${text}`;
      })
      .join('\n');

    return `You are an expert in customer feedback analysis for restaurants and service businesses.

Analyse the following customer reviews and generate a structured report in English.

BUSINESS: ${input.businessName}
PERIOD: ${fromDate} to ${toDate}
NUMBER OF REVIEWS: ${String(input.reviews.length)}

REVIEWS:
${reviewsText}

---

Return ONLY a JSON object (no markdown, no code blocks) with the following structure:
{
  "overallSentiment": {
    "score": <number 0-100>,
    "label": <"very_negative" | "negative" | "neutral" | "positive" | "very_positive">,
    "summary": "<short summary of customer satisfaction>"
  },
  "themes": [
    {
      "name": "<theme name>",
      "description": "<short description of the theme>",
      "customerCount": <number of unique customers mentioning this>,
      "mentionCount": <number of times the theme is mentioned>,
      "severity": <"critical" | "high" | "medium" | "low">,
      "sentiment": <"positive" | "negative" | "neutral">,
      "exampleQuotes": ["<quote 1>", "<quote 2>"],
      "suggestion": "<concrete actionable suggestion>"
    }
  ],
  "topImprovementPoint": "<the most important area for improvement with a concrete suggestion>",
  "customerSatisfactionSummary": "<overall assessment of customer satisfaction>"
}

RULES:
1. All text must be in English
2. Include only 3-8 themes, and only if mentioned by at least 2 customers
3. Severity should reflect: critical (repeated serious complaints), high (frequent issues), medium (moderate), low (minor/positive)
4. Preserve customer anonymity in quotes (remove names, specific details)
5. Suggestions must be concrete and actionable
6. If there are too few reviews (<5), note this in customerSatisfactionSummary`;
  }

  /**
   * Build the response generation prompt for the AI model
   * Different prompts for negative (1-3) vs positive (4-5) reviews
   */
  protected buildResponsePrompt(input: AIResponseGenerationInput): string {
    const { review, businessName } = input;
    const customerName = review.customerName ?? 'Customer';
    const feedbackText = review.feedbackText ?? '';
    const isNegative = review.rating <= 3;

    if (isNegative && feedbackText) {
      return `You are a customer service representative for ${businessName}.

Write a professional, empathetic response to this customer review.

RATING: ${String(review.rating)}/5 stars
CUSTOMER FEEDBACK: "${feedbackText}"
CUSTOMER NAME: ${customerName}

RULES:
1. Acknowledge the customer's experience and show understanding
2. Apologise for the poor experience
3. Offer a solution or next step (do not offer discounts or deals)
4. Keep the tone professional but warm
5. Max 150 words
6. Avoid repeating specific criticism
7. End with an invitation to return

Reply ONLY with the response text, no explanations.`;
    }

    if (isNegative) {
      return `You are a customer service representative for ${businessName}.

Write a professional, empathetic response to a customer who left a low rating without specific feedback.

RATING: ${String(review.rating)}/5 stars
CUSTOMER NAME: ${customerName}

RULES:
1. Acknowledge that they had a less than ideal experience
2. Apologise sincerely for the poor experience
3. Express that their feedback matters and invite them to share more details
4. Offer to make things right (do not offer discounts or deals)
5. Keep the tone professional but warm
6. Max 100 words
7. Avoid assuming what went wrong
8. End with an invitation to return

Reply ONLY with the response text, no explanations.`;
    }

    // Different prompt for positive reviews with or without feedback text
    if (feedbackText) {
      return `You are a customer service representative for ${businessName}.

Write a warm, personal response to this positive customer review.

RATING: ${String(review.rating)}/5 stars
CUSTOMER FEEDBACK: "${feedbackText}"
CUSTOMER NAME: ${customerName}

RULES:
1. Thank the customer sincerely for the review
2. Highlight a specific point they mentioned (if relevant)
3. Express delight at their good experience
4. Invite them to come again
5. Max 100 words
6. Keep the tone warm and personal

Reply ONLY with the response text, no explanations.`;
    }

    // Positive review without feedback text (e.g., went directly to Google)
    return `You are a customer service representative for ${businessName}.

Write a warm, personal response to this positive customer review. The customer gave ${String(review.rating)} stars but did not write any specific feedback.

RATING: ${String(review.rating)}/5 stars
CUSTOMER NAME: ${customerName}

RULES:
1. Thank the customer sincerely for their positive rating
2. Express delight that they had a good experience
3. Mention that their support means a lot
4. Invite them to come again
5. Max 80 words
6. Keep the tone warm and personal
7. Avoid referring to specific feedback (there is none)

Reply ONLY with the response text, no explanations.`;
  }

  /**
   * Parse the AI response into structured result
   */
  protected parseAnalysisResponse(
    responseText: string,
    modelUsed: string,
    tokensUsed: number
  ): AIAnalysisResult {
    // Clean the response - remove markdown code blocks if present
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.slice(7);
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    cleanedResponse = cleanedResponse.trim();

    const parsed = JSON.parse(cleanedResponse) as {
      overallSentiment?: { score?: number; label?: string; summary?: string };
      themes?: {
        name?: string;
        description?: string;
        customerCount?: number;
        mentionCount?: number;
        severity?: string;
        sentiment?: string;
        exampleQuotes?: string[];
        suggestion?: string;
      }[];
      topImprovementPoint?: string;
      customerSatisfactionSummary?: string;
    };

    // Validate and normalize the response
    const result: AIAnalysisResult = {
      overallSentiment: {
        score: Math.min(100, Math.max(0, parsed.overallSentiment?.score ?? 50)),
        label: this.validateSentimentLabel(parsed.overallSentiment?.label) ?? 'neutral',
        summary: parsed.overallSentiment?.summary ?? 'No summary available',
      },
      themes: (parsed.themes ?? []).map((theme) => ({
        name: theme.name ?? 'Unknown theme',
        description: theme.description ?? '',
        customerCount: Math.max(0, theme.customerCount ?? 0),
        mentionCount: Math.max(0, theme.mentionCount ?? 0),
        severity: this.validateSeverity(theme.severity) ?? 'medium',
        sentiment: this.validateThemeSentiment(theme.sentiment) ?? 'neutral',
        exampleQuotes: Array.isArray(theme.exampleQuotes) ? theme.exampleQuotes.map(String) : [],
        suggestion: theme.suggestion ?? '',
      })),
      topImprovementPoint: parsed.topImprovementPoint,
      customerSatisfactionSummary: parsed.customerSatisfactionSummary,
      tokensUsed,
      modelUsed,
    };

    return result;
  }

  /**
   * Validate sentiment label
   */
  private validateSentimentLabel(
    label: unknown
  ): 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive' | null {
    const validLabels = ['very_negative', 'negative', 'neutral', 'positive', 'very_positive'];
    return validLabels.includes(String(label))
      ? (label as 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive')
      : null;
  }

  /**
   * Validate severity
   */
  private validateSeverity(severity: unknown): 'critical' | 'high' | 'medium' | 'low' | null {
    const validSeverities = ['critical', 'high', 'medium', 'low'];
    return validSeverities.includes(String(severity))
      ? (severity as 'critical' | 'high' | 'medium' | 'low')
      : null;
  }

  /**
   * Validate theme sentiment
   */
  private validateThemeSentiment(sentiment: unknown): 'positive' | 'negative' | 'neutral' | null {
    const validSentiments = ['positive', 'negative', 'neutral'];
    return validSentiments.includes(String(sentiment))
      ? (sentiment as 'positive' | 'negative' | 'neutral')
      : null;
  }

  /**
   * Log an info message with provider context
   */
  protected log(message: string, data?: Record<string, unknown>): void {
    const prefix = `[AI:${this.providerName.toUpperCase()}]`;
    if (data) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }

  /**
   * Log an error with provider context
   */
  protected logError(message: string, error: unknown): void {
    const prefix = `[AI:${this.providerName.toUpperCase()}]`;
    console.error(prefix, message, error);
  }
}
