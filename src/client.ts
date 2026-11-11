import { AuthModule } from './modules/auth';
import { ConfigModule } from './modules/config';
import { UploadModule } from './modules/upload';
import type { VntezClientConfig } from './types';

export class VntezClient {
  public readonly auth: AuthModule;
  public readonly config: ConfigModule;
  public readonly upload: UploadModule;

  constructor(config: VntezClientConfig) {
    if (!config.appId) {
      throw new Error('VntezClient requires appId');
    }

    this.auth = new AuthModule({
      appId: config.appId,
      iamUrl: config.iamUrl,
    });

    this.config = new ConfigModule({
      appId: config.appId,
      iamUrl: config.iamUrl,
    });

    this.upload = new UploadModule({
      uploadUrl: config.uploadUrl,
      getAuthToken: () => this.auth.getToken(),
    });
  }
}
