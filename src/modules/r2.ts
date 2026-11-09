import { request, VntezError } from '../http';
import type {
  AutoUploadOptions,
  CompleteMultipartResult,
  DownloadUrlOptions,
  DownloadUrlResult,
  MultipartStartResult,
  MultipartUploadOptions,
  PartETag,
  PresignedUploadResult,
  R2ClientConfig,
  SingleUploadOptions,
  UploadPartResult,
  UploadProgress,
  UploadResult,
} from '../types';

export class R2Module {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly defaultFolder: string;

  constructor(config: R2ClientConfig = {}) {
    this.baseUrl = (config.baseUrl || 'https://upload.hnamhocit.workers.dev').replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.defaultFolder = config.defaultFolder || 'uploads';
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    return headers;
  }

  // --------------------------------------------------------------------------
  // Low-Level Presigned URL API Calls
  // --------------------------------------------------------------------------

  /**
   * Xin Presigned PUT URL để upload trực tiếp một file nhỏ (< 10MB)
   */
  async getPresignedUploadUrl(options: {
    filename: string;
    type: string;
    userId?: string;
    folder?: string;
  }): Promise<PresignedUploadResult> {
    return request<PresignedUploadResult>(`${this.baseUrl}/api/upload/single`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        filename: options.filename,
        type: options.type,
        userId: options.userId,
        folder: options.folder || this.defaultFolder,
      }),
    });
  }

  /**
   * Khởi tạo phiên Multipart Upload cho file lớn (> 10MB)
   */
  async initiateMultipartUpload(options: {
    filename: string;
    type: string;
    userId?: string;
    folder?: string;
  }): Promise<MultipartStartResult> {
    return request<MultipartStartResult>(`${this.baseUrl}/api/upload/multipart/start`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        filename: options.filename,
        type: options.type,
        userId: options.userId,
        folder: options.folder || this.defaultFolder,
      }),
    });
  }

  /**
   * Xin Presigned PUT URL cho một Part đơn lẻ (1-based index)
   */
  async signPart(options: {
    key: string;
    uploadId: string;
    partNumber: number;
  }): Promise<UploadPartResult> {
    return request<UploadPartResult>(`${this.baseUrl}/api/upload/multipart/part`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(options),
    });
  }

  /**
   * Xin trước danh sách Presigned PUT URLs cho nhiều Part cùng lúc
   */
  async batchSignParts(options: {
    key: string;
    uploadId: string;
    partNumbers: number[];
  }): Promise<Record<number, string>> {
    const res = await request<{ presignedUrls: Record<number, string> }>(
      `${this.baseUrl}/api/upload/multipart/batch-sign-parts`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(options),
      }
    );
    return res.presignedUrls;
  }

  /**
   * Hoàn tất ghép các Parts thành file hoàn chỉnh
   */
  async completeMultipartUpload(options: {
    key: string;
    uploadId: string;
    parts: PartETag[];
  }): Promise<CompleteMultipartResult> {
    return request<CompleteMultipartResult>(
      `${this.baseUrl}/api/upload/multipart/complete`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(options),
      }
    );
  }

  /**
   * Hủy phiên Multipart Upload và giải phóng dung lượng tạm
   */
  async abortMultipartUpload(options: {
    key: string;
    uploadId: string;
  }): Promise<{ aborted: boolean }> {
    return request<{ aborted: boolean }>(`${this.baseUrl}/api/upload/multipart/abort`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(options),
    });
  }

  /**
   * Lấy Presigned GET URL để download / view file từ bucket private
   */
  async getDownloadUrl(options: DownloadUrlOptions): Promise<DownloadUrlResult> {
    return request<DownloadUrlResult>(`${this.baseUrl}/api/upload/download-url`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      query: {
        key: options.key,
        expiresIn: options.expiresIn,
      },
    });
  }

  // --------------------------------------------------------------------------
  // High-Level Automated Upload Methods
  // --------------------------------------------------------------------------

  /**
   * Upload đơn lẻ trực tiếp lên R2 (< 10MB) với thanh tiến trình
   */
  async uploadSingle(
    data: File | Blob | Uint8Array | ArrayBuffer,
    options: SingleUploadOptions
  ): Promise<UploadResult> {
    const mimeType = options.type || inferMimeType(data, options.filename);
    const size = getDataSize(data);

    // 1. Lấy presigned PUT URL
    const presigned = await this.getPresignedUploadUrl({
      filename: options.filename,
      type: mimeType,
      userId: options.userId,
      folder: options.folder,
    });

    // 2. Upload trực tiếp binary data lên R2
    const body = toBodyInit(data, mimeType);
    await uploadBinaryData(presigned.url, body, mimeType, (loaded) => {
      if (options.onProgress) {
        options.onProgress({
          loaded,
          total: size,
          percent: size > 0 ? Math.round((loaded / size) * 100) : 100,
        });
      }
    });

    return {
      key: presigned.key,
      location: presigned.location,
      url: presigned.url,
      size,
      isMultipart: false,
    };
  }

  /**
   * Upload file lớn dạng Multipart (chia mảnh 5MB+, đa luồng, tự động ghép)
   */
  async uploadMultipart(
    data: File | Blob | Uint8Array | ArrayBuffer,
    options: MultipartUploadOptions
  ): Promise<UploadResult> {
    const partSize = options.partSize || 5 * 1024 * 1024; // Mặc định 5MB
    const concurrency = Math.max(1, Math.min(options.concurrency || 3, 10)); // 3 luồng
    const mimeType = options.type || inferMimeType(data, options.filename);
    const totalSize = getDataSize(data);

    if (totalSize === 0) {
      throw new VntezError('Cannot upload empty file via multipart', 400);
    }

    const totalParts = Math.ceil(totalSize / partSize);

    // 1. Khởi tạo phiên
    const init = await this.initiateMultipartUpload({
      filename: options.filename,
      type: mimeType,
      userId: options.userId,
      folder: options.folder,
    });

    const parts: PartETag[] = [];
    const partBytesLoaded = new Map<number, number>();

    const updateOverallProgress = () => {
      if (!options.onProgress) return;
      let totalLoaded = 0;
      for (const loaded of partBytesLoaded.values()) {
        totalLoaded += loaded;
      }
      totalLoaded = Math.min(totalLoaded, totalSize);
      options.onProgress({
        loaded: totalLoaded,
        total: totalSize,
        percent: Math.round((totalLoaded / totalSize) * 100),
        totalParts,
      });
    };

    try {
      // 2. Chuẩn bị danh sách parts cần upload
      const partNumbers = Array.from({ length: totalParts }, (_, i) => i + 1);

      // Xử lý concurrency pool
      let currentIndex = 0;
      const worker = async () => {
        while (currentIndex < partNumbers.length) {
          const partIndex = currentIndex++;
          const partNumber = partNumbers[partIndex];
          const start = (partNumber - 1) * partSize;
          const end = Math.min(start + partSize, totalSize);
          const chunk = sliceData(data, start, end, mimeType);
          const chunkSize = end - start;

          // Lấy presigned URL cho part này
          const signedPart = await this.signPart({
            key: init.key,
            uploadId: init.uploadId,
            partNumber,
          });

          // Upload chunk và lấy ETag
          let etag = '';
          let retries = 3;
          while (retries > 0) {
            try {
              const res = await uploadBinaryData(
                signedPart.url,
                chunk,
                mimeType,
                (loaded) => {
                  partBytesLoaded.set(partNumber, loaded);
                  updateOverallProgress();
                }
              );
              etag = res.etag;
              break;
            } catch (err) {
              retries--;
              if (retries === 0) throw err;
              await new Promise((r) => setTimeout(r, 1000));
            }
          }

          parts.push({ PartNumber: partNumber, ETag: etag });
          if (options.onPartComplete) {
            options.onPartComplete({ partNumber, totalParts });
          }
        }
      };

      // Chạy đồng thời `concurrency` workers
      const pool = Array.from({ length: Math.min(concurrency, totalParts) }, () => worker());
      await Promise.all(pool);

      // 3. Sắp xếp Parts tăng dần và Hoàn tất
      parts.sort((a, b) => a.PartNumber - b.PartNumber);
      const completeRes = await this.completeMultipartUpload({
        key: init.key,
        uploadId: init.uploadId,
        parts,
      });

      return {
        key: completeRes.key,
        location: completeRes.location,
        size: totalSize,
        isMultipart: true,
      };
    } catch (error) {
      // Tự động abort nếu tiến trình upload gặp lỗi giữa chừng
      try {
        await this.abortMultipartUpload({ key: init.key, uploadId: init.uploadId });
      } catch {
        // bỏ qua lỗi abort
      }
      throw error;
    }
  }

  /**
   * Tự động chọn Upload đơn lẻ (< 10MB) hoặc Multipart Upload (>= 10MB)
   */
  async upload(
    data: File | Blob | Uint8Array | ArrayBuffer,
    options: AutoUploadOptions
  ): Promise<UploadResult> {
    const size = getDataSize(data);
    const threshold = options.multipartThreshold || 10 * 1024 * 1024; // 10MB

    if (size >= threshold) {
      return this.uploadMultipart(data, options);
    }
    return this.uploadSingle(data, options);
  }
}

// ----------------------------------------------------------------------------
// Internal Helpers
// ----------------------------------------------------------------------------

function getDataSize(data: File | Blob | Uint8Array | ArrayBuffer): number {
  if (typeof (data as Blob).size === 'number') {
    return (data as Blob).size;
  }
  if ((data as Uint8Array).byteLength !== undefined) {
    return (data as Uint8Array).byteLength;
  }
  return 0;
}

function inferMimeType(data: any, filename: string): string {
  if (data && typeof data.type === 'string' && data.type) {
    return data.type;
  }
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    case 'pdf': return 'application/pdf';
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'zip': return 'application/zip';
    case 'json': return 'application/json';
    default: return 'application/octet-stream';
  }
}

function toBodyInit(data: File | Blob | Uint8Array | ArrayBuffer, type?: string): BodyInit {
  if (typeof Blob !== 'undefined' && (data instanceof Blob || (typeof File !== 'undefined' && data instanceof File))) {
    return data;
  }
  if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
    return data as unknown as BodyInit;
  }
  return new Blob([data as any], { type: type || 'application/octet-stream' });
}

function sliceData(
  data: File | Blob | Uint8Array | ArrayBuffer,
  start: number,
  end: number,
  type?: string
): BodyInit {
  if (typeof (data as Blob).slice === 'function') {
    return (data as Blob).slice(start, end, type);
  }
  if (data instanceof Uint8Array) {
    return data.subarray(start, end) as unknown as BodyInit;
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data, start, end - start) as unknown as BodyInit;
  }
  throw new Error('Unsupported binary data type for slicing');
}

/**
 * Upload binary payload lên presigned PUT URL với hỗ trợ progress tracking
 */
async function uploadBinaryData(
  url: string,
  body: BodyInit,
  contentType: string,
  onProgress?: (loaded: number) => void
): Promise<{ etag: string }> {
  // 1. Trình duyệt có XMLHttpRequest: Theo dõi byte chính xác
  if (typeof XMLHttpRequest !== 'undefined') {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      xhr.setRequestHeader('Content-Type', contentType);

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            onProgress(evt.loaded);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const etag = (xhr.getResponseHeader('ETag') || '').replace(/['"]+/g, '');
          resolve({ etag });
        } else {
          reject(new VntezError(`Upload to storage failed with status ${xhr.status}: ${xhr.statusText}`, xhr.status));
        }
      };

      xhr.onerror = () => reject(new VntezError('Network error while uploading data to storage'));
      xhr.send(body as any);
    });
  }

  // 2. Node / Bun / Worker môi trường không có XHR: Dùng fetch
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body,
  });

  if (!res.ok) {
    throw new VntezError(`Upload to storage failed with status ${res.status}: ${res.statusText}`, res.status);
  }

  if (onProgress) {
    const size = typeof (body as any).size === 'number' ? (body as any).size : (body as any).byteLength || 0;
    onProgress(size);
  }

  const etag = (res.headers.get('ETag') || '').replace(/['"]+/g, '');
  return { etag };
}

export const createR2Client = (config: R2ClientConfig = {}) => new R2Module(config);
