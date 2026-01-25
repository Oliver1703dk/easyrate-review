import { describe, it, expect } from 'vitest';
import {
  requiresUcs2Encoding,
  calculateSmsSegments,
  normalizeDanishPhone,
  isValidPhoneNumber,
  getNonGsm7Characters,
} from '../../src/utils/smsEncoding.js';

describe('SMS Encoding Utils', () => {
  describe('requiresUcs2Encoding', () => {
    it('should return false for plain ASCII text', () => {
      expect(requiresUcs2Encoding('Hello world!')).toBe(false);
    });

    it('should return false for Danish lowercase letters (æ, ø, å)', () => {
      // Lowercase Danish letters are part of GSM-7
      expect(requiresUcs2Encoding('æ')).toBe(false);
      expect(requiresUcs2Encoding('ø')).toBe(false);
      expect(requiresUcs2Encoding('å')).toBe(false);
      expect(requiresUcs2Encoding('æøå')).toBe(false);
    });

    it('should return false for Danish uppercase letters (Æ, Ø, Å)', () => {
      // GSM-7 standard includes uppercase Danish letters
      expect(requiresUcs2Encoding('Æ')).toBe(false);
      expect(requiresUcs2Encoding('Ø')).toBe(false);
      expect(requiresUcs2Encoding('Å')).toBe(false);
    });

    it('should return false for typical Danish SMS', () => {
      expect(requiresUcs2Encoding('Tak for din bestilling hos Pizza Place')).toBe(false);
      expect(requiresUcs2Encoding('Hvordan var din oplevelse?')).toBe(false);
      expect(requiresUcs2Encoding('Klik her: https://review.dk/abc')).toBe(false);
      expect(requiresUcs2Encoding('Øllet er godt')).toBe(false);
      expect(requiresUcs2Encoding('Æbler og pærer')).toBe(false);
      expect(requiresUcs2Encoding('Århus by')).toBe(false);
    });

    it('should return true for emojis', () => {
      expect(requiresUcs2Encoding('Hello 😀')).toBe(true);
      expect(requiresUcs2Encoding('⭐⭐⭐⭐⭐')).toBe(true);
    });

    it('should return false for GSM-7 extended characters', () => {
      // These require escape sequences but are still GSM-7
      expect(requiresUcs2Encoding('Price: €50')).toBe(false);
      expect(requiresUcs2Encoding('[brackets]')).toBe(false);
      expect(requiresUcs2Encoding('{braces}')).toBe(false);
    });

    it('should return true for non-GSM-7 special characters', () => {
      // Characters not in GSM-7 require UCS-2
      expect(requiresUcs2Encoding('日本語')).toBe(true); // Japanese
      expect(requiresUcs2Encoding('中文')).toBe(true); // Chinese
      expect(requiresUcs2Encoding('한국어')).toBe(true); // Korean
    });
  });

  describe('calculateSmsSegments', () => {
    it('should return 1 segment for short GSM-7 text', () => {
      const result = calculateSmsSegments('Hello world');

      expect(result.encoding).toBe('GSM-7');
      expect(result.segmentCount).toBe(1);
      expect(result.maxLengthPerSegment).toBe(160);
    });

    it('should handle 160 characters in single GSM-7 segment', () => {
      const text = 'a'.repeat(160);
      const result = calculateSmsSegments(text);

      expect(result.encoding).toBe('GSM-7');
      expect(result.characterCount).toBe(160);
      expect(result.segmentCount).toBe(1);
    });

    it('should split to multiple segments for long GSM-7 text', () => {
      const text = 'a'.repeat(161);
      const result = calculateSmsSegments(text);

      expect(result.encoding).toBe('GSM-7');
      expect(result.segmentCount).toBe(2);
      expect(result.maxLengthPerSegment).toBe(153); // Concatenated SMS limit
    });

    it('should count extended GSM-7 characters as 2', () => {
      const result = calculateSmsSegments('Price: €50');

      expect(result.encoding).toBe('GSM-7');
      // € counts as 2 characters
      expect(result.characterCount).toBe(11); // "Price: " (7) + "€" (2) + "50" (2) = 11
    });

    it('should use GSM-7 for all Danish characters', () => {
      const result = calculateSmsSegments('Øllet er godt æøåÆØÅ');

      expect(result.encoding).toBe('GSM-7');
    });

    it('should handle UCS-2 for emoji text', () => {
      const result = calculateSmsSegments('Hello 😀 World');

      expect(result.encoding).toBe('UCS-2');
      expect(result.maxLengthPerSegment).toBe(70); // UCS-2 single segment
    });

    it('should handle 70 characters in single UCS-2 segment', () => {
      const text = '日' + 'a'.repeat(69); // Non-GSM char + 69 ASCII = 70 chars
      const result = calculateSmsSegments(text);

      expect(result.encoding).toBe('UCS-2');
      expect(result.segmentCount).toBe(1); // Exactly 70 chars fits in single UCS-2 segment
    });

    it('should split UCS-2 text at 67 characters for concatenated', () => {
      const text = '日' + 'a'.repeat(70); // Non-GSM char + 70 chars
      const result = calculateSmsSegments(text);

      expect(result.encoding).toBe('UCS-2');
      expect(result.segmentCount).toBe(2);
      expect(result.maxLengthPerSegment).toBe(67); // Concatenated UCS-2 limit
    });

    it('should handle typical Danish review SMS', () => {
      const shortMsg = 'Tak for besøget! Klik her for at anmelde: https://r.dk/x';
      const result1 = calculateSmsSegments(shortMsg);
      expect(result1.segmentCount).toBe(1);
      expect(result1.encoding).toBe('GSM-7');

      const longMsg = 'Kære kunde, tak for dit besøg hos Restaurant Søndergaard. Vi håber du havde en god oplevelse. Klik her for at efterlade en anmeldelse: https://easyrate.app/r/abc123xyz. Med venlig hilsen, Teamet';
      const result2 = calculateSmsSegments(longMsg);
      expect(result2.segmentCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('normalizeDanishPhone', () => {
    it('should keep E.164 format unchanged', () => {
      expect(normalizeDanishPhone('+4512345678')).toBe('+4512345678');
    });

    it('should convert 00 prefix to +', () => {
      expect(normalizeDanishPhone('004512345678')).toBe('+4512345678');
    });

    it('should add + to numbers starting with country code', () => {
      expect(normalizeDanishPhone('4512345678')).toBe('+4512345678');
    });

    it('should add +45 to 8-digit Danish numbers', () => {
      expect(normalizeDanishPhone('12345678')).toBe('+4512345678');
    });

    it('should remove spaces and dashes', () => {
      expect(normalizeDanishPhone('+45 12 34 56 78')).toBe('+4512345678');
      expect(normalizeDanishPhone('12-34-56-78')).toBe('+4512345678');
    });

    it('should handle various Danish phone formats', () => {
      expect(normalizeDanishPhone('12345678')).toBe('+4512345678');
      expect(normalizeDanishPhone('45 12345678')).toBe('+4512345678');
      expect(normalizeDanishPhone('+45 1234 5678')).toBe('+4512345678');
      expect(normalizeDanishPhone('0045 12 34 56 78')).toBe('+4512345678');
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should validate Danish phone numbers', () => {
      expect(isValidPhoneNumber('+4512345678')).toBe(true);
      expect(isValidPhoneNumber('12345678')).toBe(true);
      expect(isValidPhoneNumber('45 12 34 56 78')).toBe(true);
    });

    it('should validate international phone numbers', () => {
      expect(isValidPhoneNumber('+46701234567')).toBe(true); // Swedish
      expect(isValidPhoneNumber('+4930123456')).toBe(true); // German
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhoneNumber('1234')).toBe(false); // Too short
      expect(isValidPhoneNumber('abc')).toBe(false); // Not numeric
      expect(isValidPhoneNumber('')).toBe(false); // Empty
    });
  });

  describe('getNonGsm7Characters', () => {
    it('should return empty array for GSM-7 text', () => {
      expect(getNonGsm7Characters('Hello world')).toEqual([]);
      expect(getNonGsm7Characters('æøå')).toEqual([]);
      expect(getNonGsm7Characters('ÆØÅ')).toEqual([]); // Danish uppercase is GSM-7
    });

    it('should identify emojis', () => {
      const result = getNonGsm7Characters('Hello 😀 World 🌍');

      expect(result).toContain('😀');
      expect(result).toContain('🌍');
    });

    it('should return unique characters only', () => {
      const result = getNonGsm7Characters('😀😀😀');

      expect(result).toHaveLength(1);
    });

    it('should identify non-Latin scripts', () => {
      const result = getNonGsm7Characters('Hello 你好 World');

      expect(result).toContain('你');
      expect(result).toContain('好');
    });

    it('should help debug message templates with emojis', () => {
      // Typical use case: find problematic chars in a template
      const template = 'Tak for besøget! 🍽️';
      const nonGsm7 = getNonGsm7Characters(template);

      expect(nonGsm7.length).toBeGreaterThan(0);
      // Contains the food emoji
      expect(nonGsm7.some(char => char.includes('🍽') || char === '🍽')).toBe(true);
    });
  });

  describe('Danish SMS character handling', () => {
    // Critical tests for Danish language support
    it('should correctly handle common Danish words', () => {
      // All Danish text should be GSM-7 compatible
      expect(requiresUcs2Encoding('rødgrød med fløde')).toBe(false);
      expect(requiresUcs2Encoding('smørrebrød')).toBe(false);
      expect(requiresUcs2Encoding('hyggeligt')).toBe(false);
      expect(requiresUcs2Encoding('Rødgrød med fløde')).toBe(false);
      expect(requiresUcs2Encoding('Øllebrød')).toBe(false);
    });

    it('should handle typical review request messages', () => {
      // Messages with Danish characters should be GSM-7
      const msg1 = 'Hej! Tak for dit besøg. Hvordan var maden?';
      expect(requiresUcs2Encoding(msg1)).toBe(false);

      const msg2 = 'Besøg os igen! Åbningstider: 10-22';
      expect(requiresUcs2Encoding(msg2)).toBe(false);
    });

    it('should calculate segments for real-world Danish SMS', () => {
      const shortMsg = 'Tak for besøget! Klik her for at anmelde: https://r.dk/x';
      const result1 = calculateSmsSegments(shortMsg);
      expect(result1.segmentCount).toBe(1);
      expect(result1.encoding).toBe('GSM-7');

      const longMsg = 'Kære kunde, tak for dit besøg hos Restaurant Søndergaard. Vi håber du havde en god oplevelse. Klik her for at efterlade en anmeldelse: https://easyrate.app/r/abc123xyz. Med venlig hilsen, Teamet';
      const result2 = calculateSmsSegments(longMsg);
      expect(result2.segmentCount).toBeGreaterThanOrEqual(2);
      expect(result2.encoding).toBe('GSM-7');
    });

    it('should warn about emojis increasing message cost', () => {
      const withoutEmoji = 'Tak for besøget!';
      const withEmoji = 'Tak for besøget! ⭐';

      const resultWithout = calculateSmsSegments(withoutEmoji);
      const resultWith = calculateSmsSegments(withEmoji);

      expect(resultWithout.encoding).toBe('GSM-7');
      expect(resultWith.encoding).toBe('UCS-2');
      // UCS-2 has much lower character limit
      expect(resultWith.maxLengthPerSegment).toBeLessThan(resultWithout.maxLengthPerSegment);
    });
  });
});
