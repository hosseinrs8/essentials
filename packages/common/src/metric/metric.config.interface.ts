import {
  IsBoolean,
  IsDefined,
  IsPort,
  IsString,
  IsUrl,
  ValidateIf,
} from 'class-validator';

export const metricConfigRootKey = 'metrics';

export class MetricConfigInterface {
  @IsDefined()
  @IsBoolean()
  enabled: boolean;

  @ValidateIf((c) => c.metric_enabled)
  @IsString()
  namePrefix: string;

  @ValidateIf((c) => c.metric_enabled)
  @IsString()
  @IsUrl()
  serverHost: string;

  @ValidateIf((c) => c.metric_enabled)
  @IsPort()
  serverPort: number;

  @ValidateIf((c) => c.metric_enabled)
  @IsString()
  serverPath: string;

  @ValidateIf((c) => c.metric_enabled)
  @IsBoolean()
  collectDefaultMetrics: boolean;
}
