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
