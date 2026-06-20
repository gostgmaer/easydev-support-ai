import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import type { IChannelRepository } from '../repositories/channel-repository.interface';
import { ChannelConnectorRegistry } from '../connectors/channel-connector.registry';
import { ChannelEventPublisher } from './channel-event.publisher';
import { ChannelHealthFailedEvent, ChannelHealthRestoredEvent } from '@easydev/shared-events';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class ChannelHealthService {
  private readonly logger = new Logger(ChannelHealthService.name);

  constructor(
    @Inject('IChannelRepository')
    private readonly channelRepo: IChannelRepository,
    private readonly connectorRegistry: ChannelConnectorRegistry,
    private readonly eventPublisher: ChannelEventPublisher,
    private readonly auditService: AuditService
  ) {}

  async checkHealth(tenantId: string, channelId: string): Promise<{ status: string; latencyMs: number; error?: string }> {
    const channel = await this.channelRepo.findById(channelId, tenantId);
    if (!channel) throw new NotFoundException(`Channel ${channelId} not found`);

    const config = await this.channelRepo.findConfigByChannelId(channelId, tenantId);
    if (!config) throw new NotFoundException(`Configuration for channel ${channelId} not found`);

    const connector = this.connectorRegistry.getConnector(channel.type.value);
    const prevStatus = config.healthStatus;

    let checkResult: { status: 'ONLINE' | 'OFFLINE'; latencyMs: number; error?: string };
    try {
      checkResult = await connector.healthCheck(tenantId, channelId);
    } catch (err: any) {
      checkResult = { status: 'OFFLINE', latencyMs: 0, error: err.message };
    }

    const currentStatus = checkResult.status === 'ONLINE' ? 'HEALTHY' : 'UNHEALTHY';

    config.update({
      healthStatus: currentStatus,
      lastHealthCheck: new Date(),
    });

    await this.channelRepo.saveConfig(config, tenantId);

    if (prevStatus !== currentStatus) {
      if (currentStatus === 'UNHEALTHY') {
        await this.eventPublisher.publish(
          new ChannelHealthFailedEvent(tenantId, channelId, checkResult.error || 'Connection Failed')
        );
        await this.auditService.log({
          tenantId,
          action: 'CHANNEL_HEALTH_FAILED',
          details: `Channel ${channelId} health status degraded to UNHEALTHY: ${checkResult.error}`,
        });
      } else {
        await this.eventPublisher.publish(new ChannelHealthRestoredEvent(tenantId, channelId));
        await this.auditService.log({
          tenantId,
          action: 'CHANNEL_HEALTH_RESTORED',
          details: `Channel ${channelId} health status restored to HEALTHY`,
        });
      }
    }

    return {
      status: currentStatus,
      latencyMs: checkResult.latencyMs,
      error: checkResult.error,
    };
  }

  async getHealth(tenantId: string, channelId: string) {
    const config = await this.channelRepo.findConfigByChannelId(channelId, tenantId);
    if (!config) throw new NotFoundException(`Configuration for channel ${channelId} not found`);

    return {
      healthStatus: config.healthStatus,
      lastHealthCheck: config.lastHealthCheck,
    };
  }
}
