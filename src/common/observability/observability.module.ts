import { Global, Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { StructuredLogger } from './logger.service';
import { HealthController } from './health.controller';
import { TelemetryController } from './telemetry.controller';
import { ObservabilityMiddleware } from './observability.middleware';
import { HealthService } from '@easydev/observability';
import { AnalyticsModule } from '../../modules/analytics/analytics.module';

@Global()
@Module({
  imports: [AnalyticsModule],
  controllers: [HealthController, TelemetryController],
  providers: [MetricsService, StructuredLogger, HealthService],
  exports: [MetricsService, StructuredLogger, HealthService],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ObservabilityMiddleware).forRoutes('*');
  }
}
