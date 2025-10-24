# Nestjs

IoT Telemetry Ingestor - NestJS
IoT telemetry ingestion service built with NestJS, MongoDB, and Redis(In Docker).

Features
Telemetry Ingestion - Accept single or batch JSON readings via REST API
MongoDB Persistence - Store all telemetry data
Redis Caching - Cache latest reading per device for fast retrieval
Real-time Alerts - Webhook notifications when thresholds exceeded
Security - Bearer token authentication, DTO validation, payload limits
Health Checks - Monitor MongoDB and Redis connectivity
Prerequisites
Node.js 18+
MongoDB Atlas a
Redis (Docker)
Webhook.site URL for testing alerts
Setup Instructions
1. Install
npx @nestjs/cli new telemetry-ingestor --package-manager npm
cd telemetry-ingestor

# Install dependencies
npm install
2. Configure Environment
.env

# MongoDB Connection
MONGO_URI=mongodb+srv://newone:HiJ6nLPRdTdCuw2S@newone.5ht1c.mongodb.net/telemetry?retryWrites=true&w=majority


# Redis Connection
REDIS_URL=redis://localhost:6379


# Alert Webhook
ALERT_WEBHOOK_URL=https://webhook.site/f6e46ca2-ccde-4376-97b8-dfad29b70ef0


# Authentication Token
INGEST_TOKEN=secret123


# Server Port
PORT=3000

MongoDB Atlas Setup
Create Account at  mongodb.com/cloud/atlas
Add database user
Get connection string from "Connect" 
MONGO_URI=mongodb+srv://newone:HiJ6nLPRdTdCuw2S@newone.5ht1c.mongodb.net/telemetry?retryWrites=true&w=majority



Redis Setup
Docker 
docker run -d -p 6379:6379 redis:alpine
Webhook Setup
Copy your unique URL From webhook.site
Keep the tab open to see incoming alerts ( All alert can see with exceed limit)
Running the Application
Development
npm run start:dev
API Endpoints

Manual Testing (With Postman)

1. Ingest Telemetry

curl --location 'http://localhost:3000/api/v1/telemetry' \
--header 'Authorization: Bearer secret123' \
--header 'Content-Type: application/json' \
--data '{
    "deviceId": "dev-002",
    "siteId": "site-A",
    "ts": "2025-09-01T10:00:30.000Z",
    "metrics": {
      "temperature": 51.2,
      "humidity": 55
    }
  }'


curl --location 'http://localhost:3000/api/v1/telemetry' \
--header 'Authorization: Bearer secret123' \
--header 'Content-Type: application/json' \
--data '[
    {"deviceId":"dev-001","siteId":"site-A","ts":"2025-09-01T10:00:00Z","metrics":{"temperature":25,"humidity":60}},
    {"deviceId":"dev-002","siteId":"site-A","ts":"2025-09-01T10:05:00Z","metrics":{"temperature":30,"humidity":65}}
  ]'

2.Get Latest Reading

curl --location --request GET 'http://localhost:3000/api/v1/devices/dev-002/latest' \
--header 'Authorization: Bearer secret123' \
--header 'Content-Type: application/json' \
--data '[
    {"deviceId":"dev-001","siteId":"site-A","ts":"2025-09-01T10:00:00Z","metrics":{"temperature":25,"humidity":60}},
    {"deviceId":"dev-002","siteId":"site-A","ts":"2025-09-01T10:05:00Z","metrics":{"temperature":30,"humidity":65}}
  ]'

3.Site Summary

curl --location --request GET 'http://localhost:3000/api/v1/sites/site-A/summary?from=2025-09-01T00%3A00%3A00.000Z&to=2025-09-02T00%3A00%3A00.000Z' \
--header 'Authorization: Bearer secret123' \
--header 'Content-Type: application/json' \
--data '[
    {"deviceId":"dev-001","siteId":"site-A","ts":"2025-09-01T10:00:00Z","metrics":{"temperature":25,"humidity":60}},
    {"deviceId":"dev-002","siteId":"site-A","ts":"2025-09-01T10:05:00Z","metrics":{"temperature":30,"humidity":65}}
  ]'

4.Health Check

curl --location --request GET 'http://localhost:3000/api/v1/health' \
--header 'Authorization: Bearer secret123' \
--header 'Content-Type: application/json' \
--data '[
    {"deviceId":"dev-001","siteId":"site-A","ts":"2025-09-01T10:00:00Z","metrics":{"temperature":25,"humidity":60}},
    {"deviceId":"dev-002","siteId":"site-A","ts":"2025-09-01T10:05:00Z","metrics":{"temperature":30,"humidity":65}}
  ]'

5.Trigger HIGH_TEMPERATURE alert (Can look with webhook)

curl --location 'http://localhost:3000/api/v1/telemetry' \
--header 'Authorization: Bearer secret123' \
--header 'Content-Type: application/json' \
--data '{"deviceId":"dev-003","siteId":"site-A","ts":"2025-09-01T10:00:00Z","metrics":{"temperature":55,"humidity":60}}
'
Alert Rules
Alerts are sent to ALERT_WEBHOOK_URL when
Temperature > 50°C → HIGH_TEMPERATURE alert
Humidity > 90% → HIGH_HUMIDITY alert
Testing
Run All Tests
# Unit tests
npm run test



# E2E tests (requires MongoDB & Redis running)
npm run test:e2e



# Test coverage
npm run test:cov


Here's how AI was used

AI help me to create NestJS project structure with MongoDB/Redis integration.
AI help to implemented the telemetry ingestion service, Redis caching, alert system with webhook notifications, and MongoDB aggregation for analytics more speed.
AI created tests and E2E tests covering all endpoints and validation scenarios. With that i was tesed.
When E2E tests failed ( errors, test data ), AI diagnosed issues and provided fixes for error handling and test isolation.(help to bug fixing)
AI help to get idea about authentication process.
Webhook.site Verification
My Webhook URL
https://webhook.site/f6e46ca2-ccde-4376-97b8-dfad29b70ef0


When testing alerts,
curl --location 'http://localhost:3000/api/v1/telemetry' \
--header 'Authorization: Bearer secret123' \
--header 'Content-Type: application/json' \
--data '{"deviceId":"dev-003","siteId":"site-A","ts":"2025-09-01T10:00:00Z","metrics":{"temperature":55,"humidity":60}}
'


All code has been reviewed, tested, and validated by me. fully responsible for correctness, security, and functionality.
