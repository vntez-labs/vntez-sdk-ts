# @vntez/sdk

Official TypeScript/JavaScript SDK for VNTEZ Edge Microservices platform. Built for modern Web Browsers, Cloudflare Workers, Node.js, and Bun.

Provides ergonomic, type-safe clients for:
- **R2 / S3 Storage (`R2Module`)**: Direct single upload, chunked multipart upload (5MB+ chunks, multi-threaded, auto-retry), presigned download URLs, and progress tracking.
- **TeleBot (`TeleBotModule`)**: Telegram Bot messaging, photos, broadcast (with Supabase audience segmentation), subscriber CRUD management, Login Widget & MiniApp initData cryptographic verification.
- **IAM Auth (`AuthModule`)**: OAuth 2.0 PKCE flow, Single Sign-On (SSO), user profile & scoped RBAC permissions.

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

## Quickstart: Unified Client

Khởi tạo client yêu cầu cung cấp **`id` (hoặc `clientId`)** và **`secret` (hoặc `clientSecret`)**. Mã bí mật `secret` sẽ tự động được các module (R2, TeleBot, IAM) kế thừa làm `apiKey` xác thực:

```typescript
import { createClient } from '@vntez/sdk';

const vntez = createClient({
  // Bắt buộc: Định danh & Mã bí mật ứng dụng
  id: 'your-client-id',           // hoặc clientId
  secret: 'your-client-secret',   // hoặc clientSecret

  // Cấu hình OAuth Callback (nếu dùng IAM SSO)
  redirectUri: 'https://myapp.com/callback',
});
```

You can also instantiate individual clients independently:

```typescript
import { createR2Client, createTeleBotClient } from '@vntez/sdk';

const r2 = createR2Client({ baseUrl: 'https://upload.hnamhocit.workers.dev' });
const telebot = createTeleBotClient({ baseUrl: 'https://telebot.hnamhocit.workers.dev', apiKey: 'secret' });
```

---

## 1. R2 Storage Client (`vntez.r2` or `createR2Client`)

### 1.1 Direct Single Upload (< 10MB)

Uploads small files directly to Cloudflare R2 using a presigned PUT URL:

```typescript
const fileInput = document.querySelector<HTMLInputElement>('#fileInput')!;
const file = fileInput.files![0];

const result = await vntez.r2.uploadSingle(file, {
  filename: file.name,
  folder: 'avatars',
  userId: 'usr_123',
  onProgress: (p) => {
    console.log(`Uploaded ${p.percent}% (${p.loaded}/${p.total} bytes)`);
  },
});

console.log('File key:', result.key);
console.log('Public CDN URL:', result.location);
```

### 1.2 Chunked Multipart Upload (> 10MB / Large Files)

Automatically slices the file into 5MB chunks and uploads them concurrently with automatic retry and progress calculation:

```typescript
const largeVideo = fileInput.files![0]; // e.g. 500MB video

const result = await vntez.r2.uploadMultipart(largeVideo, {
  filename: largeVideo.name,
  folder: 'videos',
  partSize: 5 * 1024 * 1024, // 5MB per chunk (default)
  concurrency: 3, // 3 parallel chunk uploads
  onProgress: (p) => {
    console.log(`Total Progress: ${p.percent}%`);
  },
  onPartComplete: ({ partNumber, totalParts }) => {
    console.log(`Part ${partNumber}/${totalParts} finished`);
  },
});

console.log('Video uploaded successfully:', result.location);
```

### 1.3 Smart Upload (`upload`)

Automatically checks file size:
- If `< 10MB`, uses `uploadSingle`.
- If `>= 10MB`, automatically uses `uploadMultipart`.

```typescript
const result = await vntez.r2.upload(file, {
  filename: file.name,
  folder: 'documents',
  onProgress: (p) => console.log(`${p.percent}%`),
});
```

### 1.4 Presigned Download URL (Private Bucket)

```typescript
const { downloadUrl, expiresIn } = await vntez.r2.getDownloadUrl({
  key: 'private/contracts/doc_01.pdf',
  expiresIn: 3600, // Valid for 1 hour
});

window.open(downloadUrl, '_blank');
```

---

## 2. TeleBot Client (`vntez.telebot` or `createTeleBotClient`)

### 2.1 Send Message

```typescript
await vntez.telebot.sendMessage(123456789, '<b>Đơn hàng mới #1024</b>', {
  parse_mode: 'HTML',
  buttons: [
    [
      { text: 'Xem chi tiết', url: 'https://vntez.com/orders/1024' },
      { text: 'Hỗ trợ', callback_data: 'support_order_1024' },
    ],
  ],
});
```

### 2.2 Send Photo with Caption

```typescript
await vntez.telebot.sendPhoto(123456789, 'https://cdn.vntez.com/invoice.png', {
  caption: 'Hóa đơn thanh toán định kỳ',
  parse_mode: 'HTML',
});
```

### 2.3 Mass Broadcast

#### Option A: Target Active Supabase Subscribers by Tag
```typescript
const report = await vntez.telebot.broadcast({
  text: '🎉 <b>Thông báo VIP:</b> Khuyến mãi 50% bắt đầu!',
  parse_mode: 'HTML',
  tags: ['vip'], // Only active subscribers with tag 'vip'
  status: 'active',
});

console.log(`Sent: ${report.success_count}, Failed: ${report.failure_count}`);
```

#### Option B: Target Explicit Chat IDs
```typescript
await vntez.telebot.broadcast({
  text: '📢 Hệ thống bảo trì lúc 02:00',
  chat_ids: [123456789, 987654321],
});
```

### 2.4 Subscribers Management (Supabase)

```typescript
// 1. List subscribers with filter
const { subscribers, total } = await vntez.telebot.subscribers.list({
  status: 'active',
  tag: 'vip',
  limit: 20,
});

// 2. Get subscriber details
const sub = await vntez.telebot.subscribers.get(123456789);

// 3. Upsert subscriber
await vntez.telebot.subscribers.upsert({
  chat_id: 123456789,
  email: 'customer@gmail.com',
  username: 'alex_vn',
  status: 'active',
  tags: ['default', 'vip'],
  metadata: { plan: 'pro' },
});

// 4. Update tags or metadata
await vntez.telebot.subscribers.update(123456789, {
  tags: ['default', 'vip', 'newsletter'],
});

// 5. Unsubscribe (soft delete)
await vntez.telebot.subscribers.delete(123456789);

// Or permanently delete:
await vntez.telebot.subscribers.delete(123456789, { hard: true });
```

### 2.5 Telegram Authentication Verification

#### Telegram Login Widget
```typescript
const verification = await vntez.telebot.auth.verifyWidget({
  id: 123456789,
  first_name: 'Nam',
  username: 'hnamhocit',
  auth_date: 1730910000,
  hash: 'd41d8cd98f00b204e9800998ecf8427e...',
});

if (verification.valid) {
  console.log('Telegram User Verified:', verification.user);
}
```

#### Telegram Mini App (TMA `initData`)
```typescript
const result = await vntez.telebot.auth.validateInitData(window.Telegram.WebApp.initData);
if (result.valid) {
  console.log('Authenticated MiniApp user:', result.user);
}
```

### 2.6 Webhook Management
```typescript
// Inspect webhook status
const info = await vntez.telebot.webhook.getInfo();

// Set webhook URL
await vntez.telebot.webhook.set('https://my-backend.com/webhook', 'secret-token');

// Delete webhook
await vntez.telebot.webhook.delete();
```

---

## 3. IAM Auth Client (`vntez.auth`)

### 3.1 Sign In with PKCE Redirect
```typescript
// Redirects user to VNTEZ IAM SSO login page
await vntez.auth.signInWithRedirect();
```

### 3.2 Handle OAuth Callback
```typescript
// On /callback page:
const { token, user } = await vntez.auth.handleCallback();
console.log('Logged in as:', user.name, user.email);
console.log('User roles:', user.roles);
console.log('Permissions:', user.permissions);
```

### 3.3 Sign Out
```typescript
// Clears session and terminates IAM SSO
await vntez.auth.signOut({ redirectUrl: window.location.origin });
```

---

## License

MIT © Hoàng Nam (@hnamhocit)
