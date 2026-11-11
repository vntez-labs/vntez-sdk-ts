import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  BrowserStorage,
  safeJsonParse,
} from '../../utils/crypto';
import type { VntezUser, TokenResponse } from '../../types';

const STATE_KEY = 'vntez_oauth_state';
const VERIFIER_KEY = 'vntez_oauth_verifier';
const TOKEN_KEY = 'vntez_access_token';
const USER_KEY = 'vntez_user_profile';

export class AuthModule {
  private readonly appId: string;
  private readonly iamUrl: string;
  private readonly sessionStorage: BrowserStorage;
  private readonly localStorage: BrowserStorage;

  constructor(config: { appId: string; iamUrl?: string }) {
    this.appId = config.appId;
    this.iamUrl = config.iamUrl || 'https://vntez-iam.vercel.app';
    this.sessionStorage = new BrowserStorage('session');
    this.localStorage = new BrowserStorage('local');
  }

  async signIn(options?: { redirectUri?: string }): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('signIn can only be called in a browser environment');
    }

    const codeVerifier = generateCodeVerifier();
    const state = generateState();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Store PKCE data in sessionStorage
    this.sessionStorage.setItem(STATE_KEY, state);
    this.sessionStorage.setItem(VERIFIER_KEY, codeVerifier);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.appId,
      redirect_uri: options?.redirectUri || window.location.origin,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      scope: 'openid profile email',
    });

    const authUrl = `${this.iamUrl}/oauth/authorize?${params.toString()}`;
    window.location.href = authUrl;
  }

  async handleCallback(redirectUri?: string): Promise<{ accessToken: string; user: VntezUser }> {
    if (typeof window === 'undefined') {
      throw new Error('handleCallback can only be called in a browser environment');
    }

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (!code) {
      throw new Error('Missing authorization code in URL');
    }

    const savedState = this.sessionStorage.getItem(STATE_KEY);
    const codeVerifier = this.sessionStorage.getItem(VERIFIER_KEY);

    // Clean up session storage
    this.sessionStorage.removeItem(STATE_KEY);
    this.sessionStorage.removeItem(VERIFIER_KEY);

    if (!state || !savedState || state !== savedState) {
      throw new Error('CSRF state mismatch');
    }

    if (!codeVerifier) {
      throw new Error('Missing code verifier');
    }

    // Exchange code for access token
    const tokenData = await this.exchangeCodeForToken(code, codeVerifier, redirectUri);
    const accessToken = tokenData.access_token;

    // Get user info
    const userInfo = await this.getUserInfo(accessToken);

    // Store in localStorage
    this.localStorage.setItem(TOKEN_KEY, accessToken);
    this.localStorage.setItem(USER_KEY, JSON.stringify(userInfo));

    return { accessToken, user: userInfo };
  }

  private async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    redirectUri?: string
  ): Promise<TokenResponse> {
    const formData = new FormData();
    formData.append('grant_type', 'authorization_code');
    formData.append('code', code);
    formData.append('client_id', this.appId);
    formData.append('code_verifier', codeVerifier);
    formData.append('redirect_uri', redirectUri || window.location.origin);

    const response = await fetch(`${this.iamUrl}/oauth/token`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  private async getUserInfo(accessToken: string): Promise<VntezUser> {
    const response = await fetch(`${this.iamUrl}/oauth/userinfo`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-App-Id': this.appId,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get user info: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  signOut(redirectUrl?: string): void {
    // Clear local storage
    this.localStorage.removeItem(TOKEN_KEY);
    this.localStorage.removeItem(USER_KEY);

    if (typeof window !== 'undefined') {
      const logoutUrl = new URL(`${this.iamUrl}/auth/logout`);
      if (redirectUrl) {
        logoutUrl.searchParams.set('redirect_url', redirectUrl);
      } else if (window.location.origin) {
        logoutUrl.searchParams.set('redirect_url', window.location.origin);
      }
      window.location.href = logoutUrl.toString();
    }
  }

  getToken(): string | null {
    try {
      return this.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  getUser(): VntezUser | null {
    try {
      const userJson = this.localStorage.getItem(USER_KEY);
      return safeJsonParse<VntezUser>(userJson);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }
}
