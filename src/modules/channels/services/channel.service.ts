import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type { IChannelRepository } from '../repositories/channel-repository.interface';
import { Channel } from '../domain/channel.aggregate';
import { CreateChannelDto, UpdateChannelDto, ChannelQueryDto } from '../dtos';
import {
  ChannelType,
  ChannelStatus,
  ChannelStatusEnum,
  ChannelProvider,
} from '../domain/value-objects';
import { randomUUID } from 'crypto';
import { AuditService } from '../../audit/audit.service';
import { ChannelEventPublisher } from './channel-event.publisher';

@Injectable()
export class ChannelService {
  constructor(
    @Inject('IChannelRepository')
    private readonly channelRepo: IChannelRepository,
    private readonly eventPublisher: ChannelEventPublisher,
    private readonly auditService: AuditService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateChannelDto,
    userId?: string,
  ): Promise<Channel> {
    const existing = await this.channelRepo.findByName(dto.name, tenantId);
    if (existing) {
      throw new ConflictException(
        `Channel with name ${dto.name} already exists`,
      );
    }

    const type = ChannelType.create(dto.type);
    const status = ChannelStatus.create(ChannelStatusEnum.ACTIVE);
    const provider = ChannelProvider.create(dto.provider);

    const channel = Channel.create(randomUUID(), {
      tenantId,
      name: dto.name,
      type,
      status,
      provider,
      isActive: true,
      isDefault: dto.isDefault ?? false,
      metadata: dto.metadata,
    });

    const saved = await this.channelRepo.save(channel, tenantId);
    await this.eventPublisher.publishAll(channel.domainEvents);
    channel.clearEvents();

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CHANNEL_CREATE',
      details: `Created channel ${channel.name} of type ${channel.type.value}`,
    });

    return saved;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateChannelDto,
    userId?: string,
  ): Promise<Channel> {
    const channel = await this.channelRepo.findById(id, tenantId);
    if (!channel) {
      throw new NotFoundException(`Channel ${id} not found`);
    }

    channel.update(dto);
    const saved = await this.channelRepo.save(channel, tenantId);
    await this.eventPublisher.publishAll(channel.domainEvents);
    channel.clearEvents();

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CHANNEL_UPDATE',
      details: `Updated channel ${channel.name}`,
    });

    return saved;
  }

  async enable(tenantId: string, id: string, userId?: string): Promise<void> {
    const channel = await this.channelRepo.findById(id, tenantId);
    if (!channel) throw new NotFoundException(`Channel ${id} not found`);

    channel.enable();
    await this.channelRepo.save(channel, tenantId);
    await this.eventPublisher.publishAll(channel.domainEvents);
    channel.clearEvents();

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CHANNEL_ENABLE',
      details: `Enabled channel ${id}`,
    });
  }

  async disable(tenantId: string, id: string, userId?: string): Promise<void> {
    const channel = await this.channelRepo.findById(id, tenantId);
    if (!channel) throw new NotFoundException(`Channel ${id} not found`);

    channel.disable();
    await this.channelRepo.save(channel, tenantId);
    await this.eventPublisher.publishAll(channel.domainEvents);
    channel.clearEvents();

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CHANNEL_DISABLE',
      details: `Disabled channel ${id}`,
    });
  }

  async findById(tenantId: string, id: string): Promise<Channel> {
    const channel = await this.channelRepo.findById(id, tenantId);
    if (!channel) {
      throw new NotFoundException(`Channel ${id} not found`);
    }
    return channel;
  }

  async findPaginated(tenantId: string, query: ChannelQueryDto) {
    return this.channelRepo.findPaginated(tenantId, query);
  }
}
