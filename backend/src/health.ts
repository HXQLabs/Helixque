import { pubClient } from "./cache/redis";

export interface HealthResult {
  ok: boolean;
  status: number;
  details: {
    redis: {
      status: "connected" | "disconnected";
      error?: string;
    };
  };
}

export async function checkHealth(): Promise<HealthResult> {
  try {
    // Set a timeout for the ping command
    const result = await Promise.race([
      pubClient.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000)),
    ]);

    if (result !== "PONG") {
      // Redis responded with something unexpected. This is a "Bad Gateway" scenario.
      return {
        ok: false,
        status: 502,
        details: {
          redis: {
            status: "disconnected",
            error: `Invalid response from Redis: ${result}`,
          },
        },
      };
    }

    return {
      ok: true,
      status: 200,
      details: { redis: { status: "connected" } },
    };
  } catch (error) {
    const err = error as Error;
    // Default to 503 Service Unavailable
    let statusCode = 503;
    if (err.message === "timeout") {
      // Use 504 Gateway Timeout for timeouts
      statusCode = 504;
    }

    return {
      ok: false,
      status: statusCode,
      details: {
        redis: {
          status: "disconnected",
          error: err.message,
        },
      },
    };
  }
}
