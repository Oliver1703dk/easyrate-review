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
            .split('T')[0]
        : new Date().toISOString().split('T')[0];
    const toDate = new Date().toISOString().split('T')[0];

    const reviewsText = input.reviews
      .map((r, i) => {
        const text = r.feedbackText ? `"${r.feedbackText}"` : '(ingen tekst)';
        return `${i + 1}. Rating: ${r.rating}/5 - ${text}`;
      })
      .join('\n');

    return `Du er en ekspert i kundefeedback-analyse for danske restauranter og servicevirksomheder.

Analyser følgende kundeanmeldelser og generer en struktureret rapport på dansk.

VIRKSOMHED: ${input.businessName}
PERIODE: ${fromDate} til ${toDate}
ANTAL ANMELDELSER: ${input.reviews.length}

ANMELDELSER:
${reviewsText}

---

Returner KUN et JSON-objekt (ingen markdown, ingen kodeblokke) med følgende struktur:
{
  "overallSentiment": {
    "score": <nummer 0-100>,
    "label": <"very_negative" | "negative" | "neutral" | "positive" | "very_positive">,
    "summary": "<kort dansk opsummering af kundetilfredsheden>"
  },
  "themes": [
    {
      "name": "<tema navn>",
      "description": "<kort beskrivelse af temaet>",
      "customerCount": <antal unikke kunder der nævner dette>,
      "mentionCount": <antal gange temaet nævnes>,
      "severity": <"critical" | "high" | "medium" | "low">,
      "sentiment": <"positive" | "negative" | "neutral">,
      "exampleQuotes": ["<citat 1>", "<citat 2>"],
      "suggestion": "<konkret handlingsforslag>"
    }
  ],
  "topImprovementPoint": "<det vigtigste forbedringsområde med konkret forslag>",
  "customerSatisfactionSummary": "<overordnet vurdering af kundetilfredsheden>"
}

REGLER:
1. Al tekst skal være på dansk
2. Medtag kun 3-8 temaer, og kun hvis de nævnes af mindst 2 kunder
3. Severity skal afspejle: critical (gentagne alvorlige klager), high (hyppige problemer), medium (moderate), low (mindre/positive)
4. Bevar kunders anonymitet i citater (fjern navne, specifikke detaljer)
5. Forslag skal være konkrete og handlingsorienterede
6. Hvis der er for få anmeldelser (<5), angiv dette i customerSatisfactionSummary`;
  }

  /**
   * Build the response generation prompt for the AI model
   * Different prompts for negative (1-3) vs positive (4-5) reviews
   */
  protected buildResponsePrompt(input: AIResponseGenerationInput): string {
    const { review, businessName } = input;
    const customerName = review.customerName || 'Kunde';
    const feedbackText = review.feedbackText || '';
    const isNegative = review.rating <= 3;

    if (isNegative) {
      return `Du er kundeservicemedarbejder for ${businessName}.

Skriv et professionelt, empatisk svar på dansk til denne kundeanmeldelse.

RATING: ${review.rating}/5 stjerner
KUNDENS FEEDBACK: "${feedbackText}"
KUNDENS NAVN: ${customerName}

REGLER:
1. Anerkend kundens oplevelse og vis forståelse
2. Undskyld for den dårlige oplevelse
3. Tilbyd en løsning eller næste skridt (Ikke tilbyd rabatter eller tilbud)
4. Hold tonen professionel men varm
5. Max 150 ord
6. Undgå at gentage specifik kritik
7. Afslut med en invitation til at vende tilbage

Svar KUN med svarteksten, ingen forklaringer.`;
    }

    // Different prompt for positive reviews with or without feedback text
    if (feedbackText) {
      return `Du er kundeservicemedarbejder for ${businessName}.

Skriv et varmt, personligt svar på dansk til denne positive kundeanmeldelse.

RATING: ${review.rating}/5 stjerner
KUNDENS FEEDBACK: "${feedbackText}"
KUNDENS NAVN: ${customerName}

REGLER:
1. Tak kunden oprigtigt for anmeldelsen
2. Fremhæv et specifikt punkt de nævnte (hvis relevant)
3. Udtryk glæde over deres gode oplevelse
4. Inviter dem til at komme igen
5. Max 100 ord
6. Hold tonen varm og personlig

Svar KUN med svarteksten, ingen forklaringer.`;
    }

    // Positive review without feedback text (e.g., went directly to Google)
    return `Du er kundeservicemedarbejder for ${businessName}.

Skriv et varmt, personligt svar på dansk til denne positive kundeanmeldelse. Kunden gav ${review.rating} stjerner men skrev ingen specifik feedback.

RATING: ${review.rating}/5 stjerner
KUNDENS NAVN: ${customerName}

REGLER:
1. Tak kunden oprigtigt for deres positive bedømmelse
2. Udtryk glæde over at de havde en god oplevelse
3. Nævn at deres støtte betyder meget for jer
4. Inviter dem til at komme igen
5. Max 80 ord
6. Hold tonen varm og personlig
7. Undgå at referere til specifik feedback (der er ingen)

Svar KUN med svarteksten, ingen forklaringer.`;
  }

  /**
   * Parse the AI response into structured result
   */
  protected parseAnalysisResponse(responseText: string, modelUsed: string, tokensUsed: number): AIAnalysisResult {
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

    const parsed = JSON.parse(cleanedResponse);

    // Validate and normalize the response
    const result: AIAnalysisResult = {
      overallSentiment: {
        score: Math.min(100, Math.max(0, Number(parsed.overallSentiment?.score) || 50)),
        label: this.validateSentimentLabel(parsed.overallSentiment?.label) || 'neutral',
        summary: String(parsed.overallSentiment?.summary || 'Ingen opsummering tilgængelig'),
      },
      themes: (parsed.themes || []).map((theme: Record<string, unknown>) => ({
        name: String(theme.name || 'Ukendt tema'),
        description: String(theme.description || ''),
        customerCount: Math.max(0, Number(theme.customerCount) || 0),
        mentionCount: Math.max(0, Number(theme.mentionCount) || 0),
        severity: this.validateSeverity(theme.severity as string) || 'medium',
        sentiment: this.validateThemeSentiment(theme.sentiment as string) || 'neutral',
        exampleQuotes: Array.isArray(theme.exampleQuotes) ? theme.exampleQuotes.map(String) : [],
        suggestion: theme.suggestion ? String(theme.suggestion) : undefined,
      })),
      topImprovementPoint: parsed.topImprovementPoint ? String(parsed.topImprovementPoint) : undefined,
      customerSatisfactionSummary: parsed.customerSatisfactionSummary ? String(parsed.customerSatisfactionSummary) : undefined,
      tokensUsed,
      modelUsed,
    };

    return result;
  }

  /**
   * Validate sentiment label
   */
  private validateSentimentLabel(label: unknown): 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive' | null {
    const validLabels = ['very_negative', 'negative', 'neutral', 'positive', 'very_positive'];
    return validLabels.includes(String(label)) ? (label as 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive') : null;
  }

  /**
   * Validate severity
   */
  private validateSeverity(severity: unknown): 'critical' | 'high' | 'medium' | 'low' | null {
    const validSeverities = ['critical', 'high', 'medium', 'low'];
    return validSeverities.includes(String(severity)) ? (severity as 'critical' | 'high' | 'medium' | 'low') : null;
  }

  /**
   * Validate theme sentiment
   */
  private validateThemeSentiment(sentiment: unknown): 'positive' | 'negative' | 'neutral' | null {
    const validSentiments = ['positive', 'negative', 'neutral'];
    return validSentiments.includes(String(sentiment)) ? (sentiment as 'positive' | 'negative' | 'neutral') : null;
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
