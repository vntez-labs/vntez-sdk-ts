import { describe, it, expect, vi, beforeEach } from 'vitest';
import { R2Module, createR2Client } from '../src/modules/r2';

describe('R2Module', () => {
  let r2: R2Module;

  beforeEach(() => {
    vi.restoreAllMocks();
    r2 = createR2Client({
      baseUrl: 'https://upload.test.dev',
      apiKey: 'test-api-key',
    });
  });

  it('should request single presigned upload URL', async () => {
    const mockResponse = {
      url: 'https://r2.storage.com/signed-put-url',
      method: 'PUT',
      key: 'uploads/user_1/file.png',
      location: 'https://cdn.test.dev/uploads/user_1/file.png',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockResponse,
    });

    const result = await r2.getPresignedUploadUrl({
      filename: 'file.png',
      type: 'image/png',
      userId: 'user_1',
    });

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://upload.test.dev/api/upload/single',
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
      })
    );
  });

  it('should initiate multipart upload', async () => {
    const mockResponse = {
      uploadId: 'upload_xyz_123',
      key: 'uploads/common/video.mp4',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockResponse,
    });

    const result = await r2.initiateMultipartUpload({
      filename: 'video.mp4',
      type: 'video/mp4',
    });

    expect(result).toEqual(mockResponse);
  });

  it('should sign a single part', async () => {
    const mockResponse = {
      url: 'https://r2.storage.com/part-1-url',
      partNumber: 1,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockResponse,
    });

    const result = await r2.signPart({
      key: 'uploads/video.mp4',
      uploadId: 'upload_123',
      partNumber: 1,
    });

    expect(result).toEqual(mockResponse);
  });

  it('should complete multipart upload with ETags', async () => {
    const mockResponse = {
      success: true,
      key: 'uploads/video.mp4',
      location: 'https://cdn.test.dev/uploads/video.mp4',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockResponse,
    });

    const result = await r2.completeMultipartUpload({
      key: 'uploads/video.mp4',
      uploadId: 'upload_123',
      parts: [
        { PartNumber: 1, ETag: 'etag1' },
        { PartNumber: 2, ETag: 'etag2' },
      ],
    });

    expect(result).toEqual(mockResponse);
  });

  it('should request download URL with key and expiration', async () => {
    const mockResponse = {
      downloadUrl: 'https://r2.storage.com/download-signed',
      expiresIn: 600,
      key: 'private/report.pdf',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockResponse,
    });

    const result = await r2.getDownloadUrl({
      key: 'private/report.pdf',
      expiresIn: 600,
    });

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://upload.test.dev/api/upload/download-url?key=private%2Freport.pdf&expiresIn=600',
      expect.objectContaining({ method: 'GET' })
    );
  });
});
