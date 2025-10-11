import { pubClient } from "./cache/redis";
export async function checkHealth() {
  try {
    await Promise.race([
      pubClient.ping(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis ping timeout")), 5000)
      )
    ]);
    return { ok: true, redis: "connected" };
  } catch (error) {
    return { ok: false, redis: "disconnected", error: (error as Error).message };
  }

