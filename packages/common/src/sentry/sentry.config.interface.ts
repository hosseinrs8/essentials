import { IsDefined, IsString } from 'class-validator';

export class SentryConfig {
  @IsDefined()
  @IsString()
  dsn: string;
}
