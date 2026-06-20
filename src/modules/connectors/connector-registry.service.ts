import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConnectorInstance } from './entities/connector-instance.entity';
import { ConnectorCapability } from './entities/connector-capability.entity';

@Injectable()
export class ConnectorRegistryService {
  private readonly logger = new Logger(ConnectorRegistryService.name);

  constructor(
    @InjectRepository(ConnectorInstance) private instanceRepo: Repository<ConnectorInstance>,
    @InjectRepository(ConnectorCapability) private capabilityRepo: Repository<ConnectorCapability>,
  ) {}

  async getCapabilityEndpoint(tenantId: string, capabilityName: string): Promise<{ endpoint: string, credentials: any } | null> {
    // Look up the tenant's installed capability
    // E.g. capabilityName = 'ORDER_TRACKING'
    const capability = await this.capabilityRepo.createQueryBuilder('cap')
      .innerJoinAndSelect('cap.connectorInstance', 'instance')
      .where('instance.tenant_id = :tenantId', { tenantId })
      .andWhere('cap.capability = :capabilityName', { capabilityName })
      .getOne();

    if (!capability) {
      this.logger.warn(`Capability ${capabilityName} not configured for tenant ${tenantId}`);
      return null;
    }

    return {
      endpoint: capability.endpoint, // e.g. "https://{shop}.myshopify.com/admin/api/2026/orders"
      credentials: capability.connectorInstance.credentials, // Decrypted OAuth tokens or API Keys
    };
  }
}
