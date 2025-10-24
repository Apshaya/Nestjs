import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { TelemetryService } from './telemetry.service';
import { Telemetry } from './schemas/telemetry.schema';
import { of } from 'rxjs';

describe('TelemetryService', () => {
  let service: TelemetryService;
  let mockModel: any;
  let mockHttpService: any;
  let mockRedis: any;

  beforeEach(async () => {
    mockRedis = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      ping: jest.fn().mockResolvedValue('PONG'),
      quit: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    };

    mockModel = {
      insertMany: jest.fn().mockResolvedValue([{}]),
      findOne: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
      aggregate: jest.fn().mockResolvedValue([
        {
          count: 2,
          avgTemperature: 45.5,
          maxTemperature: 51,
          avgHumidity: 60,
          maxHumidity: 95,
          uniqueDevices: 2,
        },
      ]),
      db: {
        db: {
          admin: jest.fn().mockReturnValue({
            ping: jest.fn().mockResolvedValue(true),
          }),
        },
      },
    };

    mockHttpService = {
      post: jest.fn().mockReturnValue(of({ status: 200, data: {} })),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          redisUrl: 'redis://localhost:6379',
          alertWebhookUrl: 'https://webhook.site/test',
        };
        return config[key];
      }),
    };

    // Mock Redis constructor
    jest.mock('ioredis', () => {
      return jest.fn().mockImplementation(() => mockRedis);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryService,
        {
          provide: getModelToken(Telemetry.name),
          useValue: mockModel,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<TelemetryService>(TelemetryService);
    // Replace redis with mock
    (service as any).redis = mockRedis;
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Ensure Redis connection is closed
    await (service as any).redis.quit();
  });

  describe('ingestTelemetry', () => {
    it('should persist telemetry to MongoDB', async () => {
      const data = {
        deviceId: 'dev-001',
        siteId: 'site-A',
        ts: '2025-09-01T10:00:00.000Z',
        metrics: { temperature: 25, humidity: 60 },
      };

      await service.ingestTelemetry(data);

      expect(mockModel.insertMany).toHaveBeenCalledWith([
        expect.objectContaining({
          deviceId: 'dev-001',
          siteId: 'site-A',
          metrics: { temperature: 25, humidity: 60 },
        }),
      ]);
    });

    it('should update Redis cache', async () => {
      const data = {
        deviceId: 'dev-001',
        siteId: 'site-A',
        ts: '2025-09-01T10:00:00.000Z',
        metrics: { temperature: 25, humidity: 60 },
      };

      await service.ingestTelemetry(data);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'latest:dev-001',
        JSON.stringify(data),
        'EX',
        86400,
      );
    });

    it('should send alert when temperature > 50', async () => {
      const data = {
        deviceId: 'dev-002',
        siteId: 'site-B',
        ts: '2025-09-01T10:00:00.000Z',
        metrics: { temperature: 51.2, humidity: 60 },
      };

      await service.ingestTelemetry(data);

      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for async alert

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://webhook.site/test',
        expect.objectContaining({
          deviceId: 'dev-002',
          reason: 'HIGH_TEMPERATURE',
          value: 51.2,
        }),
        expect.any(Object),
      );
    });

    it('should send alert when humidity > 90', async () => {
      const data = {
        deviceId: 'dev-003',
        siteId: 'site-C',
        ts: '2025-09-01T10:00:00.000Z',
        metrics: { temperature: 25, humidity: 95 },
      };

      await service.ingestTelemetry(data);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://webhook.site/test',
        expect.objectContaining({
          deviceId: 'dev-003',
          reason: 'HIGH_HUMIDITY',
          value: 95,
        }),
        expect.any(Object),
      );
    });

    it('should handle array of readings', async () => {
      const data = [
        {
          deviceId: 'dev-001',
          siteId: 'site-A',
          ts: '2025-09-01T10:00:00.000Z',
          metrics: { temperature: 25, humidity: 60 },
        },
        {
          deviceId: 'dev-002',
          siteId: 'site-A',
          ts: '2025-09-01T10:05:00.000Z',
          metrics: { temperature: 30, humidity: 65 },
        },
      ];

      await service.ingestTelemetry(data);

      expect(mockModel.insertMany).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ deviceId: 'dev-001' }),
        expect.objectContaining({ deviceId: 'dev-002' }),
      ]));
    });
  });

  describe('getLatest', () => {
    it('should return from cache if available', async () => {
      const cachedData = {
        deviceId: 'dev-001',
        siteId: 'site-A',
        ts: '2025-09-01T10:00:00.000Z',
        metrics: { temperature: 25, humidity: 60 },
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedData));

      const result = await service.getLatest('dev-001');

      expect(mockRedis.get).toHaveBeenCalledWith('latest:dev-001');
      expect(result).toEqual(cachedData);
      expect(mockModel.findOne).not.toHaveBeenCalled();
    });

    it('should fallback to MongoDB if cache miss', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockModel.exec.mockResolvedValueOnce({
        deviceId: 'dev-001',
        siteId: 'site-A',
        ts: new Date('2025-09-01T10:00:00.000Z'),
        metrics: { temperature: 25, humidity: 60 },
      });

      const result = await service.getLatest('dev-001');

      expect(mockModel.findOne).toHaveBeenCalledWith({ deviceId: 'dev-001' });
      expect(result).toMatchObject({
        deviceId: 'dev-001',
        metrics: { temperature: 25, humidity: 60 },
      });
    });

    it('should return null if device not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockModel.exec.mockResolvedValueOnce(null);

      const result = await service.getLatest('unknown-device');

      expect(result).toBeNull();
    });
  });

  describe('getSiteSummary', () => {
    it('should return aggregated summary', async () => {
      const result = await service.getSiteSummary(
        'site-A',
        '2025-09-01T00:00:00.000Z',
        '2025-09-02T00:00:00.000Z',
      );

      expect(result).toEqual({
        count: 2,
        avgTemperature: 45.5,
        maxTemperature: 51,
        avgHumidity: 60,
        maxHumidity: 95,
        uniqueDevices: 2,
      });

      expect(mockModel.aggregate).toHaveBeenCalled();
    });
  });

  describe('checkHealth', () => {
    it('should return healthy status', async () => {
      const health = await service.checkHealth();

      expect(health).toEqual({ mongo: true, redis: true });
    });
  });
});