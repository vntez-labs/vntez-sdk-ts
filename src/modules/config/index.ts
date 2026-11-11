import type { RemoteConfigResponse } from '../../types';

export class ConfigModule {
  private readonly appId: string;
  private readonly iamUrl: string;

  constructor(config: { appId: string; iamUrl?: string }) {
    this.appId = config.appId;
    this.iamUrl = config.iamUrl || 'https://vntez-iam.vercel.app';
  }

  async get<T = Record<string, unknown>>(): Promise<RemoteConfigResponse<T>> {
    const response = await fetch(`${this.iamUrl}/api/v1/apps/${this.appId}/config`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get config: ${response.status} ${errorText}`);
    }

    return response.json();
  }
}