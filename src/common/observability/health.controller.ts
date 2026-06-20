import { Controller, Get, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import * as express from 'express';
import { MetricsService } from './metrics.service';
import { HealthService } from '@easydev/observability';

@SkipThrottle()
@Controller()
export class HealthController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly healthService: HealthService,
  ) {}

  @Get('health')
  async getHealth() {
    const fullCheck = await this.healthService.runFullLivenessCheck();
    return {
      status: fullCheck.status,
      timestamp: new Date().toISOString(),
      components: fullCheck.components,
    };
  }

  @Get('metrics')
  async getMetrics(@Res() res: express.Response) {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.end(await this.metricsService.getMetricsString());
  }
}
