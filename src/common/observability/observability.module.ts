import { Global, Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { StructuredLogger } from './logger.service';
import { HealthController } from './health.controller';
import { ObservabilityMiddleware } from './observability.middleware';

@Global()
@Module({
  controllers: [HealthController],
  providers: [MetricsService, StructuredLogger],
  exports: [MetricsService, StructuredLogger],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ObservabilityMiddleware).forRoutes('*');
  }
}
