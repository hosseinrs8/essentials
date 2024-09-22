export interface NatsIdentity {
  urls: Array<string>;
  username?: string;
  password?: string;
  token?: string;
  tls?: {
    enabled: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
  noEcho: boolean;
}

export interface NatsRawIdentity {
  urls: Array<string>;
  username?: string;
  passwordPath?: string;
  tokenPath?: string;
  tls?: {
    enabled: boolean;
    caPath?: string;
    certPath?: string;
    keyPath?: string;
  };
  echo?: boolean;
}
