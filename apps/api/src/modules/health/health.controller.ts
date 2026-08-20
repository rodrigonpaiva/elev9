import { Controller, Get, Res } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Response } from 'express';
import type { Connection } from 'mongoose';

type RuntimeTimestamped<T> = T & { timestamp: string };
type ReadinessStatus = 'ready' | 'not_ready';
type DependencyStatus = 'up' | 'down';
type ConfigurationStatus = 'valid' | 'invalid';
type LlmStatus = 'disabled' | 'configured' | 'misconfigured';
type RedisStatus = 'not_required' | 'not_configured';

const DEFAULT_MONGO_TIMEOUT_MS = 1_000;
const MAX_MONGO_TIMEOUT_MS = 5_000;

function resolveMongoTimeout(): number {
  const raw = process.env.HEALTH_MONGO_TIMEOUT_MS?.trim();
  if (!raw) return DEFAULT_MONGO_TIMEOUT_MS;

  const value = Number(raw);
  if (
    !/^\d+$/.test(raw) ||
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > MAX_MONGO_TIMEOUT_MS
  ) {
    return DEFAULT_MONGO_TIMEOUT_MS;
  }

  return value;
}

function isConfigured(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function isLlmConfigured(): boolean {
  if (process.env.AI_LLM_ENABLED?.trim().toLowerCase() !== 'true') {
    return true;
  }

  return isConfigured(process.env.OPENAI_API_KEY);
}

function isRedisConfigurationSafe(): boolean {
  return process.env.RATE_LIMIT_STORE?.trim().toLowerCase() !== 'redis';
}

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  getHealth(): RuntimeTimestamped<{ status: 'ok'; service: 'api' }> {
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async getReadiness(@Res({ passthrough: true }) response: Response): Promise<
    RuntimeTimestamped<{
      status: ReadinessStatus;
      service: 'api';
      checks: {
        mongo: DependencyStatus;
        configuration: ConfigurationStatus;
        llm: LlmStatus;
        redis: RedisStatus;
      };
    }>
  > {
    const mongoUp = await this.isMongoUp();
    const configurationValid = isLlmConfigured();
    const redisConfigured = isRedisConfigurationSafe();
    const ready = mongoUp && configurationValid && redisConfigured;

    response.status(ready ? 200 : 503);

    if (!ready) {
      return {
        status: 'not_ready',
        service: 'api',
        checks: {
          mongo: mongoUp ? 'up' : 'down',
          configuration: configurationValid ? 'valid' : 'invalid',
          llm: this.getLlmStatus(),
          redis: redisConfigured ? 'not_required' : 'not_configured',
        },
        timestamp: new Date().toISOString(),
      };
    }

    return {
      status: 'ready',
      service: 'api',
      checks: {
        mongo: 'up',
        configuration: 'valid',
        llm: this.getLlmStatus(),
        redis: 'not_required',
      },
      timestamp: new Date().toISOString(),
    };
  }

  private getLlmStatus(): LlmStatus {
    if (process.env.AI_LLM_ENABLED?.trim().toLowerCase() !== 'true') {
      return 'disabled';
    }

    return isLlmConfigured() ? 'configured' : 'misconfigured';
  }

  private async isMongoUp(): Promise<boolean> {
    if (this.connection.readyState !== 1 || !this.connection.db) {
      return false;
    }

    const timeoutMs = resolveMongoTimeout();
    let timeoutHandle: NodeJS.Timeout | undefined;

    try {
      await Promise.race([
        this.connection.db.admin().ping(),
        new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(
            () => reject(new Error('health dependency timeout')),
            timeoutMs,
          );
          timeoutHandle.unref?.();
        }),
      ]);
      return true;
    } catch {
      // The response intentionally exposes only availability, never connection
      // strings, provider errors or authentication details.
      return false;
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }
}
