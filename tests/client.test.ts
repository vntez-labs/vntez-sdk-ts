import { describe, it, expect } from 'vitest';
import { createClient, VntezClient } from '../src/client';
import { VntezError } from '../src/http';

describe('VntezClient', () => {
  it('should initialize successfully with id and secret', () => {
    const client = createClient({
      id: 'app_123',
      secret: 'sec_456',
      redirectUri: 'https://app.test.com/callback',
    });

    expect(client).toBeInstanceOf(VntezClient);
    expect(client.id).toBe('app_123');
    expect(client.clientId).toBe('app_123');
    expect(client.secret).toBe('sec_456');
    expect(client.clientSecret).toBe('sec_456');

    expect(client.auth).toBeDefined();
    expect(client.r2).toBeDefined();
    expect(client.telebot).toBeDefined();
    expect(client.telebot.subscribers).toBeDefined();
    expect(client.telebot.auth).toBeDefined();
    expect(client.telebot.webhook).toBeDefined();
  });

  it('should initialize successfully with clientId and clientSecret aliases', () => {
    const client = createClient({
      clientId: 'my-oauth-client',
      clientSecret: 'my-oauth-secret',
    });

    expect(client.clientId).toBe('my-oauth-client');
    expect(client.id).toBe('my-oauth-client');
    expect(client.clientSecret).toBe('my-oauth-secret');
    expect(client.secret).toBe('my-oauth-secret');
  });

  it('should throw VntezError when id / clientId is missing', () => {
    expect(() => {
      createClient({ secret: 'sec_456' } as any);
    }).toThrow(VntezError);

    try {
      createClient({ secret: 'sec_456' } as any);
    } catch (e: any) {
      expect(e.code).toBe('MISSING_CLIENT_ID');
    }
  });

  it('should throw VntezError when secret / clientSecret is missing', () => {
    expect(() => {
      createClient({ id: 'app_123' } as any);
    }).toThrow(VntezError);

    try {
      createClient({ id: 'app_123' } as any);
    } catch (e: any) {
      expect(e.code).toBe('MISSING_CLIENT_SECRET');
    }
  });
});
