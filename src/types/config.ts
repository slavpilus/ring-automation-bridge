// Configuration type definitions

export interface RingConfig {
  refreshToken: string;
  locationIds: string[] | undefined;
  cameraStatusPollingSeconds: number;
  locationModePollingSeconds: number;
}

export interface WebhookConfig {
  url: string;
  authHeader: string | undefined;
}

export interface AppConfig {
  debug: boolean;
  pollingInterval: number;
  excludedEvents: string[];
  ring: RingConfig;
  webhook: WebhookConfig;
}
