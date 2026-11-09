import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeleBotModule, createTeleBotClient } from '../src/modules/telebot';

describe('TeleBotModule', () => {
  let bot: TeleBotModule;

  beforeEach(() => {
    vi.restoreAllMocks();
    bot = createTeleBotClient({
      baseUrl: 'https://telebot.test.dev',
      apiKey: 'secret-key',
    });
  });

  it('should send a text message', async () => {
    const mockResponse = { ok: true, message_id: 101 };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockResponse,
    });

    const result = await bot.sendMessage(123456789, '<b>Hello!</b>', {
      parse_mode: 'HTML',
      buttons: [[{ text: 'Visit', url: 'https://vntez.com' }]],
    });

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://telebot.test.dev/api/send-message',
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
      })
    );
  });

  it('should broadcast with automatic Supabase subscriber targeting', async () => {
    const mockResponse = {
      ok: true,
      total: 2,
      success_count: 2,
      failure_count: 0,
      source: 'supabase_subscribers',
      results: [
        { chat_id: 111, ok: true, message_id: 201 },
        { chat_id: 222, ok: true, message_id: 202 },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockResponse,
    });

    const result = await bot.broadcast({
      text: 'VIP Notice',
      tags: ['vip'],
      status: 'active',
    });

    expect(result).toEqual(mockResponse);
  });

  it('should perform subscriber CRUD operations', async () => {
    const mockSubscriber = {
      chat_id: 999888,
      email: 'user@test.com',
      username: 'testuser',
      status: 'active' as const,
      tags: ['default', 'vip'],
    };

    // 1. List
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        ok: true,
        subscribers: [mockSubscriber],
        total: 1,
        limit: 50,
        offset: 0,
      }),
    });

    const listRes = await bot.subscribers.list({ tag: 'vip' });
    expect(listRes.subscribers).toHaveLength(1);

    // 2. Upsert
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true, subscriber: mockSubscriber }),
    });

    const upsertRes = await bot.subscribers.upsert(mockSubscriber);
    expect(upsertRes.chat_id).toBe(999888);

    // 3. Delete
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true, message: 'Subscriber unsubscribed' }),
    });

    const delRes = await bot.subscribers.delete(999888);
    expect(delRes.ok).toBe(true);
  });

  it('should verify Telegram widget and validate MiniApp initData', async () => {
    // 1. Widget
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ valid: true, user: { id: 123, username: 'hnam' } }),
    });

    const widgetRes = await bot.auth.verifyWidget({
      id: 123,
      auth_date: 1700000000,
      hash: 'hash123',
    });
    expect(widgetRes.valid).toBe(true);

    // 2. TMA initData
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ valid: true, user: { id: 123 }, query_id: 'qid' }),
    });

    const tmaRes = await bot.auth.validateInitData('raw_init_data');
    expect(tmaRes.valid).toBe(true);
  });
});
