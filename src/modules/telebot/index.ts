import { HttpClient } from '../../http';
import { TeleBotSubscribersClient } from './subscribers';
import { TeleBotAuthClient } from './auth';
import { TeleBotWebhookClient } from './webhook';
import type {
  BroadcastOptions,
  BroadcastResult,
  SendMessageOptions,
  SendPhotoOptions,
  TeleBotClientConfig,
} from '../../types';

export class TeleBotModule {
  private readonly http: HttpClient;

  public readonly subscribers: TeleBotSubscribersClient;
  public readonly auth: TeleBotAuthClient;
  public readonly webhook: TeleBotWebhookClient;

  constructor(config: TeleBotClientConfig = {}) {
    const baseUrl = (config.baseUrl || 'https://telebot.hnamhocit.workers.dev').replace(/\/+$/, '');

    const getHeaders = () => {
      const headers: Record<string, string> = {};
      if (config.apiKey) {
        headers['X-API-Key'] = config.apiKey;
      }
      return headers;
    };

    this.http = new HttpClient(baseUrl, getHeaders);

    this.subscribers = new TeleBotSubscribersClient(this.http);
    this.auth = new TeleBotAuthClient(this.http);
    this.webhook = new TeleBotWebhookClient(this.http);
  }

  /**
   * Lấy thông tin cơ bản của Bot từ Telegram (username, id, capabilities)
   */
  async getMe(): Promise<{ ok: boolean; data: Record<string, any> }> {
    return this.http.get<{ ok: boolean; data: Record<string, any> }>('/api/me');
  }

  /**
   * Gửi tin nhắn văn bản (hỗ trợ HTML/Markdown và inline buttons)
   */
  async sendMessage(
    chatId: number | string,
    text: string,
    options: Omit<SendMessageOptions, 'chat_id' | 'text'> = {}
  ): Promise<{ ok: boolean; message_id?: number; result?: any }> {
    return this.http.post<{ ok: boolean; message_id?: number; result?: any }>(
      '/api/send-message',
      {
        chat_id: chatId,
        text,
        ...options,
      }
    );
  }

  /**
   * Gửi ảnh kèm dòng chú thích (caption)
   */
  async sendPhoto(
    chatId: number | string,
    photo: string,
    options: Omit<SendPhotoOptions, 'chat_id' | 'photo'> = {}
  ): Promise<{ ok: boolean; message_id?: number; result?: any }> {
    return this.http.post<{ ok: boolean; message_id?: number; result?: any }>(
      '/api/send-photo',
      {
        chat_id: chatId,
        photo,
        ...options,
      }
    );
  }

  /**
   * Phát sóng tin nhắn hàng loạt:
   * - Nếu truyền `chat_ids`: gửi tới danh sách chỉ định.
   * - Nếu không truyền `chat_ids`: tự động lấy subscribers active từ Supabase (có thể lọc theo `tags` hoặc `status`).
   */
  async broadcast(options: BroadcastOptions): Promise<BroadcastResult> {
    return this.http.post<BroadcastResult>('/api/broadcast', options);
  }
}

export const createTeleBotClient = (config: TeleBotClientConfig = {}) =>
  new TeleBotModule(config);

export * from './subscribers';
export * from './auth';
export * from './webhook';
