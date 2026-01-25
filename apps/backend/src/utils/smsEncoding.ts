import {
  SMS_ENCODING,
  GSM7_BASIC_CHARS,
  GSM7_EXTENDED_CHARS,
} from '@easyrate/shared';

export type SmsEncodingType = 'GSM-7' | 'UCS-2';

export interface SmsEncodingInfo {
  encoding: SmsEncodingType;
  characterCount: number;
  segmentCount: number;
  maxLengthPerSegment: number;
}

/**
 * Check if a character is in the GSM-7 basic character set
 */
function isGsm7BasicChar(char: string): boolean {
  return GSM7_BASIC_CHARS.has(char);
}

/**
 * Check if a character is in the GSM-7 extended character set
 * Extended chars count as 2 characters (escape + char)
 */
function isGsm7ExtendedChar(char: string): boolean {
  return GSM7_EXTENDED_CHARS.has(char);
}

/**
 * Detect if text requires UCS-2 encoding (non-GSM-7 characters)
 * Danish: æ, ø, å (lowercase) are GSM-7; Æ, Ø, Å (uppercase) require UCS-2
 */
export function requiresUcs2Encoding(text: string): boolean {
  for (const char of text) {
    if (!isGsm7BasicChar(char) && !isGsm7ExtendedChar(char)) {
      return true;
    }
  }
  return false;
}

/**
 * Calculate the character count for GSM-7 encoding
 * Extended characters count as 2 characters
 */
function calculateGsm7CharacterCount(text: string): number {
  let count = 0;
  for (const char of text) {
    if (isGsm7ExtendedChar(char)) {
      count += 2; // Escape + character
    } else {
      count += 1;
    }
  }
  return count;
}

/**
 * Calculate SMS segment count based on text content and encoding
 */
export function calculateSmsSegments(text: string): SmsEncodingInfo {
  const isUcs2 = requiresUcs2Encoding(text);

  if (isUcs2) {
    // UCS-2 encoding (UTF-16)
    const charCount = [...text].length; // Proper unicode length

    if (charCount <= SMS_ENCODING.UCS2_MAX_LENGTH) {
      return {
        encoding: 'UCS-2',
        characterCount: charCount,
        segmentCount: 1,
        maxLengthPerSegment: SMS_ENCODING.UCS2_MAX_LENGTH,
      };
    }

    // Concatenated SMS uses headers, reducing available chars per segment
    const segmentCount = Math.ceil(charCount / SMS_ENCODING.UCS2_CONCAT_MAX_LENGTH);
    return {
      encoding: 'UCS-2',
      characterCount: charCount,
      segmentCount,
      maxLengthPerSegment: SMS_ENCODING.UCS2_CONCAT_MAX_LENGTH,
    };
  }

  // GSM-7 encoding
  const charCount = calculateGsm7CharacterCount(text);

  if (charCount <= SMS_ENCODING.GSM7_MAX_LENGTH) {
    return {
      encoding: 'GSM-7',
      characterCount: charCount,
      segmentCount: 1,
      maxLengthPerSegment: SMS_ENCODING.GSM7_MAX_LENGTH,
    };
  }

  // Concatenated SMS uses headers, reducing available chars per segment
  const segmentCount = Math.ceil(charCount / SMS_ENCODING.GSM7_CONCAT_MAX_LENGTH);
  return {
    encoding: 'GSM-7',
    characterCount: charCount,
    segmentCount,
    maxLengthPerSegment: SMS_ENCODING.GSM7_CONCAT_MAX_LENGTH,
  };
}

/**
 * Normalize a Danish phone number to E.164 format
 * Handles various input formats:
 * - +4512345678 → +4512345678
 * - 004512345678 → +4512345678
 * - 4512345678 → +4512345678
 * - 12345678 → +4512345678 (assumes Danish)
 */
export function normalizeDanishPhone(phone: string): string {
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Handle 00 prefix (international dialing)
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // If it starts with +, it should be valid E.164
  if (cleaned.startsWith('+')) {
    // Validate length for Danish numbers
    if (cleaned.startsWith('+45') && cleaned.length === 11) {
      return cleaned;
    }
    // Return as-is for other countries
    return cleaned;
  }

  // If it starts with 45 and is 10 digits, add +
  if (cleaned.startsWith('45') && cleaned.length === 10) {
    return '+' + cleaned;
  }

  // If it's 8 digits, assume Danish and add +45
  if (cleaned.length === 8 && /^\d{8}$/.test(cleaned)) {
    return '+45' + cleaned;
  }

  // Otherwise, just ensure it starts with +
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
}

/**
 * Validate a phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizeDanishPhone(phone);
  // E.164: + followed by 1-15 digits
  return /^\+\d{8,15}$/.test(normalized);
}

/**
 * Get characters that are causing UCS-2 encoding
 * Useful for debugging message templates
 */
export function getNonGsm7Characters(text: string): string[] {
  const nonGsm7: string[] = [];
  for (const char of text) {
    if (!isGsm7BasicChar(char) && !isGsm7ExtendedChar(char)) {
      if (!nonGsm7.includes(char)) {
        nonGsm7.push(char);
      }
    }
  }
  return nonGsm7;
}
