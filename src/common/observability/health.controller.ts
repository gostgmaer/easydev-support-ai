import { Controller, Get, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import * as express from 'express';
import { MetricsService } from './metrics.service';

@SkipThrottle()
@Controller()
export class HealthController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('health')
  getHealth() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      services: {
        database: 'UP',
        redis: 'UP',
      },
    };
  }

  @Get('metrics')
  getMetrics(@Res() res: express.Response) {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.end(this.metricsService.getMetricsString());
  }
}
