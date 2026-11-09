export interface AuthStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

export interface ClientCredentials {
  /**
   * Client ID / App ID (Định danh ứng dụng OAuth 2.0 hoặc Client)
   */
  id?: string;
  clientId?: string;

  /**
   * Client Secret (Mã bí mật dùng để xác thực các dịch vụ Edge)
   */
  secret?: string;
  clientSecret?: string;
}

export interface VntezClientConfig extends ClientCredentials {
  /**
   * Redirect URI dùng cho OAuth 2.0 PKCE Callback
   */
  redirectUri?: string;

  /**
   * IAM SSO Gateway URL. Mặc định: https://iam.hnamhocit.workers.dev
   */
  gatewayUrl?: string;

  /**
   * App ID dùng để scope permissions/roles (ví dụ: 'solotype', 'vntez')
   */
  appId?: string;

  /**
   * Custom storage cho OAuth session (mặc định: sessionStorage trên browser)
   */
  storage?: AuthStorage;

  /**
   * Endpoint URL của Upload Worker (R2). Mặc định: https://upload.hnamhocit.workers.dev
   */
  r2Url?: string;

  /**
   * Endpoint URL của TeleBot Worker. Mặc định: https://telebot.hnamhocit.workers.dev
   */
  telebotUrl?: string;

  /**
   * API Key riêng cho R2 (nếu không cung cấp sẽ tự dùng clientSecret / secret)
   */
  r2ApiKey?: string;

  /**
   * API Key riêng cho TeleBot (nếu không cung cấp sẽ tự dùng clientSecret / secret)
   */
  telebotApiKey?: string;
}

export interface HttpRequestOptions extends RequestInit {
  query?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
}
