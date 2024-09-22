import { IsBoolean, IsDefined, IsString, ValidateIf } from 'class-validator';

export const loggerConfigRootKey = 'logs';

export class LoggerConfigInterface {
  @IsDefined()
  @IsBoolean()
  enabled: boolean;

  @ValidateIf((c) => c.logEnabled)
  @IsDefined()
  @IsString()
  level?: string;

  @ValidateIf((c) => c.logEnabled)
  @IsDefined()
  @IsBoolean()
  consoleEnabled?: boolean;

  @ValidateIf((c) => c.logConsoleEnabled)
  @IsDefined()
  @IsBoolean()
  consolePrettyEnabled?: boolean;

  @ValidateIf((c) => c.logEnabled)
  @IsDefined()
  @IsBoolean()
  fileEnabled?: boolean;

  @ValidateIf((c) => c.logFileEnabled && c.logEnabled)
  @IsDefined()
  @IsString()
  fileName?: string;

  @ValidateIf((c) => c.logFileEnabled && c.logEnabled)
  @IsDefined()
  @IsString()
  filePath?: string;
}
