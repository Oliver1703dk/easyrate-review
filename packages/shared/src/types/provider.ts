export interface Message {
  to: string;
  content: string;
  from?: string;
  fromName?: string; // Per-message sender display name (email) or sender ID (SMS)
  subject?: string; // For email
  html?: string; // For email
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export type MessageStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced'
  | 'opened'
  | 'clicked';

export interface MessageStatusResult {
  messageId: string;
  status: MessageStatus;
  timestamp?: Date;
  error?: string;
}

export interface MessageProvider {
  send(message: Message): Promise<SendResult>;
  getStatus(messageId: string): Promise<MessageStatusResult>;
}

export interface SmsProvider extends MessageProvider {
  senderId: string;
}

export interface EmailProvider extends MessageProvider {
  fromEmail: string;
  fromName?: string | undefined;
}

export interface SmsConfig {
  apiKey: string;
  apiSecret?: string;
  senderId: string;
}

export interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
}
