export interface PostgresIdentity {
  host: string;
  port: number;
  password?: string;
  username?: string;
  database?: string;
  tls?: {
    enabled: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
}
export interface PostgresIdentityRaw {
  host: string;
  port: number;
  passwordPath?: string;
  username?: string;
  database?: string;
  tls?: {
    enabled: boolean;
    caPath?: string;
    certPath?: string;
    keyPath?: string;
  };
}
