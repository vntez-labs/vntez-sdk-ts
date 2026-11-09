import { customAlphabet } from 'nanoid';
import type { PkceCodes } from '../types';

// RFC 7636 Section 4.1 unreserved characters: [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
const PKCE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
const generateSecureString = customAlphabet(PKCE_CHARSET);

export function generateRandomString(length: number = 43): string {
  return generateSecureString(length);
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bufferToBase64Url(digest);
}

export async function generatePkce(): Promise<PkceCodes> {
  const verifier = generateRandomString(64);
  const challenge = await generateCodeChallenge(verifier);
  const state = generateRandomString(32);

  return { verifier, challenge, state };
}
