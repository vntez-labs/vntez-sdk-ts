export interface VntezClientConfig {
  appId: string;
  iamUrl?: string;      // default: 'https://vntez-iam.vercel.app'
  uploadUrl?: string;   // default: 'https://upload.vntez.com'
}

export interface VntezUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  roles: string[];
  permissions: string[];
  metadata?: Record<string, unknown>;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface RemoteConfigResponse<T = Record<string, unknown>> {
  enabled: boolean;
  config: T;
}

export interface FileInfo {
  key: string;
  size: number;
  contentType: string;
  lastModified: string;
  etag: string;
  metadata?: Record<string, unknown>;
}

export interface SingleUploadResponse {
  success: boolean;
  key: string;
  url: string;
}

export interface MultipartCreateResponse {
  uploadId: string;
  key: string;
}

export interface UploadPartResponse {
  partNumber: number;
  etag: string;
}

export interface CompleteMultipartResponse {
  success: boolean;
  key: string;
  url: string;
}

export interface MultipartPart {
  partNumber: number;
  etag: string;
}

export interface DeleteResponse {
  success: boolean;
}

export interface UppyCompanionOptions {
  companionUrl: string;
  headers?: Record<string, string>;
}

export interface HttpRequestOptions extends RequestInit {
  query?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
}
