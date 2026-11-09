import { AuthModule } from './modules/auth';
import { R2Module } from './modules/r2';
import { TeleBotModule } from './modules/telebot';
import { VntezError } from './http';
import type { VntezClientConfig } from './types';

export class VntezClient {
  public readonly id: string;
  public readonly clientId: string;
  public readonly secret: string;
  public readonly clientSecret: string;

  public readonly auth: AuthModule;
  public readonly r2: R2Module;
  public readonly telebot: TeleBotModule;

  constructor(public readonly config: VntezClientConfig) {
    const rawId = config.clientId || config.id;
    const rawSecret = config.clientSecret || config.secret;

    if (!rawId) {
      throw new VntezError(
        'VntezClient requires a client ID. Provide "id" or "clientId" in config.',
        400,
        'MISSING_CLIENT_ID'
      );
    }

    if (!rawSecret) {
      throw new VntezError(
        'VntezClient requires a client secret. Provide "secret" or "clientSecret" in config.',
        400,
        'MISSING_CLIENT_SECRET'
      );
    }

    this.id = rawId;
    this.clientId = rawId;
    this.secret = rawSecret;
    this.clientSecret = rawSecret;

    // 1. IAM Auth Module
    this.auth = new AuthModule({
      ...config,
      clientId: this.clientId,
      clientSecret: this.clientSecret,
    });

    // 2. R2 / Upload Worker Module (Kế thừa clientSecret làm apiKey mặc định)
    this.r2 = new R2Module({
      baseUrl: config.r2Url,
      apiKey: config.r2ApiKey || this.clientSecret,
    });

    // 3. TeleBot Worker Module (Kế thừa clientSecret làm apiKey mặc định)
    this.telebot = new TeleBotModule({
      baseUrl: config.telebotUrl,
      apiKey: config.telebotApiKey || this.clientSecret,
    });
  }
}

export const createClient = (config: VntezClientConfig) => new VntezClient(config);
