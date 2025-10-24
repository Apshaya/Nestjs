import 'reflect-metadata'; // ADD THIS LINE AT THE TOP
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { TelemetryDto, MetricsDto } from './telemetry.dto';

describe('TelemetryDto Validation', () => {
  it('should pass with valid data', async () => {
    const plain = {
      deviceId: 'dev-001',
      siteId: 'site-A',
      ts: '2025-09-01T10:00:00.000Z',
      metrics: {
        temperature: 25.5,
        humidity: 60,
      },
    };

    const dto = plainToClass(TelemetryDto, plain);
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should fail when deviceId is missing', async () => {
    const plain = {
      siteId: 'site-A',
      ts: '2025-09-01T10:00:00.000Z',
      metrics: { temperature: 25, humidity: 60 },
    };

    const dto = plainToClass(TelemetryDto, plain);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('deviceId');
  });

  it('should fail when timestamp is invalid', async () => {
    const plain = {
      deviceId: 'dev-001',
      siteId: 'site-A',
      ts: 'invalid-date',
      metrics: { temperature: 25, humidity: 60 },
    };

    const dto = plainToClass(TelemetryDto, plain);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when temperature is not a number', async () => {
    const plain = {
      deviceId: 'dev-001',
      siteId: 'site-A',
      ts: '2025-09-01T10:00:00.000Z',
      metrics: { temperature: 'hot', humidity: 60 },
    };

    const dto = plainToClass(TelemetryDto, plain);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when metrics is missing', async () => {
    const plain = {
      deviceId: 'dev-001',
      siteId: 'site-A',
      ts: '2025-09-01T10:00:00.000Z',
    };

    const dto = plainToClass(TelemetryDto, plain);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('metrics');
  });
});