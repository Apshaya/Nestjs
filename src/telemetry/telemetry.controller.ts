// import {
//   Controller,
//   Post,
//   Get,
//   Body,
//   Param,
//   Query,
//   UseGuards,
//   HttpCode,
//   HttpStatus,
//   BadRequestException,
// } from '@nestjs/common';
// import { TelemetryService } from './telemetry.service';
// import { TelemetryDto } from './dto/telemetry.dto';
// import { AuthGuard } from './guards/auth.guard';

// @Controller('api/v1')
// @UseGuards(AuthGuard)
// export class TelemetryController {
//   constructor(private readonly telemetryService: TelemetryService) {}

//   @Post('telemetry')
//   @HttpCode(HttpStatus.CREATED)
//   async ingestTelemetry(
//     @Body() body: TelemetryDto | TelemetryDto[],
//   ): Promise<{ message: string; count: number }> {
//     const data = Array.isArray(body) ? body : [body];
//     await this.telemetryService.ingestTelemetry(data);
//     return { message: 'Telemetry ingested', count: data.length };
//   }

//   @Get('devices/:deviceId/latest')
//   async getLatest(@Param('deviceId') deviceId: string) {
//     const result = await this.telemetryService.getLatest(deviceId);
//     if (!result) {
//       throw new BadRequestException('No data found for device');
//     }
//     return result;
//   }

//   @Get('sites/:siteId/summary')
//   async getSiteSummary(
//     @Param('siteId') siteId: string,
//     @Query('from') from: string,
//     @Query('to') to: string,
//   ) {
//     if (!from || !to) {
//       throw new BadRequestException('from and to query params required (ISO format)');
//     }
//     return this.telemetryService.getSiteSummary(siteId, from, to);
//   }

//   @Get('health')
//   async health() {
//     const status = await this.telemetryService.checkHealth();
//     return {
//       status: status.mongo && status.redis ? 'healthy' : 'degraded',
//       checks: status,
//     };
//   }
// }


import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { TelemetryDto } from './dto/telemetry.dto';
import { AuthGuard } from './guards/auth.guard';

@Controller('api/v1')
@UseGuards(AuthGuard)
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post('telemetry')
  async ingest(@Body() data: TelemetryDto | TelemetryDto[]) {
    // IMPORTANT: Validate that body is either object or array
    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new BadRequestException('Request body must be a valid telemetry object or array');
    }

    try {
      await this.telemetryService.ingestTelemetry(data);
      const count = Array.isArray(data) ? data.length : 1;
      return { message: 'Telemetry ingested', count };
    } catch (error) {
      // Convert MongoDB validation errors to 400
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get('devices/:deviceId/latest')
  async getLatest(@Param('deviceId') deviceId: string) {
    const result = await this.telemetryService.getLatest(deviceId);
    if (!result) {
      throw new BadRequestException(`No data found for device: ${deviceId}`);
    }
    return result;
  }

  @Get('sites/:siteId/summary')
  async getSummary(
    @Param('siteId') siteId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!from || !to) {
      throw new BadRequestException('Query parameters "from" and "to" are required');
    }
    return this.telemetryService.getSiteSummary(siteId, from, to);
  }

  @Get('health')
  async health() {
    const checks = await this.telemetryService.checkHealth();
    return {
      status: checks.mongo && checks.redis ? 'healthy' : 'degraded',
      checks,
    };
  }
}