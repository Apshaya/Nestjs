// import { Test, TestingModule } from '@nestjs/testing';
// import { INestApplication, ValidationPipe, BadRequestException } from '@nestjs/common';
// import * as request from 'supertest';
// import { AppModule } from './../src/app.module';

// describe('Telemetry E2E Tests', () => {
//   let app: INestApplication;
//   const timestamp = Date.now();
//   const deviceId = `test-dev-${timestamp}`;
//   const siteId = `test-site-${timestamp}`;

//   beforeAll(async () => {
//     const moduleFixture: TestingModule = await Test.createTestingModule({
//       imports: [AppModule],
//     }).compile();

//     app = moduleFixture.createNestApplication();
    
//     app.useGlobalPipes(
//       new ValidationPipe({
//         whitelist: true,
//         forbidNonWhitelisted: true,
//         transform: true,
//       }),
//     );

//     await app.init();
//   });

//   afterAll(async () => {
//     await app.close();
//   });

//   describe('POST /api/v1/telemetry', () => {
//     it('should ingest valid telemetry data', async () => {
//       const payload = {
//         deviceId,
//         siteId,
//         ts: '2025-09-01T10:00:00.000Z',
//         metrics: {
//           temperature: 25.5,
//           humidity: 60,
//         },
//       };

//       const response = await request(app.getHttpServer())
//         .post('/api/v1/telemetry')
//         .set('Authorization', 'Bearer secret123')
//         .send(payload)
//         .expect(201);

//       expect(response.body).toMatchObject({
//         message: 'Telemetry ingested',
//         count: 1,
//       });
//     });

//     it('should ingest array of telemetry data', async () => {
//       const payload = [
//         {
//           deviceId: `${deviceId}-1`,
//           siteId,
//           ts: '2025-09-01T10:00:00.000Z',
//           metrics: { temperature: 20, humidity: 50 },
//         },
//         {
//           deviceId: `${deviceId}-2`,
//           siteId,
//           ts: '2025-09-01T10:05:00.000Z',
//           metrics: { temperature: 30, humidity: 70 },
//         },
//       ];

//       const response = await request(app.getHttpServer())
//         .post('/api/v1/telemetry')
//         .set('Authorization', 'Bearer secret123')
//         .send(payload)
//         .expect(201);

//       expect(response.body).toMatchObject({
//         message: 'Telemetry ingested',
//         count: 2,
//       });
//     });

//     it('should reject invalid data (missing fields)', async () => {
//       const payload = {
//         deviceId,
//         // missing siteId, ts, metrics
//       };

//       await request(app.getHttpServer())
//         .post('/api/v1/telemetry')
//         .set('Authorization', 'Bearer secret123')
//         .send(payload)
//         .expect(400);
//     });

//     it('should reject invalid metrics', async () => {
//       const payload = {
//         deviceId,
//         siteId,
//         ts: '2025-09-01T10:00:00.000Z',
//         metrics: {
//           temperature: 'invalid', // should be number
//           humidity: 60,
//         },
//       };

//       await request(app.getHttpServer())
//         .post('/api/v1/telemetry')
//         .set('Authorization', 'Bearer secret123')
//         .send(payload)
//         .expect(400);
//     });

//     it('should reject request without auth token', async () => {
//       const payload = {
//         deviceId,
//         siteId,
//         ts: '2025-09-01T10:00:00.000Z',
//         metrics: { temperature: 25, humidity: 60 },
//       };

//       await request(app.getHttpServer())
//         .post('/api/v1/telemetry')
//         .send(payload)
//         .expect(401);
//     });

//     it('should trigger HIGH_TEMPERATURE alert', async () => {
//       const payload = {
//         deviceId: `${deviceId}-hot`,
//         siteId,
//         ts: '2025-09-01T10:00:00.000Z',
//         metrics: {
//           temperature: 55, // > 50
//           humidity: 60,
//         },
//       };

//       await request(app.getHttpServer())
//         .post('/api/v1/telemetry')
//         .set('Authorization', 'Bearer secret123')
//         .send(payload)
//         .expect(201);

//       // Alert should be sent (check webhook.site manually or mock)
//     });

//     it('should trigger HIGH_HUMIDITY alert', async () => {
//       const payload = {
//         deviceId: `${deviceId}-humid`,
//         siteId,
//         ts: '2025-09-01T10:00:00.000Z',
//         metrics: {
//           temperature: 25,
//           humidity: 95, // > 90
//         },
//       };

//       await request(app.getHttpServer())
//         .post('/api/v1/telemetry')
//         .set('Authorization', 'Bearer secret123')
//         .send(payload)
//         .expect(201);
//     });
//   });

//   describe('GET /api/v1/devices/:deviceId/latest', () => {
//     it('should return latest telemetry for device', async () => {
//       // First, ingest some data
//       await request(app.getHttpServer())
//         .post('/api/v1/telemetry')
//         .set('Authorization', 'Bearer secret123')
//         .send({
//           deviceId,
//           siteId,
//           ts: '2025-09-01T12:00:00.000Z',
//           metrics: { temperature: 28, humidity: 65 },
//         })
//         .expect(201);

//       // Wait a bit for cache update
//       await new Promise((resolve) => setTimeout(resolve, 500));

//       // Now fetch latest
//       const response = await request(app.getHttpServer())
//         .get(`/api/v1/devices/${deviceId}/latest`)
//         .set('Authorization', 'Bearer secret123')
//         .expect(200);

//       expect(response.body).toMatchObject({
//         deviceId,
//         siteId,
//         metrics: { temperature: 28, humidity: 65 },
//       });
//     });

//     it('should return 400 for non-existent device', async () => {
//       await request(app.getHttpServer())
//         .get('/api/v1/devices/non-existent-device/latest')
//         .set('Authorization', 'Bearer secret123')
//         .expect(400);
//     });
//   });

//   describe('GET /api/v1/sites/:siteId/summary', () => {
//     beforeAll(async () => {
//       // Seed some data for summary
//       const readings = [
//         {
//           deviceId: `${deviceId}-summary-1`,
//           siteId: 'summary-site',
//           ts: '2025-09-01T10:00:00.000Z',
//           metrics: { temperature: 20, humidity: 50 },
//         },
//         {
//           deviceId: `${deviceId}-summary-2`,
//           siteId: 'summary-site',
//           ts: '2025-09-01T11:00:00.000Z',
//           metrics: { temperature: 30, humidity: 60 },
//         },
//         {
//           deviceId: `${deviceId}-summary-1`,
//           siteId: 'summary-site',
//           ts: '2025-09-01T12:00:00.000Z',
//           metrics: { temperature: 40, humidity: 70 },
//         },
//       ];

//       for (const reading of readings) {
//         await request(app.getHttpServer())
//           .post('/api/v1/telemetry')
//           .set('Authorization', 'Bearer secret123')
//           .send(reading);
//       }

//       // Wait for ingestion
//       await new Promise((resolve) => setTimeout(resolve, 1000));
//     });

//     it('should return summary statistics', async () => {
//       const response = await request(app.getHttpServer())
//         .get('/api/v1/sites/summary-site/summary')
//         .query({
//           from: '2025-09-01T00:00:00.000Z',
//           to: '2025-09-01T23:59:59.000Z',
//         })
//         .set('Authorization', 'Bearer secret123')
//         .expect(200);

//       expect(response.body).toMatchObject({
//         count: 3,
//         uniqueDevices: 2,
//       });

//       expect(response.body.avgTemperature).toBeGreaterThan(0);
//       expect(response.body.maxTemperature).toBeGreaterThanOrEqual(40);
//       expect(response.body.avgHumidity).toBeGreaterThan(0);
//       expect(response.body.maxHumidity).toBeGreaterThanOrEqual(70);
//     });

//     it('should return empty summary for no data', async () => {
//       const response = await request(app.getHttpServer())
//         .get('/api/v1/sites/empty-site/summary')
//         .query({
//           from: '2025-01-01T00:00:00.000Z',
//           to: '2025-01-02T00:00:00.000Z',
//         })
//         .set('Authorization', 'Bearer secret123')
//         .expect(200);

//       expect(response.body).toMatchObject({
//         count: 0,
//         avgTemperature: 0,
//         maxTemperature: 0,
//         avgHumidity: 0,
//         maxHumidity: 0,
//         uniqueDevices: 0,
//       });
//     });

//     it('should reject missing query params', async () => {
//       await request(app.getHttpServer())
//         .get('/api/v1/sites/summary-site/summary')
//         .set('Authorization', 'Bearer secret123')
//         .expect(400);
//     });
//   });

//   describe('GET /api/v1/health', () => {
//     it('should return health status', async () => {
//       const response = await request(app.getHttpServer())
//         .get('/api/v1/health')
//         .set('Authorization', 'Bearer secret123')
//         .expect(200);

//       expect(response.body).toHaveProperty('status');
//       expect(response.body).toHaveProperty('checks');
//       expect(response.body.checks).toHaveProperty('mongo');
//       expect(response.body.checks).toHaveProperty('redis');
//     });
//   });
// });


import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Telemetry } from './../src/telemetry/schemas/telemetry.schema';
import { Model } from 'mongoose';

describe('Telemetry E2E Tests', () => {
  let app: INestApplication;
  let telemetryModel: Model<Telemetry>;
  const timestamp = Date.now();
  const deviceId = `test-dev-${timestamp}`;
  const siteId = `test-site-${timestamp}`;
  const summaryTestSiteId = `summary-site-${timestamp}`; // Unique per test run

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    // Get the model for cleanup
    telemetryModel = moduleFixture.get(getModelToken(Telemetry.name));
  });

  afterAll(async () => {
    // Clean up test data
    await telemetryModel.deleteMany({
      $or: [
        { deviceId: { $regex: `^test-dev-${timestamp}` } },
        { siteId: { $regex: `^test-site-${timestamp}` } },
        { siteId: { $regex: `^summary-site-${timestamp}` } },
      ],
    });
    await app.close();
  });

  describe('POST /api/v1/telemetry', () => {
    it('should ingest valid telemetry data', async () => {
      const payload = {
        deviceId,
        siteId,
        ts: '2025-09-01T10:00:00.000Z',
        metrics: {
          temperature: 25.5,
          humidity: 60,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/telemetry')
        .set('Authorization', 'Bearer secret123')
        .send(payload)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Telemetry ingested',
        count: 1,
      });
    });

    it('should ingest array of telemetry data', async () => {
      const payload = [
        {
          deviceId: `${deviceId}-1`,
          siteId,
          ts: '2025-09-01T10:00:00.000Z',
          metrics: { temperature: 20, humidity: 50 },
        },
        {
          deviceId: `${deviceId}-2`,
          siteId,
          ts: '2025-09-01T10:05:00.000Z',
          metrics: { temperature: 30, humidity: 70 },
        },
      ];

      const response = await request(app.getHttpServer())
        .post('/api/v1/telemetry')
        .set('Authorization', 'Bearer secret123')
        .send(payload)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Telemetry ingested',
        count: 2,
      });
    });

    it('should reject invalid data (missing fields)', async () => {
      const payload = {
        deviceId,
        // missing siteId, ts, metrics
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/telemetry')
        .set('Authorization', 'Bearer secret123')
        .send(payload)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should reject invalid metrics', async () => {
      const payload = {
        deviceId,
        siteId,
        ts: '2025-09-01T10:00:00.000Z',
        metrics: {
          temperature: 'invalid', // should be number
          humidity: 60,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/telemetry')
        .set('Authorization', 'Bearer secret123')
        .send(payload)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should reject request without auth token', async () => {
      const payload = {
        deviceId,
        siteId,
        ts: '2025-09-01T10:00:00.000Z',
        metrics: { temperature: 25, humidity: 60 },
      };

      await request(app.getHttpServer())
        .post('/api/v1/telemetry')
        .send(payload)
        .expect(401);
    });

    it('should trigger HIGH_TEMPERATURE alert', async () => {
      const payload = {
        deviceId: `${deviceId}-hot`,
        siteId,
        ts: '2025-09-01T10:00:00.000Z',
        metrics: {
          temperature: 55, // > 50
          humidity: 60,
        },
      };

      await request(app.getHttpServer())
        .post('/api/v1/telemetry')
        .set('Authorization', 'Bearer secret123')
        .send(payload)
        .expect(201);

      // Alert should be sent (check webhook.site manually or mock)
    });

    it('should trigger HIGH_HUMIDITY alert', async () => {
      const payload = {
        deviceId: `${deviceId}-humid`,
        siteId,
        ts: '2025-09-01T10:00:00.000Z',
        metrics: {
          temperature: 25,
          humidity: 95, // > 90
        },
      };

      await request(app.getHttpServer())
        .post('/api/v1/telemetry')
        .set('Authorization', 'Bearer secret123')
        .send(payload)
        .expect(201);
    });
  });

  describe('GET /api/v1/devices/:deviceId/latest', () => {
    it('should return latest telemetry for device', async () => {
      const testDeviceId = `${deviceId}-latest-test`;
      
      // First, ingest some data
      await request(app.getHttpServer())
        .post('/api/v1/telemetry')
        .set('Authorization', 'Bearer secret123')
        .send({
          deviceId: testDeviceId,
          siteId,
          ts: '2025-09-01T12:00:00.000Z',
          metrics: { temperature: 28, humidity: 65 },
        })
        .expect(201);

      // Wait a bit for cache update
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Now fetch latest
      const response = await request(app.getHttpServer())
        .get(`/api/v1/devices/${testDeviceId}/latest`)
        .set('Authorization', 'Bearer secret123')
        .expect(200);

      expect(response.body).toMatchObject({
        deviceId: testDeviceId,
        siteId,
        metrics: { temperature: 28, humidity: 65 },
      });
    });

    it('should return 400 for non-existent device', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/devices/non-existent-device-xyz-123/latest')
        .set('Authorization', 'Bearer secret123')
        .expect(400);
    });
  });

  describe('GET /api/v1/sites/:siteId/summary', () => {
    beforeAll(async () => {
      // Clean up any existing data for summary site
      await telemetryModel.deleteMany({ siteId: summaryTestSiteId });

      // Seed EXACT data for summary
      const readings = [
        {
          deviceId: `${deviceId}-summary-1`,
          siteId: summaryTestSiteId,
          ts: '2025-09-01T10:00:00.000Z',
          metrics: { temperature: 20, humidity: 50 },
        },
        {
          deviceId: `${deviceId}-summary-2`,
          siteId: summaryTestSiteId,
          ts: '2025-09-01T11:00:00.000Z',
          metrics: { temperature: 30, humidity: 60 },
        },
        {
          deviceId: `${deviceId}-summary-1`,
          siteId: summaryTestSiteId,
          ts: '2025-09-01T12:00:00.000Z',
          metrics: { temperature: 40, humidity: 70 },
        },
      ];

      for (const reading of readings) {
        await request(app.getHttpServer())
          .post('/api/v1/telemetry')
          .set('Authorization', 'Bearer secret123')
          .send(reading);
      }

      // Wait for ingestion
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it('should return summary statistics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/sites/${summaryTestSiteId}/summary`)
        .query({
          from: '2025-09-01T00:00:00.000Z',
          to: '2025-09-01T23:59:59.000Z',
        })
        .set('Authorization', 'Bearer secret123')
        .expect(200);

      expect(response.body).toMatchObject({
        count: 3,
        uniqueDevices: 2,
      });

      expect(response.body.avgTemperature).toBeCloseTo(30, 0); // (20+30+40)/3 = 30
      expect(response.body.maxTemperature).toBe(40);
      expect(response.body.avgHumidity).toBeCloseTo(60, 0); // (50+60+70)/3 = 60
      expect(response.body.maxHumidity).toBe(70);
    });

    it('should return empty summary for no data', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/sites/empty-site-xyz-no-data/summary')
        .query({
          from: '2025-01-01T00:00:00.000Z',
          to: '2025-01-02T00:00:00.000Z',
        })
        .set('Authorization', 'Bearer secret123')
        .expect(200);

      expect(response.body).toMatchObject({
        count: 0,
        avgTemperature: 0,
        maxTemperature: 0,
        avgHumidity: 0,
        maxHumidity: 0,
        uniqueDevices: 0,
      });
    });

    it('should reject missing query params', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/sites/${summaryTestSiteId}/summary`)
        .set('Authorization', 'Bearer secret123')
        .expect(400);
    });
  });

  describe('GET /api/v1/health', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('Authorization', 'Bearer secret123')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('checks');
      expect(response.body.checks).toHaveProperty('mongo');
      expect(response.body.checks).toHaveProperty('redis');
    });
  });
});