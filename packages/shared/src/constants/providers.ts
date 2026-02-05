// Provider rate limits and constants

export const PROVIDER_RATE_LIMITS = {
  gatewayapi: { maxRequests: 100, windowMs: 1000 },
  sendgrid: { maxRequests: 100, windowMs: 1000 },
} as const;

export const SMS_ENCODING = {
  GSM7_MAX_LENGTH: 160,
  UCS2_MAX_LENGTH: 70,
  GSM7_CONCAT_MAX_LENGTH: 153, // Per segment when concatenated
  UCS2_CONCAT_MAX_LENGTH: 67, // Per segment when concatenated
} as const;

// GSM-7 basic character set
// Includes lowercase Danish æ, ø, å but NOT uppercase Æ, Ø, Å
export const GSM7_BASIC_CHARS = new Set([
  // Basic Latin letters
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  // Digits
  ...'0123456789',
  // Space
  ' ',
  // Punctuation and symbols
  ...`@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,-./:;<=>?¡¿`,
  // Danish lowercase special chars (GSM-7 compatible)
  'æ',
  'ø',
  'å',
]);

// GSM-7 extended character set (count as 2 characters)
export const GSM7_EXTENDED_CHARS = new Set(['|', '^', '€', '{', '}', '[', ']', '~', '\\']);

export const PROVIDER_NAMES = {
  GATEWAY_API: 'gatewayapi',
  SENDGRID: 'sendgrid',
} as const;

export type ProviderName = (typeof PROVIDER_NAMES)[keyof typeof PROVIDER_NAMES];
