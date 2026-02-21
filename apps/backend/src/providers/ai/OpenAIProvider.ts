import type {
  AIAnalysisInput,
  AIAnalysisResult,
  AIProviderType,
  AIResponseGenerationInput,
  AIResponseGenerationResult,
} from '@easyrate/shared';
import { BaseAIProvider, type AIProviderConfig } from './BaseAIProvider.js';

export interface OpenAIConfig extends AIProviderConfig {
  apiKey: string;
  model?: string | undefined;
}

interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChatResponse {
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
 * OpenAI Provider - Fallback provider for review analysis
 * Uses the OpenAI Chat Completions API
 */
export class OpenAIProvider extends BaseAIProvider {
  protected readonly providerName: AIProviderType = 'openai';
  private readonly baseUrl = 'https://api.openai.com/v1';
  private readonly defaultModel = 'gpt-4-turbo';

  isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  async analyze(input: AIAnalysisInput): Promise<AIAnalysisResult> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API is not configured');
    }

    const model = this.config.model ?? this.defaultModel;
    const prompt = this.buildAnalysisPrompt(input);

    this.log('Starting analysis', {
      reviewCount: input.reviews.length,
      businessName: input.businessName,
      model,
    });

    const messages: OpenAIChatMessage[] = [
      {
        role: 'system',
        content:
          'You are an expert in customer feedback analysis. Reply ONLY with valid JSON, no markdown or explanations.',
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
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logError('API request failed', { status: response.status, error: errorText });
      throw new Error(`OpenAI API error: ${String(response.status)} - ${errorText}`);
    }

    const data = (await response.json()) as OpenAIChatResponse;

    const [firstChoice] = data.choices;
    if (!firstChoice) {
      throw new Error('OpenAI API returned no choices');
    }

    const responseText = firstChoice.message.content;
    const tokensUsed = data.usage.total_tokens;

    this.log('Analysis completed', { tokensUsed, model });

    return this.parseAnalysisResponse(responseText, model, tokensUsed);
  }

  async generateResponse(input: AIResponseGenerationInput): Promise<AIResponseGenerationResult> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API is not configured');
    }

    const model = this.config.model ?? this.defaultModel;
    const prompt = this.buildResponsePrompt(input);

    this.log('Generating response', {
      rating: input.review.rating,
      businessName: input.businessName,
      model,
    });

    const messages: OpenAIChatMessage[] = [
      {
        role: 'system',
        content:
          'You are a professional customer service representative. Write friendly, personal responses.',
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
        Authorization: `Bearer ${this.config.apiKey}`,
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
      throw new Error(`OpenAI API error: ${String(response.status)} - ${errorText}`);
    }

    const data = (await response.json()) as OpenAIChatResponse;

    const [firstChoice] = data.choices;
    if (!firstChoice) {
      throw new Error('OpenAI API returned no choices');
    }

    const responseText = firstChoice.message.content.trim();
    const tokensUsed = data.usage.total_tokens;

    this.log('Response generated', { tokensUsed, model });

    return {
      responseText,
      tokensUsed,
      modelUsed: model,
    };
  }
}

/**
 * Create an OpenAI provider from environment variables
 */
export function createOpenAIProvider(): OpenAIProvider | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new OpenAIProvider({
    apiKey,
    model: process.env.OPENAI_MODEL,
  });
}
