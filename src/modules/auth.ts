import { generatePkce } from '../utils/crypto';
import type {
  AuthStorage,
  SignOutOptions,
  TokenResponse,
  UserInfo,
  VntezClientConfig,
} from '../types';

class DefaultBrowserStorage implements AuthStorage {
  getItem(key: string): string | null {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(key);
    }
    return null;
  }
  setItem(key: string, value: string): void {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(key, value);
    }
  }
  removeItem(key: string): void {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(key);
    }
  }
}

export class AuthModule {
  private readonly gatewayUrl: string;
  private readonly storage: AuthStorage;

  private readonly KEY_STATE = 'vntez_oauth_state';
  private readonly KEY_VERIFIER = 'vntez_oauth_verifier';
  private readonly KEY_TOKEN = 'vntez_access_token';
  private readonly KEY_USER = 'vntez_user_profile';

  constructor(private readonly config: VntezClientConfig) {
    this.gatewayUrl = (config.gatewayUrl || 'https://vntez-iam.vercel.app').replace(/\/+$/, '');
    this.storage = config.storage || new DefaultBrowserStorage();
  }

  /**
   * BƯỚC 1 & 2: Sinh mã PKCE, tự lưu sessionStorage và điều hướng sang SSO Portal
   */
  async signInWithRedirect(): Promise<void> {
    const pkce = await generatePkce();

    await this.storage.setItem(this.KEY_STATE, pkce.state);
    await this.storage.setItem(this.KEY_VERIFIER, pkce.verifier);

    const params = new URLSearchParams({
      client_id: this.config.clientId || '',
      redirect_uri: this.config.redirectUri || '',
      response_type: 'code',
      state: pkce.state,
      code_challenge: pkce.challenge,
      code_challenge_method: 'S256',
    });

    const url = `${this.gatewayUrl}/oauth/authorize?${params.toString()}`;

    if (typeof window !== 'undefined') {
      window.location.href = url;
    }
  }

  /**
   * BƯỚC 3 & 4: Xử lý tại Callback URL (đổi token, lấy userinfo, lưu token)
   */
  async handleCallback(): Promise<{ token: TokenResponse; user: UserInfo }> {
    if (typeof window === 'undefined') {
      throw new Error('handleCallback can only be executed in a browser environment');
    }

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (!code) {
      throw new Error('Missing authorization code in URL query');
    }

    const savedState = await this.storage.getItem(this.KEY_STATE);
    const codeVerifier = await this.storage.getItem(this.KEY_VERIFIER);

    // Xóa ngay thông tin PKCE sau khi lấy ra đối chiếu
    await this.storage.removeItem(this.KEY_STATE);
    await this.storage.removeItem(this.KEY_VERIFIER);

    if (!state || !savedState || state !== savedState) {
      throw new Error('CSRF Warning: State mismatch or session expired');
    }

    if (!codeVerifier) {
      throw new Error('Missing code_verifier in storage. Authentication session expired');
    }

    // 1. Đổi code lấy Access Token
    const token = await this.exchangeCodeForToken(code, codeVerifier);

    // 2. Lấy User Profile
    const user = await this.getUserInfo(token.access_token);

    // 3. Tự lưu vào Storage
    await this.storage.setItem(this.KEY_TOKEN, token.access_token);
    await this.storage.setItem(this.KEY_USER, JSON.stringify(user));

    return { token, user };
  }

  /**
   * Đổi Authorization Code lấy Access Token
   */
  async exchangeCodeForToken(code: string, codeVerifier: string): Promise<TokenResponse> {
    const response = await fetch(`${this.gatewayUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: this.config.clientId,
        code_verifier: codeVerifier,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<TokenResponse>;
  }

  /**
   * Lấy User Info và Roles từ IAM
   */
  async getUserInfo(accessToken: string, appIdOverride?: string): Promise<UserInfo> {
    const targetAppId = appIdOverride || this.config.appId;
    const url = new URL(`${this.gatewayUrl}/oauth/userinfo`);

    if (targetAppId) {
      url.searchParams.set('app_id', targetAppId);
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };

    if (targetAppId) {
      headers['X-App-Id'] = targetAppId;
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Get userinfo error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<UserInfo>;
  }

  /**
   * BƯỚC 5: Single Sign-Out
   * Xóa token cục bộ và chuyển hướng sang IAM Gateway để dọn cookie SSO
   */
  async signOut(options: SignOutOptions = {}): Promise<void> {
    // 1. Xóa sạch dữ liệu lưu ở App
    await Promise.all([
      this.storage.removeItem(this.KEY_TOKEN),
      this.storage.removeItem(this.KEY_USER),
      this.storage.removeItem(this.KEY_STATE),
      this.storage.removeItem(this.KEY_VERIFIER),
    ]);

    // 2. Chuyển hướng tới Gateway để xóa phiên SSO
    if (typeof window !== 'undefined') {
      const returnUrl = options.redirectUrl || window.location.origin;
      const logoutUrl = new URL(`${this.gatewayUrl}/auth/logout`);
      logoutUrl.searchParams.set('redirect_url', returnUrl);

      window.location.href = logoutUrl.toString();
    }
  }

  /**
   * Helper lấy token đã lưu trong storage
   */
  async getAccessToken(): Promise<string | null> {
    return this.storage.getItem(this.KEY_TOKEN);
  }

  /**
   * Helper lấy user profile đã lưu trong storage
   */
  async getUser(): Promise<UserInfo | null> {
    const raw = await this.storage.getItem(this.KEY_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserInfo;
    } catch {
      return null;
    }
  }

  /**
   * Kiểm tra xem user hiện tại đã đăng nhập chưa
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return Boolean(token);
  }
}
