import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IConnectorRepository } from '../repositories/connector-repository.interface';
import { Connector } from '../domain/connector.aggregate';
import { ConnectorCapability } from '../domain/connector-capability.entity';
import { CapabilityTypeEnum } from '../domain/value-objects';

@Injectable()
export class CapabilityResolver {
  private readonly logger = new Logger(CapabilityResolver.name);

  constructor(
    @Inject('IConnectorRepository')
    private readonly repository: IConnectorRepository,
  ) {}

  public async resolve(
    tenantId: string,
    capabilityType: CapabilityTypeEnum,
  ): Promise<{ connector: Connector; capability: ConnectorCapability } | null> {
    this.logger.debug(
      `Resolving capability ${capabilityType} for tenant ${tenantId}`,
    );
    return this.repository.resolveCapability(tenantId, capabilityType);
  }
}
