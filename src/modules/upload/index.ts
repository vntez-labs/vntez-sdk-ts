import type {
  SingleUploadResponse,
  MultipartCreateResponse,
  UploadPartResponse,
  CompleteMultipartResponse,
  DeleteResponse,
  FileInfo,
  MultipartPart,
  UppyCompanionOptions,
} from '../../types';

export class UploadModule {
  private readonly uploadUrl: string;
  private getAuthToken: () => string | null;

  constructor(config: { uploadUrl?: string; getAuthToken: () => string | null }) {
    this.uploadUrl = config.uploadUrl || 'https://upload.vntez.com';
    this.getAuthToken = config.getAuthToken;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async single(file: File | Blob, filename?: string): Promise<SingleUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (filename) {
      formData.append('filename', filename);
    }

    const response = await fetch(`${this.uploadUrl}/upload/single`, {
      method: 'POST',
      body: formData,
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Single upload failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async createMultipart(
    filename: string,
    contentType: string,
    size: number
  ): Promise<MultipartCreateResponse> {
    const response = await fetch(`${this.uploadUrl}/upload/multipart/create`, {
      method: 'POST',
      body: JSON.stringify({ filename, contentType, size }),
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Create multipart failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async uploadPart(
    uploadId: string,
    key: string,
    partNumber: number,
    chunk: Blob | ArrayBuffer
  ): Promise<UploadPartResponse> {
    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('key', key);
    formData.append('partNumber', partNumber.toString());

    const blob = chunk instanceof ArrayBuffer ? new Blob([chunk]) : chunk;
    formData.append('chunk', blob);

    const response = await fetch(`${this.uploadUrl}/upload/multipart/upload-part`, {
      method: 'POST',
      body: formData,
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload part failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async completeMultipart(
    uploadId: string,
    key: string,
    parts: MultipartPart[]
  ): Promise<CompleteMultipartResponse> {
    const response = await fetch(`${this.uploadUrl}/upload/multipart/complete`, {
      method: 'POST',
      body: JSON.stringify({ uploadId, key, parts }),
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Complete multipart failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async abortMultipart(uploadId: string, key: string): Promise<void> {
    const response = await fetch(`${this.uploadUrl}/upload/multipart/abort`, {
      method: 'POST',
      body: JSON.stringify({ uploadId, key }),
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Abort multipart failed: ${response.status} ${errorText}`);
    }
  }

  async delete(key: string): Promise<DeleteResponse> {
    const response = await fetch(`${this.uploadUrl}/upload?key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Delete failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async getInfo(key: string): Promise<FileInfo> {
    const response = await fetch(
      `${this.uploadUrl}/upload/info?key=${encodeURIComponent(key)}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Get file info failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  getUppyCompanion(): UppyCompanionOptions {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return {
      companionUrl: this.uploadUrl,
      headers,
    };
  }
}