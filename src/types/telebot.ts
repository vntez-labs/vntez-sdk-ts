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
