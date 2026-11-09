import { HttpClient } from '../../http';
import type {
  Subscriber,
  SubscriberListQuery,
  SubscriberListResponse,
  SubscriberUpdatePayload,
  SubscriberUpsertPayload,
} from '../../types';

export class TeleBotSubscribersClient {
  constructor(private readonly http: HttpClient) {}

  /**
   * Lấy danh sách subscribers từ cơ sở dữ liệu Supabase kèm bộ lọc và phân trang
   */
  async list(query?: SubscriberListQuery): Promise<SubscriberListResponse> {
    return this.http.get<SubscriberListResponse>('/api/subscribers', {
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
    const res = await this.http.get<{ ok: boolean; subscriber: Subscriber }>(
      `/api/subscribers/${chatId}`
    );
    return res.subscriber;
  }

  /**
   * Tạo mới hoặc cập nhật thông tin subscriber (Upsert theo chat_id)
   */
  async upsert(payload: SubscriberUpsertPayload): Promise<Subscriber> {
    const res = await this.http.post<{ ok: boolean; subscriber: Subscriber }>(
      '/api/subscribers',
      payload
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
    const res = await this.http.patch<{ ok: boolean; subscriber: Subscriber }>(
      `/api/subscribers/${chatId}`,
      payload
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
    return this.http.delete<{ ok: boolean; message: string }>(
      `/api/subscribers/${chatId}`,
      {
        query: { hard: options?.hard },
      }
    );
  }
}
