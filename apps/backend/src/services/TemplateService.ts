import { SMS_TEMPLATES, EMAIL_TEMPLATES, SMS_ENCODING } from '@easyrate/shared';
import { requiresUcs2Encoding, calculateSmsSegments, type SmsEncodingInfo } from '../utils/smsEncoding.js';

export interface TemplateVariables {
  customerName?: string;
  businessName: string;
  reviewLink: string;
  [key: string]: string | undefined;
}

export type SmsTemplateType = keyof typeof SMS_TEMPLATES;
export type EmailTemplateType = keyof typeof EMAIL_TEMPLATES;

interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  smsInfo?: SmsEncodingInfo;
}

/**
 * Service for rendering and validating message templates
 */
export class TemplateService {
  private static instance: TemplateService;

  private constructor() {}

  static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  /**
   * Render a template by replacing {{var}} placeholders with values
   */
  render(template: string, variables: TemplateVariables): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      if (value !== undefined) {
        // Replace both {{key}} and {key} formats
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
    }

    return result;
  }

  /**
   * Validate a template
   */
  validate(
    template: string,
    type: 'sms' | 'email',
    variables?: TemplateVariables
  ): TemplateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required variables
    const requiredVars = ['businessName', 'reviewLink'];
    for (const varName of requiredVars) {
      const hasVar =
        template.includes(`{{${varName}}}`) || template.includes(`{${varName}}`);
      if (!hasVar) {
        warnings.push(`Template is missing {{${varName}}} variable`);
      }
    }

    // Check for unresolved variables
    const unresolvedMatches = template.match(/\{\{?\w+\}?\}/g) || [];
    if (unresolvedMatches.length > 0 && !variables) {
      warnings.push(`Template has variables that need to be resolved: ${unresolvedMatches.join(', ')}`);
    }

    // Render template if variables provided, for length checking
    const renderedTemplate = variables ? this.render(template, variables) : template;

    if (type === 'sms') {
      const smsInfo = calculateSmsSegments(renderedTemplate);

      // Check for excessive length
      if (smsInfo.segmentCount > 3) {
        warnings.push(
          `SMS will be split into ${smsInfo.segmentCount} segments (${smsInfo.characterCount} characters). Consider shortening.`
        );
      }

      // Check for UCS-2 encoding (costs more)
      if (smsInfo.encoding === 'UCS-2') {
        warnings.push(
          `SMS uses UCS-2 encoding (${SMS_ENCODING.UCS2_MAX_LENGTH} chars/segment instead of ${SMS_ENCODING.GSM7_MAX_LENGTH})`
        );
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        smsInfo,
      };
    }

    // Email validation
    if (type === 'email') {
      // Check for reasonable length
      if (renderedTemplate.length > 10000) {
        warnings.push('Email content is very long. Consider shortening.');
      }

      // Check for empty content
      if (renderedTemplate.trim().length === 0) {
        errors.push('Email content cannot be empty');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get the default template for a given type
   */
  getDefaultSmsTemplate(templateType: SmsTemplateType = 'reviewRequest'): string {
    return SMS_TEMPLATES[templateType];
  }

  /**
   * Get the default email template
   */
  getDefaultEmailTemplate(templateType: EmailTemplateType = 'reviewRequest'): {
    subject: string;
    body: string;
  } {
    return EMAIL_TEMPLATES[templateType];
  }

  /**
   * Check if text requires UCS-2 encoding
   */
  requiresUcs2Encoding(text: string): boolean {
    return requiresUcs2Encoding(text);
  }

  /**
   * Calculate SMS segment count for a message
   */
  calculateSmsSegments(text: string): SmsEncodingInfo {
    return calculateSmsSegments(text);
  }

  /**
   * Render the default SMS review request template
   */
  renderSmsReviewRequest(variables: TemplateVariables): string {
    const template = variables.customerName
      ? SMS_TEMPLATES.reviewRequest
      : SMS_TEMPLATES.reviewRequestShort;

    return this.render(template, variables);
  }

  /**
   * Render the default email review request template
   */
  renderEmailReviewRequest(variables: TemplateVariables): {
    subject: string;
    body: string;
  } {
    const template = EMAIL_TEMPLATES.reviewRequest;

    return {
      subject: this.render(template.subject, variables),
      body: this.render(template.body, variables),
    };
  }

  /**
   * Get a preview of what the template will look like with sample data
   */
  getPreview(
    template: string,
    type: 'sms' | 'email'
  ): { rendered: string; validation: TemplateValidationResult } {
    const sampleVariables: TemplateVariables = {
      customerName: 'Anders',
      businessName: 'Cafe Hygge',
      reviewLink: 'https://easyrate.app/r/abc123',
    };

    const rendered = this.render(template, sampleVariables);
    const validation = this.validate(template, type, sampleVariables);

    return { rendered, validation };
  }
}

export const templateService = TemplateService.getInstance();
