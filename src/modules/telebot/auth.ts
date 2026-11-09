import { HttpClient } from '../../http';
import type {
  InitDataValidationResult,
  TelegramAuthData,
  WidgetVerificationResult,
} from '../../types';

export class TeleBotAuthClient {
  constructor(private readonly http: HttpClient) {}

  /**
   * Xác thực chữ ký mã hóa HMAC-SHA256 của Telegram Login Widget
   */
  async verifyWidget(
    authData: TelegramAuthData,
    maxAgeSeconds = 86400
  ): Promise<WidgetVerificationResult> {
    return this.http.post<WidgetVerificationResult>('/api/auth/verify-widget', {
      authData,
      maxAgeSeconds,
    });
  }

  /**
   * Xác thực chuỗi raw window.Telegram.WebApp.initData của Telegram Mini App (TMA)
   */
  async validateInitData(
    initData: string,
    maxAgeSeconds = 86400
  ): Promise<InitDataValidationResult> {
    return this.http.post<InitDataValidationResult>('/api/auth/validate-init-data', {
      init_data: initData,
      max_age_seconds: maxAgeSeconds,
    });
  }
}
