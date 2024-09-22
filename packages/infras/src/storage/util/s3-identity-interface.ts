export interface S3Identity {
  endpoint?: string;
  region?: string;
  accessKeyIdPath: string;
  secretAccessKeyPath: string;
  bucket?: string;
}
