import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { IWidgetRepository } from '../repositories/widget-repository.interface';
import { WidgetConfig } from '../domain/entities';
import { WidgetEventPublisher } from './widget-event.publisher';
import { WidgetUpdatedEvent } from '@easydev/shared-events';
import {
  CreateWidgetConfigDto,
  UpdateWidgetConfigDto,
} from '../dtos/widget.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WidgetConfigService {
  constructor(
    @Inject('IWidgetRepository')
    private readonly widgetRepo: IWidgetRepository,
    private readonly eventPublisher: WidgetEventPublisher,
  ) {}

  async getOrCreateConfig(tenantId: string): Promise<WidgetConfig> {
    let config = await this.widgetRepo.getWidgetConfig(tenantId);
    if (!config) {
      config = new WidgetConfig(uuidv4(), {
        tenantId,
        widgetName: 'EasyDev Support AI Chat',
        theme: 'light',
        primaryColor: '#0F172A',
        secondaryColor: '#3B82F6',
        position: 'bottom-right',
        welcomeMessage: 'Hello! How can we help you today?',
        offlineMessage: 'We are currently offline. Please leave a message.',
        allowedDomains: [],
      });
      await this.widgetRepo.saveWidgetConfig(config);
    }
    return config;
  }

  async updateConfig(
    tenantId: string,
    dto: UpdateWidgetConfigDto,
  ): Promise<WidgetConfig> {
    const config = await this.getOrCreateConfig(tenantId);
    config.update(dto);
    await this.widgetRepo.saveWidgetConfig(config);
    await this.eventPublisher.publish(
      new WidgetUpdatedEvent(tenantId, config.id),
    );
    return config;
  }

  async validateDomain(tenantId: string, origin: string): Promise<boolean> {
    if (!origin) return false;

    // Parse hostname
    let hostname = origin;
    try {
      if (origin.startsWith('http://') || origin.startsWith('https://')) {
        hostname = new URL(origin).hostname;
      }
    } catch {
      // Invalid URL, fallback to raw string
    }

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }

    const config = await this.getOrCreateConfig(tenantId);
    if (config.allowedDomains.length === 0) {
      return true; // No domain restrictions if empty
    }

    // Match exact or wildcard subdomains (e.g. *.example.com matches app.example.com)
    return config.allowedDomains.some((domain) => {
      if (domain.startsWith('*.')) {
        const baseDomain = domain.substring(2);
        return hostname === baseDomain || hostname.endsWith('.' + baseDomain);
      }
      return hostname === domain;
    });
  }
}
