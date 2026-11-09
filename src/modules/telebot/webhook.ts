import { HttpClient } from '../../http';
import type { WebhookInfo } from '../../types';

export class TeleBotWebhookClient {
  constructor(private readonly http: HttpClient) {}

  /**
   * Kiểm tra thông tin cấu hình webhook hiện tại trên Telegram
   */
  async getInfo(): Promise<WebhookInfo> {
    return this.http.get<WebhookInfo>('/api/webhook/info');
  }

  /**
   * Đăng ký URL webhook cho bot
   */
  async set(url: string, secretToken?: string): Promise<{ ok: boolean; description?: string }> {
    return this.http.post<{ ok: boolean; description?: string }>('/api/webhook/set', {
      url,
      secret_token: secretToken,
    });
  }

  /**
   * Xóa cấu hình webhook (chuyển sang polling hoặc tắt nhận sự kiện)
   */
  async delete(dropPendingUpdates?: boolean): Promise<{ ok: boolean; description?: string }> {
    return this.http.post<{ ok: boolean; description?: string }>('/api/webhook/delete', {
      drop_pending_updates: dropPendingUpdates,
    });
  }
}
