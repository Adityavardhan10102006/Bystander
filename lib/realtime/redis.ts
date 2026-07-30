import Redis from "ioredis";

const globalForRedis = global as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis || new Redis(process.env.REDIS_URL || "redis://localhost:6379");

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

// Channel used to push tension/nudge updates to the live dashboard.
export const DASHBOARD_CHANNEL = "bystander:dashboard:updates";

export async function publishDashboardUpdate(payload: unknown) {
  await redis.publish(DASHBOARD_CHANNEL, JSON.stringify(payload));
}
