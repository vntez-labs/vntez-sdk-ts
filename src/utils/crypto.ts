// PKCE Code Verifier Generator (64 characters)
export function generateCodeVerifier(): string {
  const randomBytes = new Uint8Array(64);
  crypto.getRandomValues(randomBytes);
  return base64UrlEncode(randomBytes);
}

// Generate Code Challenge from Code Verifier
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashBytes = new Uint8Array(hashBuffer);
  return base64UrlEncode(hashBytes);
}

// Generate random state (32 characters)
export function generateState(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return base64UrlEncode(randomBytes);
}

// Base64 URL encode helper
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Storage helpers for browser environments
export class BrowserStorage {
  private readonly storage: Storage;

  constructor(type: 'session' | 'local' = 'session') {
    if (typeof window === 'undefined') {
      throw new Error('Browser storage is only available in browser environments');
    }
    this.storage = type === 'session' ? window.sessionStorage : window.localStorage;
  }

  getItem(key: string): string | null {
    return this.storage.getItem(key);
  }

  setItem(key: string, value: string): void {
    this.storage.setItem(key, value);
  }

  removeItem(key: string): void {
    this.storage.removeItem(key);
  }

  clear(): void {
    this.storage.clear();
  }
}

// Safe JSON parse with fallback
export function safeJsonParse<T>(json: string | null): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}