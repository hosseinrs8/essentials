export interface RedisIdentity {
  url: string;
  password?: string;
  username?: string;
  database?: number;
  tls?: {
    enabled: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
}

export interface RedisIdentityRaw {
  url: string;
  passwordPath?: string;
  username?: string;
  database?: number;
  tls?: {
    enabled: boolean;
    caPath?: string;
    certPath?: string;
    keyPath?: string;
  };
}
