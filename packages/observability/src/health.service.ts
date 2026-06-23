import { Injectable, Logger } from '@nestjs/common';
import { db } from '@easydev/database';
import { sql } from 'drizzle-orm';
import Redis from 'ioredis';
import axios from 'axios';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  async checkDatabase(): Promise<{ status: 'UP' | 'DOWN'; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      await db.execute(sql`SELECT 1`);
      return { status: 'UP', latencyMs: Date.now() - start };
    } catch (e: any) {
      this.logger.error(`Database health check failed: ${e.message}`);
      return { status: 'DOWN', error: e.message };
    }
  }

  async checkRedis(): Promise<{ status: 'UP' | 'DOWN'; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6380', 10),
        maxRetriesPerRequest: 1,
      });
      const response = await redis.ping();
      redis.disconnect();
      
      if (response === 'PONG') {
        return { status: 'UP', latencyMs: Date.now() - start };
      }
      return { status: 'DOWN', error: 'Invalid Ping Response' };
    } catch (e: any) {
      this.logger.error(`Redis health check failed: ${e.message}`);
      return { status: 'DOWN', error: e.message };
    }
  }

  async checkBullMQ(): Promise<{ status: 'UP' | 'DOWN'; error?: string }> {
    try {
      // In a real NestJS setup with @nestjs/bullmq, we check if Redis is active
      const redisCheck = await this.checkRedis();
      return { status: redisCheck.status, error: redisCheck.error };
    } catch (e: any) {
      return { status: 'DOWN', error: e.message };
    }
  }

  async checkAiPlatform(): Promise<{ status: 'UP' | 'DOWN'; latencyMs?: number; error?: string }> {
    const start = Date.now();
    const baseUrl = process.env.EASYDEV_AI_URL || 'https://api.easydev.ai';
    try {
      // /health/live is the AI platform's own cheap liveness probe (no DB/
      // Redis checks on its side) - hitting its deep /health would couple
      // this service's readiness to that platform's downstream dependencies.
      await axios.get(`${baseUrl}/health/live`, { timeout: 3000 });
      return { status: 'UP', latencyMs: Date.now() - start };
    } catch (e: any) {
      this.logger.error(`AI platform health check failed: ${e.message}`);
      return { status: 'DOWN', error: e.message };
    }
  }

  async checkStorage(): Promise<{ status: 'UP' | 'DOWN'; freeSpaceGb?: number; error?: string }> {
    // The only storage this app directly depends on today is the local
    // `uploads/` directory (widget attachments, served via
    // useStaticAssets in main.ts) - verify it's actually writable rather
    // than reporting a hardcoded fake value.
    const uploadsDir = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');
    const probeFile = join(uploadsDir, `.health-check-${process.pid}`);
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.writeFile(probeFile, 'ok');
      await fs.unlink(probeFile);

      let freeSpaceGb: number | undefined;
      try {
        const stats = await fs.statfs(uploadsDir);
        freeSpaceGb =
          Math.round(((stats.bfree * stats.bsize) / 1024 / 1024 / 1024) * 100) /
          100;
      } catch {
        // statfs isn't available on every platform - omit rather than fake it.
      }

      return { status: 'UP', freeSpaceGb };
    } catch (e: any) {
      this.logger.error(`Storage health check failed: ${e.message}`);
      return { status: 'DOWN', error: e.message };
    }
  }

  async runFullLivenessCheck(): Promise<{
    status: 'UP' | 'DOWN';
    components: Record<string, any>;
  }> {
    const dbRes = await this.checkDatabase();
    const redisRes = await this.checkRedis();
    const aiRes = await this.checkAiPlatform();
    const storageRes = await this.checkStorage();

    const isAllUp =
      dbRes.status === 'UP' &&
      redisRes.status === 'UP' &&
      aiRes.status === 'UP' &&
      storageRes.status === 'UP';

    return {
      status: isAllUp ? 'UP' : 'DOWN',
      components: {
        database: dbRes,
        redis: redisRes,
        aiPlatform: aiRes,
        storage: storageRes,
      },
    };
  }
}
