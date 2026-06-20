import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import type { IWidgetRepository } from '../repositories/widget-repository.interface';
import { WidgetEvent, WidgetPageView } from '../domain/entities';
import { TrackWidgetEventDto, TrackPageViewDto } from '../dtos/widget.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WidgetEventService {
  private readonly logger = new Logger(WidgetEventService.name);

  constructor(
    @Inject('IWidgetRepository')
    private readonly widgetRepo: IWidgetRepository,
  ) {}

  async trackEvent(tenantId: string, dto: TrackWidgetEventDto): Promise<WidgetEvent> {
    const session = await this.widgetRepo.getSessionById(tenantId, dto.sessionId);
    if (!session) {
      throw new NotFoundException(`Session with ID ${dto.sessionId} not found`);
    }

    const event = new WidgetEvent(uuidv4(), {
      tenantId,
      sessionId: dto.sessionId,
      eventName: dto.eventName,
      eventData: dto.eventData || {},
    });

    await this.widgetRepo.saveEvent(event);
    return event;
  }

  async trackPageView(tenantId: string, dto: TrackPageViewDto): Promise<WidgetPageView> {
    const session = await this.widgetRepo.getSessionById(tenantId, dto.sessionId);
    if (!session) {
      throw new NotFoundException(`Session with ID ${dto.sessionId} not found`);
    }

    const pageView = new WidgetPageView(uuidv4(), {
      tenantId,
      sessionId: dto.sessionId,
      url: dto.url,
      title: dto.title,
      timeSpentSeconds: dto.timeSpentSeconds || 0,
    });

    await this.widgetRepo.savePageView(pageView);
    return pageView;
  }

  async getSessionEvents(tenantId: string, sessionId: string): Promise<WidgetEvent[]> {
    return this.widgetRepo.getEventsBySession(tenantId, sessionId);
  }

  async getSessionPageViews(tenantId: string, sessionId: string): Promise<WidgetPageView[]> {
    return this.widgetRepo.getPageViewsBySession(tenantId, sessionId);
  }
}
