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

export interface HttpRequestOptions extends RequestInit {
  query?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
}

export async function request<T>(
  url: string,
  options: HttpRequestOptions = {}
): Promise<T> {
  const { query, timeoutMs = 30000, headers: customHeaders, ...fetchOptions } = options;

  let requestUrl = url;
  if (query) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      requestUrl += (requestUrl.includes('?') ? '&' : '?') + queryString;
    }
  }

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
