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

  // Cheap liveness probe - no dependency checks. A container orchestrator
  // restarting the process because a downstream dependency (DB/Redis/AI
  // platform) blipped is a real outage-amplifying failure mode; liveness
  // should only ever reflect "is this process able to respond at all."
  @Get('health/live')
  getLiveness() {
    return { status: 'UP', timestamp: new Date().toISOString() };
  }

  // Readiness/aggregate health - real dependency checks. Returns 503 when
  // unhealthy: previously this always returned HTTP 200 regardless of the
  // body's status field, so anything that checks status code rather than
  // parsing the body (load balancers, most orchestrator readiness probes)
  // could never detect an outage.
  @Get('health/ready')
  async getReadiness(@Res() res: express.Response) {
    const fullCheck = await this.healthService.runFullLivenessCheck();
    res.status(fullCheck.status === 'UP' ? 200 : 503).json({
      status: fullCheck.status,
      timestamp: new Date().toISOString(),
      components: fullCheck.components,
    });
  }

  @Get('health')
  async getHealth(@Res() res: express.Response) {
    const fullCheck = await this.healthService.runFullLivenessCheck();
    res.status(fullCheck.status === 'UP' ? 200 : 503).json({
      status: fullCheck.status,
      timestamp: new Date().toISOString(),
      components: fullCheck.components,
    });
  }

  @Get('metrics')
  async getMetrics(@Res() res: express.Response) {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.end(await this.metricsService.getMetricsString());
  }
}
