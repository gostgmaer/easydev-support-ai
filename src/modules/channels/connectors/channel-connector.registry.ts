import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IChannelConnector } from './channel-connector.interface';
import { ChannelTypeEnum } from '../domain/value-objects';

export const CHANNEL_CONNECTORS_TOKEN = 'CHANNEL_CONNECTORS_TOKEN';

@Injectable()
export class ChannelConnectorRegistry {
  private readonly registry = new Map<ChannelTypeEnum, IChannelConnector>();

  constructor(
    @Inject(CHANNEL_CONNECTORS_TOKEN)
    private readonly connectors: IChannelConnector[]
  ) {
    for (const connector of connectors) {
      this.registry.set(connector.channelType, connector);
    }
  }

  getConnector(type: ChannelTypeEnum): IChannelConnector {
    const connector = this.registry.get(type);
    if (!connector) {
      throw new NotFoundException(`No channel connector found for type: ${type}`);
    }
    return connector;
  }
}
