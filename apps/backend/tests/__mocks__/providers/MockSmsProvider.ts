import { vi } from 'vitest';
import type { Message, SendResult, MessageStatus } from '@easyrate/shared';

export interface MockSmsCall {
  recipient: string;
  content: string;
  senderId?: string;
  timestamp: Date;
}

export class MockSmsProvider {
  sendCalls: MockSmsCall[] = [];
  private shouldFail = false;
  private failureMessage = '';

  send = vi.fn(async (message: Message): Promise<SendResult> => {
    this.sendCalls.push({
      recipient: message.recipient,
      content: message.content,
      senderId: message.senderId,
      timestamp: new Date(),
    });

    if (this.shouldFail) {
      return {
        success: false,
        error: this.failureMessage || 'Mock SMS provider failure',
      };
    }

    return {
      success: true,
      messageId: 'mock-sms-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9),
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

  getLastCall(): MockSmsCall | undefined {
    return this.sendCalls[this.sendCalls.length - 1];
  }

  getCallCount(): number {
    return this.sendCalls.length;
  }
}

export const mockSmsProvider = new MockSmsProvider();
