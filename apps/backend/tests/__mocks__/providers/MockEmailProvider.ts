import { vi } from 'vitest';
import type { Message, SendResult, MessageStatus } from '@easyrate/shared';

export interface MockEmailCall {
  recipient: string;
  subject: string;
  content: string;
  fromName?: string;
  timestamp: Date;
}

export class MockEmailProvider {
  sendCalls: MockEmailCall[] = [];
  private shouldFail = false;
  private failureMessage = '';

  send = vi.fn(async (message: Message): Promise<SendResult> => {
    this.sendCalls.push({
      recipient: message.recipient,
      subject: message.subject || '',
      content: message.content,
      fromName: message.fromName,
      timestamp: new Date(),
    });

    if (this.shouldFail) {
      return {
        success: false,
        error: this.failureMessage || 'Mock email provider failure',
      };
    }

    return {
      success: true,
      messageId: 'mock-email-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9),
    };
  });

  getStatus = vi.fn(async (messageId: string): Promise<MessageStatus> => {
    return {
      messageId,
      status: 'delivered',
      deliveredAt: new Date(),
    };
  });

  // Test helpers
  simulateFailure(message?: string): void {
    this.shouldFail = true;
    this.failureMessage = message || '';
  }

  simulateSuccess(): void {
    this.shouldFail = false;
    this.failureMessage = '';
  }

  reset(): void {
    this.sendCalls = [];
    this.shouldFail = false;
    this.failureMessage = '';
    this.send.mockClear();
    this.getStatus.mockClear();
  }

  getLastCall(): MockEmailCall | undefined {
    return this.sendCalls[this.sendCalls.length - 1];
  }

  getCallCount(): number {
    return this.sendCalls.length;
  }
}

export const mockEmailProvider = new MockEmailProvider();
