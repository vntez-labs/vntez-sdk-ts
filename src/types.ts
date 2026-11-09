// ============================================================================
// 1. Core & Auth Types
// ============================================================================

export interface AuthStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

export interface VntezClientConfig {
  clientId?: string;
  redirectUri?: string;
  gatewayUrl?: string; // Default: 'https://iam.hnamhocit.workers.dev' or 'https://vntez-iam.vercel.app'
  appId?: string;
  storage?: AuthStorage; // Default: sessionStorage in browser
  r2Url?: string; // Default: 'https://upload.hnamhocit.workers.dev'
  telebotUrl?: string; // Default: 'https://telebot.hnamhocit.workers.dev'
  r2ApiKey?: string;
  telebotApiKey?: string;
}

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
  redirectUrl?: string;
}

// ============================================================================
// 2. R2 / Upload Worker Types
// ============================================================================

export interface R2ClientConfig {
  baseUrl?: string; // Default: 'https://upload.hnamhocit.workers.dev'
  apiKey?: string;
  defaultFolder?: string; // Default: 'uploads'
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
  partNumber?: number;
  totalParts?: number;
}

export interface BaseUploadOptions {
  filename: string;
  type?: string;
  userId?: string;
  folder?: string;
  onProgress?: (progress: UploadProgress) => void;
}

export interface SingleUploadOptions extends BaseUploadOptions {}

export interface MultipartUploadOptions extends BaseUploadOptions {
  partSize?: number; // Size per chunk in bytes. Default: 5MB (5 * 1024 * 1024)
  concurrency?: number; // Concurrent part uploads. Default: 3
  onPartComplete?: (part: { partNumber: number; totalParts: number }) => void;
}

export interface AutoUploadOptions extends MultipartUploadOptions {
  multipartThreshold?: number; // Threshold to switch to multipart. Default: 10MB
}

export interface PresignedUploadResult {
  url: string;
  method: 'PUT';
  key: string;
  location: string;
}

export interface MultipartStartResult {
  uploadId: string;
  key: string;
}

export interface UploadPartResult {
  url: string;
  partNumber: number;
}

export interface PartETag {
  PartNumber: number;
  ETag: string;
}

export interface CompleteMultipartResult {
  success: boolean;
  key: string;
  location: string;
}

export interface DownloadUrlOptions {
  key: string;
  expiresIn?: number; // Validity in seconds, default: 300, max: 604800 (7 days)
}

export interface DownloadUrlResult {
  downloadUrl: string;
  expiresIn: number;
  key: string;
}

export interface UploadResult {
  key: string;
  location: string;
  url?: string;
  size?: number;
  isMultipart?: boolean;
}

// ============================================================================
// 3. TeleBot Worker Types
// ============================================================================

export interface TeleBotClientConfig {
  baseUrl?: string; // Default: 'https://telebot.hnamhocit.workers.dev'
  apiKey?: string;
}

export type TelegramParseMode = 'HTML' | 'Markdown' | 'MarkdownV2';

export interface TelegramButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface SendMessageOptions {
  chat_id: number | string;
  text: string;
  parse_mode?: TelegramParseMode;
  buttons?: TelegramButton[][];
  disable_notification?: boolean;
  disable_web_page_preview?: boolean;
}

export interface SendPhotoOptions {
  chat_id: number | string;
  photo: string; // URL or Telegram file_id
  caption?: string;
  parse_mode?: TelegramParseMode;
  buttons?: TelegramButton[][];
  disable_notification?: boolean;
}

export interface BroadcastOptions {
  text: string;
  chat_ids?: (number | string)[]; // Explicit recipient list. If omitted, uses active subscribers from Supabase
  tags?: string[]; // Filter active subscribers by tags (when chat_ids omitted)
  status?: 'active' | 'unsubscribed' | 'all'; // Default: 'active'
  parse_mode?: TelegramParseMode;
  buttons?: TelegramButton[][];
  disable_notification?: boolean;
}

export interface BroadcastDeliveryResult {
  chat_id: number | string;
  ok: boolean;
  message_id?: number;
  error?: string;
}

export interface BroadcastResult {
  ok: boolean;
  total: number;
  success_count: number;
  failure_count: number;
  source: 'custom_payload' | 'supabase_subscribers';
  results: BroadcastDeliveryResult[];
}

export interface Subscriber {
  chat_id: number;
  email: string;
  user_id?: string | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  status: 'active' | 'unsubscribed' | 'blocked';
  tags: string[];
  metadata?: Record<string, any>;
  subscribed_at?: string;
  updated_at?: string;
}

export interface SubscriberUpsertPayload {
  chat_id: number | string;
  email?: string;
  user_id?: string | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  status?: 'active' | 'unsubscribed' | 'blocked';
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface SubscriberUpdatePayload {
  email?: string;
  user_id?: string | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  status?: 'active' | 'unsubscribed' | 'blocked';
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface SubscriberListQuery {
  status?: 'active' | 'unsubscribed' | 'all';
  tag?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface SubscriberListResponse {
  ok: boolean;
  subscribers: Subscriber[];
  total: number;
  limit: number;
  offset: number;
}

export interface TelegramWidgetAuthData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export type TelegramAuthData = TelegramWidgetAuthData;

export interface WidgetVerificationResult {
  valid: boolean;
  user?: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
  };
  error?: string;
}

export interface InitDataValidationResult {
  valid: boolean;
  user?: Record<string, any>;
  auth_date?: number;
  query_id?: string;
  error?: string;
}

export interface WebhookInfo {
  ok: boolean;
  result: {
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
    ip_address?: string;
    last_error_date?: number;
    last_error_message?: string;
    last_synchronization_error_date?: number;
    max_connections?: number;
    allowed_updates?: string[];
  };
}
