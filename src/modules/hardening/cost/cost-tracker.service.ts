import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CostTrackerService {
  private readonly logger = new Logger(CostTrackerService.name);
  private redisClient: Redis | null = null;
  private isRedisConnected = false;

  constructor() {
    try {
      this.redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6380', 10),
        maxRetriesPerRequest: 1,
      });
      this.redisClient.on('connect', () => {
        this.isRedisConnected = true;
      });
      this.redisClient.on('error', () => {
        this.isRedisConnected = false;
      });
    } catch {
      this.isRedisConnected = false;
    }
  }

  // AI Costs estimation based on token usage
  async trackAiUsage(
    tenantId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): Promise<number> {
    // Estimations: GPT-4 prices
    const inputCost = (inputTokens / 1000) * 0.01; // $0.01 per 1K
    const outputCost = (outputTokens / 1000) * 0.03; // $0.03 per 1K
    const totalCost = inputCost + outputCost;

    await this.incrementCostMetric(tenantId, 'ai_cost', totalCost);
    await this.incrementCountMetric(
      tenantId,
      'ai_tokens_count',
      inputTokens + outputTokens,
    );

    await this.checkQuotas(tenantId, 'ai');
    return totalCost;
  }

  // Webhook and Connector executions costing
  async trackConnectorUsage(
    tenantId: string,
    connectorType: string,
    bytesTransferred: number,
  ): Promise<number> {
    // $0.0001 per KB transferred
    const totalCost = (bytesTransferred / 1024) * 0.0001;

    await this.incrementCostMetric(tenantId, 'connector_cost', totalCost);
    await this.incrementCountMetric(
      tenantId,
      'connector_bytes_count',
      bytesTransferred,
    );

    await this.checkQuotas(tenantId, 'connector');
    return totalCost;
  }

  // Storage cost estimation
  async trackStorageUsage(
    tenantId: string,
    additionalBytes: number,
  ): Promise<number> {
    // $0.00002 per MB stored
    const totalCost = (additionalBytes / (1024 * 1024)) * 0.00002;

    await this.incrementCostMetric(tenantId, 'storage_cost', totalCost);
    await this.incrementCountMetric(
      tenantId,
      'storage_bytes_count',
      additionalBytes,
    );

    await this.checkQuotas(tenantId, 'storage');
    return totalCost;
  }

  private async incrementCostMetric(
    tenantId: string,
    metricKey: string,
    amount: number,
  ): Promise<void> {
    if (this.isRedisConnected && this.redisClient) {
      const today = new Date().toISOString().substring(0, 10);
      const key = `cost:${tenantId}:${metricKey}:${today}`;
      await this.redisClient.incrbyfloat(key, amount);
      await this.redisClient.expire(key, 86400 * 31); // Store daily key for 1 month
    }
  }

  private async incrementCountMetric(
    tenantId: string,
    metricKey: string,
    count: number,
  ): Promise<void> {
    if (this.isRedisConnected && this.redisClient) {
      const today = new Date().toISOString().substring(0, 10);
      const key = `cost:${tenantId}:${metricKey}:${today}`;
      await this.redisClient.incrby(key, count);
      await this.redisClient.expire(key, 86400 * 31);
    }
  }

  private async checkQuotas(tenantId: string, category: string): Promise<void> {
    if (!this.isRedisConnected || !this.redisClient) return;

    const today = new Date().toISOString().substring(0, 10);

    // Sum costs
    const aiKey = `cost:${tenantId}:ai_cost:${today}`;
    const connectorKey = `cost:${tenantId}:connector_cost:${today}`;
    const storageKey = `cost:${tenantId}:storage_cost:${today}`;

    const [ai, conn, stor] = await this.redisClient.mget(
      aiKey,
      connectorKey,
      storageKey,
    );
    const totalDailyCost =
      parseFloat(ai || '0') + parseFloat(conn || '0') + parseFloat(stor || '0');

    // Check against tenant cost limits (default $50/day limit)
    const costLimit = 50.0;
    if (totalDailyCost > costLimit) {
      this.logger.warn(
        `Tenant ${tenantId} has breached the daily cost budget (triggered by ${category} usage): $${totalDailyCost.toFixed(2)} / $${costLimit}`,
      );
      throw new HttpException(
        `Quota breached. Total daily cost is $${totalDailyCost.toFixed(2)} which exceeds the quota of $${costLimit}`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async getUsageMetrics(tenantId: string): Promise<any> {
    if (!this.isRedisConnected || !this.redisClient)
      return { message: 'Metrics currently unavailable' };

    const today = new Date().toISOString().substring(0, 10);
    const aiCost = parseFloat(
      (await this.redisClient.get(`cost:${tenantId}:ai_cost:${today}`)) || '0',
    );
    const connCost = parseFloat(
      (await this.redisClient.get(
        `cost:${tenantId}:connector_cost:${today}`,
      )) || '0',
    );
    const storCost = parseFloat(
      (await this.redisClient.get(`cost:${tenantId}:storage_cost:${today}`)) ||
        '0',
    );

    const tokens = parseInt(
      (await this.redisClient.get(
        `cost:${tenantId}:ai_tokens_count:${today}`,
      )) || '0',
      10,
    );
    const bytes = parseInt(
      (await this.redisClient.get(
        `cost:${tenantId}:connector_bytes_count:${today}`,
      )) || '0',
      10,
    );

    return {
      dailyCost: {
        ai: aiCost,
        connector: connCost,
        storage: storCost,
        total: aiCost + connCost + storCost,
      },
      counts: {
        tokens,
        bytesTransferred: bytes,
      },
    };
  }
}
