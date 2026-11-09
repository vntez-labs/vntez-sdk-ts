import { describe, it, expect } from 'vitest';
import { createClient, VntezClient } from '../src/client';

describe('VntezClient', () => {
  it('should initialize all modules (auth, r2, telebot)', () => {
    const client = createClient({
      clientId: 'test-app',
      redirectUri: 'https://app.test.com/callback',
      r2ApiKey: 'r2-key',
      telebotApiKey: 'tele-key',
    });

    expect(client).toBeInstanceOf(VntezClient);
    expect(client.auth).toBeDefined();
    expect(client.r2).toBeDefined();
    expect(client.telebot).toBeDefined();
    expect(client.telebot.subscribers).toBeDefined();
    expect(client.telebot.auth).toBeDefined();
    expect(client.telebot.webhook).toBeDefined();
  });
});
