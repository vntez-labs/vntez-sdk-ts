import { request } from '../http';
import type {
  BroadcastOptions,
  BroadcastResult,
  InitDataValidationResult,
  SendMessageOptions,
  SendPhotoOptions,
  Subscriber,
  SubscriberListQuery,
  SubscriberListResponse,
  SubscriberUpdatePayload,
  SubscriberUpsertPayload,
  TeleBotClientConfig,
  TelegramAuthData,
  WebhookInfo,
  WidgetVerificationResult,
} from '../types';

export class TeleBotSubscribersClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getHeaders: () => Record<string, string>
  ) {}

  /**
   * Lấy danh sách subscribers từ cơ sở dữ liệu Supabase kèm bộ lọc và phân trang
   */
  async list(query?: SubscriberListQuery): Promise<SubscriberListResponse> {
    return request<SubscriberListResponse>(`${this.baseUrl}/api/subscribers`, {
      method: 'GET',
      headers: this.getHeaders(),
      query: {
        status: query?.status,
        tag: query?.tag,
        search: query?.search,
        limit: query?.limit,
        offset: query?.offset,
      },
    });
  }

  /**
   * Xem thông tin chi tiết một subscriber theo Telegram chat_id
   */
  async get(chatId: number | string): Promise<Subscriber> {
    const res = await request<{ ok: boolean; subscriber: Subscriber }>(
      `${this.baseUrl}/api/subscribers/${chatId}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );
    return res.subscriber;
  }

  /**
   * Tạo mới hoặc cập nhật thông tin subscriber (Upsert theo chat_id)
   */
  async upsert(payload: SubscriberUpsertPayload): Promise<Subscriber> {
    const res = await request<{ ok: boolean; subscriber: Subscriber }>(
      `${this.baseUrl}/api/subscribers`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      }
    );
    return res.subscriber;
  }

  /**
   * Cập nhật thông tin subscriber (nhãn tags, status, metadata)
   */
  async update(
    chatId: number | string,
    payload: SubscriberUpdatePayload
  ): Promise<Subscriber> {
    const res = await request<{ ok: boolean; subscriber: Subscriber }>(
      `${this.baseUrl}/api/subscribers/${chatId}`,
      {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      }
    );
    return res.subscriber;
  }

  /**
   * Hủy đăng ký (mặc định soft-delete `status = 'unsubscribed'`).
   * Truyền `{ hard: true }` để xóa vĩnh viễn khỏi database.
   */
  async delete(
    chatId: number | string,
    options?: { hard?: boolean }
  ): Promise<{ ok: boolean; message: string }> {
    return request<{ ok: boolean; message: string }>(
      `${this.baseUrl}/api/subscribers/${chatId}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
        query: { hard: options?.hard },
      }
    );
  }
}

export class TeleBotAuthClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getHeaders: () => Record<string, string>
  ) {}

  /**
   * Xác thực chữ ký mã hóa HMAC-SHA256 của Telegram Login Widget
   */
  async verifyWidget(
    authData: TelegramAuthData,
    maxAgeSeconds = 86400
  ): Promise<WidgetVerificationResult> {
    return request<WidgetVerificationResult>(
      `${this.baseUrl}/api/auth/verify-widget`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ authData, maxAgeSeconds }),
      }
    );
  }

  /**
   * Xác thực chuỗi raw window.Telegram.WebApp.initData của Telegram Mini App (TMA)
   */
  async validateInitData(
    initData: string,
    maxAgeSeconds = 86400
  ): Promise<InitDataValidationResult> {
    return request<InitDataValidationResult>(
      `${this.baseUrl}/api/auth/validate-init-data`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ init_data: initData, max_age_seconds: maxAgeSeconds }),
      }
    );
  }
}

export class TeleBotWebhookClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getHeaders: () => Record<string, string>
  ) {}

  /**
   * Kiểm tra thông tin cấu hình webhook hiện tại trên Telegram
   */
  async getInfo(): Promise<WebhookInfo> {
    return request<WebhookInfo>(`${this.baseUrl}/api/webhook/info`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
  }

  /**
   * Đăng ký URL webhook cho bot
   */
  async set(url: string, secretToken?: string): Promise<{ ok: boolean; description?: string }> {
    return request<{ ok: boolean; description?: string }>(
      `${this.baseUrl}/api/webhook/set`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ url, secret_token: secretToken }),
      }
    );
  }

  /**
   * Xóa cấu hình webhook (chuyển sang polling hoặc tắt nhận sự kiện)
   */
  async delete(dropPendingUpdates?: boolean): Promise<{ ok: boolean; description?: string }> {
    return request<{ ok: boolean; description?: string }>(
      `${this.baseUrl}/api/webhook/delete`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ drop_pending_updates: dropPendingUpdates }),
      }
    );
  }
}

export class TeleBotModule {
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  public readonly subscribers: TeleBotSubscribersClient;
  public readonly auth: TeleBotAuthClient;
  public readonly webhook: TeleBotWebhookClient;

  constructor(config: TeleBotClientConfig = {}) {
    this.baseUrl = (config.baseUrl || 'https://telebot.hnamhocit.workers.dev').replace(/\/+$/, '');
    this.apiKey = config.apiKey;

    const getHeaders = () => {
      const headers: Record<string, string> = {};
      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }
      return headers;
    };

    this.subscribers = new TeleBotSubscribersClient(this.baseUrl, getHeaders);
    this.auth = new TeleBotAuthClient(this.baseUrl, getHeaders);
    this.webhook = new TeleBotWebhookClient(this.baseUrl, getHeaders);
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    return headers;
  }

  /**
   * Lấy thông tin cơ bản của Bot từ Telegram (username, id, capabilities)
   */
  async getMe(): Promise<{ ok: boolean; data: Record<string, any> }> {
    return request<{ ok: boolean; data: Record<string, any> }>(`${this.baseUrl}/api/me`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Gửi tin nhắn văn bản (hỗ trợ HTML/Markdown và inline buttons)
   */
  async sendMessage(
    chatId: number | string,
    text: string,
    options: Omit<SendMessageOptions, 'chat_id' | 'text'> = {}
  ): Promise<{ ok: boolean; message_id?: number; result?: any }> {
    return request<{ ok: boolean; message_id?: number; result?: any }>(
      `${this.baseUrl}/api/send-message`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          chat_id: chatId,
          text,
          ...options,
        }),
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
    return request<{ ok: boolean; message_id?: number; result?: any }>(
      `${this.baseUrl}/api/send-photo`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          chat_id: chatId,
          photo,
          ...options,
        }),
      }
    );
  }

  /**
   * Phát sóng tin nhắn hàng loạt:
   * - Nếu truyền `chat_ids`: gửi tới danh sách chỉ định.
   * - Nếu không truyền `chat_ids`: tự động lấy subscribers active từ Supabase (có thể lọc theo `tags` hoặc `status`).
   */
  async broadcast(options: BroadcastOptions): Promise<BroadcastResult> {
    return request<BroadcastResult>(`${this.baseUrl}/api/broadcast`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(options),
    });
  }
}

export const createTeleBotClient = (config: TeleBotClientConfig = {}) =>
  new TeleBotModule(config);
