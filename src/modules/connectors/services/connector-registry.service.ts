import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IConnectorRepository } from '../repositories/connector-repository.interface';
import { Connector } from '../domain/connector.aggregate';
import { ConnectorCapability } from '../domain/connector-capability.entity';
import { CapabilityTypeEnum } from '../domain/value-objects';

@Injectable()
export class ConnectorRegistryService {
  private readonly logger = new Logger(ConnectorRegistryService.name);

  constructor(
    @Inject('IConnectorRepository')
    private readonly repository: IConnectorRepository,
  ) {}

  public async getCapabilityEndpoint(
    tenantId: string,
    capabilityName: string,
  ): Promise<{ endpoint: string; credentials: any } | null> {
    this.logger.debug(
      `Fetching capability endpoint for ${capabilityName} (tenant ${tenantId})`,
    );

    const result = await this.repository.resolveCapability(
      tenantId,
      capabilityName,
    );
    if (!result) {
      this.logger.warn(
        `Capability ${capabilityName} not configured for tenant ${tenantId}`,
      );
      return null;
    }

    const credential = await this.repository.getActiveCredential(
      tenantId,
      result.connector.id,
    );

    return {
      endpoint: `${result.connector.baseUrl?.replace(/\/$/, '')}/${result.capability.path.replace(/^\//, '')}`,
      credentials: credential ? credential.toSafeJSON() : null,
    };
  }

  public async resolveCapability(
    tenantId: string,
    capabilityType: CapabilityTypeEnum,
  ): Promise<{ connector: Connector; capability: ConnectorCapability } | null> {
    return this.repository.resolveCapability(tenantId, capabilityType);
  }
}
