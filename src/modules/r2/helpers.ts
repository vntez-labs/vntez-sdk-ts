import { VntezError } from '../../http';

export function getDataSize(data: File | Blob | Uint8Array | ArrayBuffer): number {
  if (typeof (data as Blob).size === 'number') {
    return (data as Blob).size;
  }
  if ((data as Uint8Array).byteLength !== undefined) {
    return (data as Uint8Array).byteLength;
  }
  return 0;
}

export function inferMimeType(data: any, filename: string): string {
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

export function toBodyInit(data: File | Blob | Uint8Array | ArrayBuffer, type?: string): BodyInit {
  if (typeof Blob !== 'undefined' && (data instanceof Blob || (typeof File !== 'undefined' && data instanceof File))) {
    return data;
  }
  if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
    return data as unknown as BodyInit;
  }
  return new Blob([data as any], { type: type || 'application/octet-stream' });
}

export function sliceData(
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
export async function uploadBinaryData(
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
