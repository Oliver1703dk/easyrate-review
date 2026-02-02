import type {
  AIAnalysisInput,
  AIAnalysisResult,
  AIProviderType,
  AIResponseGenerationInput,
  AIResponseGenerationResult,
} from '@easyrate/shared';
import { BaseAIProvider, type AIProviderConfig } from './BaseAIProvider.js';

export interface GrokConfig extends AIProviderConfig {
  apiKey: string;
  model?: string | undefined;
}

interface GrokChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GrokChatResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Grok AI Provider - Primary provider for review analysis
 * Uses the xAI API (OpenAI-compatible)
 */
export class GrokProvider extends BaseAIProvider {
  protected readonly providerName: AIProviderType = 'grok';
  private readonly baseUrl = 'https://api.x.ai/v1';
  private readonly defaultModel = 'grok-beta';

  isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  async analyze(input: AIAnalysisInput): Promise<AIAnalysisResult> {
    if (!this.isConfigured()) {
      throw new Error('Grok API is not configured');
    }

    const model = this.config.model || this.defaultModel;
    const prompt = this.buildAnalysisPrompt(input);

    this.log('Starting analysis', {
      reviewCount: input.reviews.length,
      businessName: input.businessName,
      model,
    });

    const messages: GrokChatMessage[] = [
      {
        role: 'system',
        content: 'Du er en ekspert i kundefeedback-analyse. Svar KUN med valid JSON, ingen markdown eller forklaringer.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logError('API request failed', { status: response.status, error: errorText });
      throw new Error(`Grok API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as GrokChatResponse;

    if (!data.choices || data.choices.length === 0) {
      throw new Error('Grok API returned no choices');
    }

    const responseText = data.choices[0]!.message.content;
    const tokensUsed = data.usage?.total_tokens || 0;

    this.log('Analysis completed', { tokensUsed, model });

    return this.parseAnalysisResponse(responseText, model, tokensUsed);
  }

  async generateResponse(input: AIResponseGenerationInput): Promise<AIResponseGenerationResult> {
    if (!this.isConfigured()) {
      throw new Error('Grok API is not configured');
    }

    const model = this.config.model || this.defaultModel;
    const prompt = this.buildResponsePrompt(input);

    this.log('Generating response', {
      rating: input.review.rating,
      businessName: input.businessName,
      model,
    });

    const messages: GrokChatMessage[] = [
      {
        role: 'system',
        content: 'Du er en professionel kundeservicemedarbejder. Skriv venlige, personlige svar på dansk.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logError('API request failed', { status: response.status, error: errorText });
      throw new Error(`Grok API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as GrokChatResponse;

    if (!data.choices || data.choices.length === 0) {
      throw new Error('Grok API returned no choices');
    }

    const responseText = data.choices[0]!.message.content.trim();
    const tokensUsed = data.usage?.total_tokens || 0;

    this.log('Response generated', { tokensUsed, model });

    return {
      responseText,
      tokensUsed,
      modelUsed: model,
    };
  }
}

/**
 * Create a Grok provider from environment variables
 */
export function createGrokProvider(): GrokProvider | null {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new GrokProvider({
    apiKey,
    model: process.env.GROK_MODEL,
  });
}
