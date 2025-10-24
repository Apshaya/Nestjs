import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import Redis from 'ioredis';
import { Telemetry, TelemetryDocument } from './schemas/telemetry.schema';
import { TelemetryDto } from './dto/telemetry.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  private redis: Redis;
  private alertWebhookUrl: string;
  private alertCache: Map<string, number> = new Map(); // For 60s dedup

  constructor(
    @InjectModel(Telemetry.name) private telemetryModel: Model<TelemetryDocument>,
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    const redisUrl = this.configService.get<string>('redisUrl');
    this.redis = new Redis(redisUrl, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
    });
    this.alertWebhookUrl = this.configService.get<string>('alertWebhookUrl');

    this.redis.on('error', (err) => this.logger.error('Redis error:', err));
    this.redis.on('connect', () => this.logger.log('Redis connected'));
  }

  async ingestTelemetry(data: TelemetryDto | TelemetryDto[]): Promise<void> {
    const readings = Array.isArray(data) ? data : [data];

    try {
      // Persist to MongoDB
      const documents = readings.map((r) => ({
        deviceId: r.deviceId,
        siteId: r.siteId,
        ts: new Date(r.ts),
        metrics: r.metrics,
      }));
      await this.telemetryModel.insertMany(documents);
      this.logger.log(`Ingested ${readings.length} telemetry readings`);

      // Update cache and check alerts
      for (const reading of readings) {
        await this.updateCache(reading);
        await this.checkAlerts(reading);
      }
    } catch (error) {
      this.logger.error('Ingest error:', error.message);
      throw error;
    }
  }

  private async updateCache(data: TelemetryDto): Promise<void> {
    try {
      const key = `latest:${data.deviceId}`;
      await this.redis.set(key, JSON.stringify(data), 'EX', 86400); // 24h expiry
      this.logger.debug(`Cache updated for device ${data.deviceId}`);
    } catch (error) {
      this.logger.error(`Cache update failed: ${error.message}`);
    }
  }

  private async checkAlerts(data: TelemetryDto): Promise<void> {
    const { deviceId, siteId, ts, metrics } = data;
    const alerts: { reason: string; value: number }[] = [];

    if (metrics.temperature > 50) {
      alerts.push({ reason: 'HIGH_TEMPERATURE', value: metrics.temperature });
    }
    if (metrics.humidity > 90) {
      alerts.push({ reason: 'HIGH_HUMIDITY', value: metrics.humidity });
    }

    for (const alert of alerts) {
      const dedupKey = `${deviceId}-${alert.reason}`;
      const lastAlert = this.alertCache.get(dedupKey);
      const now = Date.now();

      // 60s deduplication
      if (lastAlert && now - lastAlert < 60000) {
        this.logger.debug(`Alert deduped: ${dedupKey}`);
        continue;
      }

      this.alertCache.set(dedupKey, now);
      await this.sendAlert({ deviceId, siteId, ts, ...alert });
    }
  }

  private async sendAlert(payload: {
    deviceId: string;
    siteId: string;
    ts: string;
    reason: string;
    value: number;
  }): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(this.alertWebhookUrl, payload, {
          timeout: 5000,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      this.logger.warn(`Alert sent: ${payload.reason} for ${payload.deviceId}`);
    } catch (error) {
      this.logger.error(`Alert webhook failed: ${error.message}`);
    }
  }

  async getLatest(deviceId: string): Promise<TelemetryDto | null> {
    try {
      // Try Redis first
      const cached = await this.redis.get(`latest:${deviceId}`);
      if (cached) {
        this.logger.debug(`Cache HIT for device ${deviceId}`);
        return JSON.parse(cached);
      }

      // Fallback to MongoDB
      this.logger.debug(`Cache MISS for device ${deviceId}, querying Mongo`);
      const doc = await this.telemetryModel
        .findOne({ deviceId })
        .sort({ ts: -1 })
        .lean()
        .exec();

      if (!doc) return null;

      const result: TelemetryDto = {
        deviceId: doc.deviceId,
        siteId: doc.siteId,
        ts: doc.ts.toISOString(),
        metrics: doc.metrics,
      };

      // Update cache for next time
      await this.updateCache(result);
      return result;
    } catch (error) {
      this.logger.error(`Get latest error: ${error.message}`);
      throw error;
    }
  }

  async getSiteSummary(
    siteId: string,
    from: string,
    to: string,
  ): Promise<{
    count: number;
    avgTemperature: number;
    maxTemperature: number;
    avgHumidity: number;
    maxHumidity: number;
    uniqueDevices: number;
  }> {
    try {
      const result = await this.telemetryModel.aggregate([
        {
          $match: {
            siteId,
            ts: {
              $gte: new Date(from),
              $lte: new Date(to),
            },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            avgTemperature: { $avg: '$metrics.temperature' },
            maxTemperature: { $max: '$metrics.temperature' },
            avgHumidity: { $avg: '$metrics.humidity' },
            maxHumidity: { $max: '$metrics.humidity' },
            devices: { $addToSet: '$deviceId' },
          },
        },
        {
          $project: {
            _id: 0,
            count: 1,
            avgTemperature: { $round: ['$avgTemperature', 2] },
            maxTemperature: 1,
            avgHumidity: { $round: ['$avgHumidity', 2] },
            maxHumidity: 1,
            uniqueDevices: { $size: '$devices' },
          },
        },
      ]);

      return result[0] || {
        count: 0,
        avgTemperature: 0,
        maxTemperature: 0,
        avgHumidity: 0,
        maxHumidity: 0,
        uniqueDevices: 0,
      };
    } catch (error) {
      this.logger.error(`Site summary error: ${error.message}`);
      throw error;
    }
  }

  async checkHealth(): Promise<{ mongo: boolean; redis: boolean }> {
    const health = { mongo: false, redis: false };

    try {
      await this.telemetryModel.db.db.admin().ping();
      health.mongo = true;
    } catch (error) {
      this.logger.error('MongoDB health check failed:', error.message);
    }

    try {
      await this.redis.ping();
      health.redis = true;
    } catch (error) {
      this.logger.error('Redis health check failed:', error.message);
    }

    return health;
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}