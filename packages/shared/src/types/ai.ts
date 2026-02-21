// AI Insights types for sentiment analysis and theme extraction

export type ThemeSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ThemeSentiment = 'positive' | 'negative' | 'neutral';
export type SentimentLabel =
  | 'very_negative'
  | 'negative'
  | 'neutral'
  | 'positive'
  | 'very_positive';
export type InsightRunStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type InsightTrigger = 'scheduled' | 'manual';
export type AIProviderType = 'grok' | 'openai';

export interface InsightTheme {
  name: string;
  description: string;
  customerCount: number;
  mentionCount: number;
  severity: ThemeSeverity;
  sentiment: ThemeSentiment;
  exampleQuotes: string[];
  suggestion?: string;
}

export interface OverallSentiment {
  score: number; // 0-100
  label: SentimentLabel;
  summary: string;
}

export interface InsightRun {
  id: string;
  businessId: string;
  status: InsightRunStatus;
  dateRange: {
    from: Date;
    to: Date;
  };
  reviewCount: number;
  avgRating?: number;
  overallSentiment?: OverallSentiment;
  themes: InsightTheme[];
  topImprovementPoint?: string;
  customerSatisfactionSummary?: string;
  aiProvider: AIProviderType;
  modelUsed: string;
  tokensUsed: number;
  processingTimeMs: number;
  triggeredBy: InsightTrigger;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIAnalysisInput {
  reviews: {
    rating: number;
    feedbackText?: string | undefined;
    createdAt: Date;
    customerId?: string | undefined;
  }[];
  businessName: string;
  analysisLanguage: 'da';
}

export interface AIAnalysisResult {
  overallSentiment: OverallSentiment;
  themes: InsightTheme[];
  topImprovementPoint?: string | undefined;
  customerSatisfactionSummary?: string | undefined;
  tokensUsed: number;
  modelUsed: string;
}

// AI Settings for Business model
export interface AISettings {
  enabled: boolean;
  provider: AIProviderType;
  autoRefresh: boolean;
  lastInsightRunId?: string;
  lastInsightRunAt?: Date;
}

// API response types
export interface InsightStatusResponse {
  enabled: boolean;
  configured: boolean;
  canRequestNew: boolean;
  nextAvailableAt?: Date | undefined;
  lastRunAt?: Date | undefined;
  lastRunStatus?: InsightRunStatus | undefined;
}

// AI Response Generation types
export interface AIResponseGenerationInput {
  review: {
    rating: number;
    feedbackText?: string | undefined;
    customerName?: string | undefined;
  };
  businessName: string;
}

export interface AIResponseGenerationResult {
  responseText: string;
  tokensUsed: number;
  modelUsed: string;
}

export interface ResponseGenerationStatus {
  canGenerate: boolean;
  remainingToday: number;
  dailyLimit: number;
  resetsAt: Date;
}

export interface PaginatedInsightRuns {
  data: InsightRun[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
