import { HttpRequestOptions } from '../types/common';

export class VntezError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'VntezError';
  }
}

export async function request<T>(
  url: string,
  options: HttpRequestOptions = {}
): Promise<T> {
  const { query, timeoutMs = 30000, headers: customHeaders, ...fetchOptions } = options;

  const parsedUrl = new URL(url);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        parsedUrl.searchParams.set(key, String(value));
      }
    }
  }
  const requestUrl = parsedUrl.toString();

  const headers = new Headers(customHeaders);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (
    fetchOptions.body &&
    typeof fetchOptions.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(requestUrl, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    let responseData: any;

    if (contentType.includes('application/json')) {
      responseData = await response.json().catch(() => null);
    } else {
      responseData = await response.text().catch(() => null);
    }

    if (!response.ok) {
      const errorMessage =
        responseData?.error ||
        responseData?.message ||
        `Request failed with HTTP status ${response.status}`;
      throw new VntezError(
        errorMessage,
        response.status,
        responseData?.code || responseData?.error_code,
        responseData
      );
    }

    if (responseData && typeof responseData === 'object' && responseData.ok === false) {
      throw new VntezError(
        responseData.error || 'Operation returned ok=false',
        response.status,
        responseData.error_code,
        responseData
      );
    }

    return responseData as T;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new VntezError(`Request timed out after ${timeoutMs}ms`, 408, 'TIMEOUT');
    }
    if (error instanceof VntezError) {
      throw error;
    }
    throw new VntezError(error.message || 'Network request failed', undefined, 'NETWORK_ERROR', error);
  } finally {
    clearTimeout(timeoutId);
  }
}

export class HttpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getHeaders: () => Record<string, string> = () => ({})
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private resolveUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${cleanPath}`;
  }

  async get<T>(path: string, options: Omit<HttpRequestOptions, 'method' | 'body'> = {}): Promise<T> {
    const headers = { ...this.getHeaders(), ...(options.headers as Record<string, string>) };
    return request<T>(this.resolveUrl(path), {
      ...options,
      method: 'GET',
      headers,
    });
  }

  async post<T>(
    path: string,
    body?: any,
    options: Omit<HttpRequestOptions, 'method' | 'body'> = {}
  ): Promise<T> {
    const headers = { ...this.getHeaders(), ...(options.headers as Record<string, string>) };
    const serializedBody = body !== undefined && typeof body !== 'string' ? JSON.stringify(body) : body;
    return request<T>(this.resolveUrl(path), {
      ...options,
      method: 'POST',
      headers,
      body: serializedBody,
    });
  }

  async put<T>(
    path: string,
    body?: any,
    options: Omit<HttpRequestOptions, 'method' | 'body'> = {}
  ): Promise<T> {
    const headers = { ...this.getHeaders(), ...(options.headers as Record<string, string>) };
    const serializedBody = body !== undefined && typeof body !== 'string' ? JSON.stringify(body) : body;
    return request<T>(this.resolveUrl(path), {
      ...options,
      method: 'PUT',
      headers,
      body: serializedBody,
    });
  }

  async patch<T>(
    path: string,
    body?: any,
    options: Omit<HttpRequestOptions, 'method' | 'body'> = {}
  ): Promise<T> {
    const headers = { ...this.getHeaders(), ...(options.headers as Record<string, string>) };
    const serializedBody = body !== undefined && typeof body !== 'string' ? JSON.stringify(body) : body;
    return request<T>(this.resolveUrl(path), {
      ...options,
      method: 'PATCH',
      headers,
      body: serializedBody,
    });
  }

  async delete<T>(path: string, options: Omit<HttpRequestOptions, 'method'> = {}): Promise<T> {
    const headers = { ...this.getHeaders(), ...(options.headers as Record<string, string>) };
    return request<T>(this.resolveUrl(path), {
      ...options,
      method: 'DELETE',
      headers,
    });
  }
}
