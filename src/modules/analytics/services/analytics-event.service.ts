import { Injectable, Logger } from '@nestjs/common';
import type { IAnalyticsRepository } from '../repositories/analytics-repository.interface';
import { AnalyticsEvent } from '../domain/entities';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import { uuid } from 'drizzle-orm/pg-core';
import { v4 as uuidv4 } from 'uuid';
import { Inject } from '@nestjs/common';

@Injectable()
export class AnalyticsEventService {
  private readonly logger = new Logger(AnalyticsEventService.name);

  constructor(
    @Inject('IAnalyticsRepository')
    private readonly repository: IAnalyticsRepository,
    private readonly queueService: QueueService,
  ) {}

  async trackEvent(
    tenantId: string,
    eventName: string,
    aggregateType: string,
    aggregateId: string,
    payload: Record<string, any>,
    userId?: string,
    metadata?: Record<string, any>,
  ): Promise<AnalyticsEvent> {
    this.logger.debug(
      `Tracking event: ${eventName} for aggregate: ${aggregateId}`,
    );

    const event = AnalyticsEvent.create(uuidv4(), {
      tenantId,
      eventName,
      aggregateType,
      aggregateId,
      userId,
      timestamp: new Date(),
      payload,
      metadata,
    });

    await this.repository.saveEvent(event);

    // Enqueue background processing job for projections and real-time updates
    await this.queueService.addJob(QUEUES.ANALYTICS, 'analytics-event-job', {
      eventId: event.id,
      tenantId,
      eventName,
      aggregateType,
      aggregateId,
      userId,
      timestamp: event.timestamp.toISOString(),
      payload,
      metadata,
    });

    return event;
  }
}
