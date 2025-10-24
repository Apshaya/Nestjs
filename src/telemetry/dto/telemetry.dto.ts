import { IsString, IsNotEmpty, IsDateString, ValidateNested, IsNumber, IsArray, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class MetricsDto {
  @IsNumber()
  @IsNotEmpty()
  temperature: number;

  @IsNumber()
  @IsNotEmpty()
  humidity: number;
}

export class TelemetryDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsString()
  @IsNotEmpty()
  siteId: string;

  @IsDateString()
  @IsNotEmpty()
  ts: string;

  @ValidateNested()
  @Type(() => MetricsDto)
  @IsNotEmpty()
  metrics: MetricsDto;
}

export class TelemetryArrayDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TelemetryDto)
  data: TelemetryDto[];
}