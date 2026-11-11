# @vntez/sdk

Zero-dependency TypeScript SDK for VNTEZ Platform. Built for modern Web Browsers, Node.js 18+, Cloudflare Workers, and Bun.

**Features:**
- 🚀 **Zero Runtime Dependencies** - Uses native Web Crypto API & fetch
- 🔐 **OAuth 2.0 PKCE Authentication** - Secure browser-based authentication
- 📦 **Unified Client API** - Simple, consistent interface across all services
- ⚡ **R2 Multipart Upload** - Single & multipart upload with auto-retry
- ⚙️ **Remote Config** - Dynamic configuration management
- 📝 **Full TypeScript Support** - Complete type definitions

---

## Installation

```bash
# Using bun
bun add @vntez/sdk

# Using npm
npm install @vntez/sdk

# Using pnpm
pnpm add @vntez/sdk
```

---

## Quick Start

```typescript
import { VntezClient } from '@vntez/sdk';

// Initialize the client
const vntez = new VntezClient({
  appId: 'your-app-id',
  iamUrl: 'https://vntez-iam.vercel.app',      // optional
  uploadUrl: 'https://upload.vntez.com',       // optional
});

// Use the SDK
console.log(vntez.auth.isAuthenticated()); // Check auth status
```

---

## Core Modules

### 1. Authentication (`vntez.auth`)

Secure OAuth 2.0 PKCE authentication for browser environments.

```typescript
// 1. Sign in (redirects to IAM)
await vntez.auth.signIn({
  redirectUri: 'https://yourapp.com/callback'
});

// 2. Handle callback (on your callback page)
const { accessToken, user } = await vntez.auth.handleCallback();
console.log('User:', user.name, 'Roles:', user.roles);

// 3. Check authentication status
const token = vntez.auth.getToken(); // returns access token or null
const currentUser = vntez.auth.getUser(); // returns user object or null
const isAuth = vntez.auth.isAuthenticated(); // boolean

// 4. Sign out
vntez.auth.signOut('https://yourapp.com'); // redirect after logout
```

### 2. Remote Config (`vntez.config`)

Dynamic configuration management.

```typescript
// Get application configuration
const config = await vntez.config.get<{
  theme: string;
  features: string[];
}>();

if (config.enabled) {
  console.log('Config:', config.config.theme);
  console.log('Features:', config.config.features);
}
```

### 3. File Upload (`vntez.upload`)

Single and multipart file upload with R2 storage.

#### Single File Upload
```typescript
const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
const file = fileInput?.files?.[0];

if (file) {
  const result = await vntez.upload.single(file, 'my-file.jpg');
  console.log('Uploaded:', result.key, result.url);
}
```

#### Multipart Upload (Large Files)
```typescript
// 1. Create multipart upload session
const multipart = await vntez.upload.createMultipart(
  'large-video.mp4',
  'video/mp4',
  1024 * 1024 * 100 // 100MB
);

// 2. Upload parts (in parallel)
const partResults = await Promise.all([
  vntez.upload.uploadPart(multipart.uploadId, multipart.key, 1, chunk1),
  vntez.upload.uploadPart(multipart.uploadId, multipart.key, 2, chunk2),
  // ... more parts
]);

// 3. Complete multipart upload
const completeResult = await vntez.upload.completeMultipart(
  multipart.uploadId,
  multipart.key,
  partResults.map(p => ({ partNumber: p.partNumber, etag: p.etag }))
);

console.log('Completed:', completeResult.url);
```

#### File Operations
```typescript
// Get file info
const info = await vntez.upload.getInfo('uploads/avatar.jpg');
console.log('File size:', info.size, 'Content type:', info.contentType);

// Delete file
const deleteResult = await vntez.upload.delete('uploads/avatar.jpg');
if (deleteResult.success) {
  console.log('File deleted');
}

// Abort multipart upload (if needed)
await vntez.upload.abortMultipart(uploadId, key);
```

#### Uppy Companion Integration
```typescript
const uppyOptions = vntez.upload.getUppyCompanion();
// Use with @uppy/aws-s3 or @uppy/xhr-upload
```

---

## API Reference

### `VntezClient` Configuration
```typescript
interface VntezClientConfig {
  appId: string;                // Your application ID (required)
  iamUrl?: string;             // IAM endpoint (default: 'https://vntez-iam.vercel.app')
  uploadUrl?: string;          // Upload endpoint (default: 'https://upload.vntez.com')
}
```

### Authentication Types
```typescript
interface VntezUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  roles: string[];
  permissions: string[];
  metadata?: Record<string, unknown>;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}
```

### Upload Types
```typescript
interface SingleUploadResponse {
  success: boolean;
  key: string;
  url: string;
}

interface FileInfo {
  key: string;
  size: number;
  contentType: string;
  lastModified: string;
  etag: string;
  metadata?: Record<string, unknown>;
}
```

---

## Zero-Dependency Architecture

This SDK uses only native browser/Node.js APIs:
- **Crypto**: `crypto.subtle`, `crypto.getRandomValues`
- **HTTP**: `fetch`, `FormData`
- **Storage**: `sessionStorage`, `localStorage` (browser only)

No external dependencies required!

---

## Browser Compatibility

- **Modern Browsers**: Chrome 61+, Firefox 60+, Safari 11+, Edge 79+
- **Node.js**: 18+ (with fetch API support)
- **Cloudflare Workers**: Fully compatible
- **Bun**: Fully compatible

---

## Development

```bash
# Install dependencies
npm install

# Type checking
npm run typecheck

# Build for production
npm run build

# Development watch mode
npm run dev
```

---

## License

MIT © Hoàng Nam (@hnamhocit)
