export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  mongoUri: process.env.MONGO_URI,
  redisUrl: process.env.REDIS_URL,
  alertWebhookUrl: process.env.ALERT_WEBHOOK_URL,
  ingestToken: process.env.INGEST_TOKEN,
});