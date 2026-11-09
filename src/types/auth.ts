export interface PkceCodes {
  verifier: string;
  challenge: string;
  state: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
  id_token?: string;
}

export interface UserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  avatar?: string;
  picture?: string;
  app_id: string | null;
  role: string;
  roles: string[];
  permissions: string[];
}

export interface SignOutOptions {
  /**
   * URL chuyển hướng sau khi hoàn tất đăng xuất SSO. Mặc định là origin hiện tại
   */
  redirectUrl?: string;
}
