// Core Client
export { VntezClient, createClient } from './client';

// Modules
export { AuthModule } from './modules/auth';
export { R2Module, createR2Client, R2Module as R2Client } from './modules/r2';
export {
  TeleBotModule,
  createTeleBotClient,
  TeleBotModule as TeleBotClient,
  TeleBotSubscribersClient,
  TeleBotAuthClient,
  TeleBotWebhookClient,
} from './modules/telebot';

// Error handling
export { VntezError } from './http';

// Types
export * from './types';
