import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';

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
  getMetrics(@Res() res: Response) {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.end(this.metricsService.getMetricsString());
  }
}
