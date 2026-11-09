import { HttpClient, VntezError } from '../../http';
import {
  getDataSize,
  inferMimeType,
  sliceData,
  toBodyInit,
  uploadBinaryData,
} from './helpers';
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
  UploadResult,
} from '../../types';

export class R2Module {
  private readonly defaultFolder: string;
  private readonly http: HttpClient;

  constructor(config: R2ClientConfig = {}) {
    const baseUrl = (config.baseUrl || 'https://upload.hnamhocit.workers.dev').replace(/\/+$/, '');
    this.defaultFolder = config.defaultFolder || 'uploads';

    const getHeaders = () => {
      const headers: Record<string, string> = {};
      if (config.apiKey) {
        headers['X-API-Key'] = config.apiKey;
      }
      return headers;
    };

    this.http = new HttpClient(baseUrl, getHeaders);
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
    return this.http.post<PresignedUploadResult>('/api/upload/single', {
      filename: options.filename,
      type: options.type,
      userId: options.userId,
      folder: options.folder || this.defaultFolder,
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
    return this.http.post<MultipartStartResult>('/api/upload/multipart/start', {
      filename: options.filename,
      type: options.type,
      userId: options.userId,
      folder: options.folder || this.defaultFolder,
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
    return this.http.post<UploadPartResult>('/api/upload/multipart/part', options);
  }

  /**
   * Xin trước danh sách Presigned PUT URLs cho nhiều Part cùng lúc
   */
  async batchSignParts(options: {
    key: string;
    uploadId: string;
    partNumbers: number[];
  }): Promise<Record<number, string>> {
    const res = await this.http.post<{ presignedUrls: Record<number, string> }>(
      '/api/upload/multipart/batch-sign-parts',
      options
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
    return this.http.post<CompleteMultipartResult>(
      '/api/upload/multipart/complete',
      options
    );
  }

  /**
   * Hủy phiên Multipart Upload và giải phóng dung lượng tạm
   */
  async abortMultipartUpload(options: {
    key: string;
    uploadId: string;
  }): Promise<{ aborted: boolean }> {
    return this.http.post<{ aborted: boolean }>('/api/upload/multipart/abort', options);
  }

  /**
   * Lấy Presigned GET URL để download / view file từ bucket private
   */
  async getDownloadUrl(options: DownloadUrlOptions): Promise<DownloadUrlResult> {
    return this.http.get<DownloadUrlResult>('/api/upload/download-url', {
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
      try {
        await this.abortMultipartUpload({ key: init.key, uploadId: init.uploadId });
      } catch {
        // ignore abort error
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

export const createR2Client = (config: R2ClientConfig = {}) => new R2Module(config);
export * from './helpers';
