export interface HttpServerRawConfig {
  host: string;
  port: number;
  tls?: {
    keyPath?: string;
    certPath?: string;
  };
}
