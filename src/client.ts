import { AuthModule } from './modules/auth';
import { R2Module } from './modules/r2';
import { TeleBotModule } from './modules/telebot';
import type { VntezClientConfig } from './types';

export class VntezClient {
  public readonly auth: AuthModule;
  public readonly r2: R2Module;
  public readonly telebot: TeleBotModule;

  constructor(public readonly config: VntezClientConfig = {}) {
    this.auth = new AuthModule(config);
    this.r2 = new R2Module({
      baseUrl: config.r2Url,
      apiKey: config.r2ApiKey,
    });
    this.telebot = new TeleBotModule({
      baseUrl: config.telebotUrl,
      apiKey: config.telebotApiKey,
    });
  }
}

export const createClient = (config: VntezClientConfig = {}) => new VntezClient(config);
