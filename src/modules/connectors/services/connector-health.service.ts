import { Injectable, Inject, Logger } from '@nestjs/common';
import axios from 'axios';
import type { IConnectorRepository } from '../repositories/connector-repository.interface';
import { Connector } from '../domain/connector.aggregate';
import { ConnectorEventPublisher } from './connector-event.publisher';

@Injectable()
export class ConnectorHealthService {
  private readonly logger = new Logger(ConnectorHealthService.name);

  constructor(
    @Inject('IConnectorRepository')
    private readonly repository: IConnectorRepository,
    private readonly eventPublisher: ConnectorEventPublisher,
  ) {}

  public async checkHealth(tenantId: string, connectorId: string): Promise<boolean> {
    this.logger.log(`Checking health for connector ${connectorId} under tenant ${tenantId}`);

    const connector = await this.repository.findById(connectorId, tenantId);
    if (!connector) {
      this.logger.warn(`Connector ${connectorId} not found during health check`);
      return false;
    }

    const isHealthy = await this.probeConnector(connector);

    if (isHealthy) {
      connector.recordHealthy();
      this.logger.debug(`Connector ${connector.name} is HEALTHY`);
    } else {
      connector.recordUnhealthy('Ping check failed: Connection refused or timeout');
      this.logger.warn(`Connector ${connector.name} is UNHEALTHY`);
    }

    await this.repository.save(connector, tenantId);
    await this.eventPublisher.publishAll(connector.domainEvents);
    connector.clearEvents();

    return isHealthy;
  }

  public async runHealthSweep(limit = 20): Promise<void> {
    this.logger.log(`Running periodic connector health sweep (limit: ${limit})`);
    
    // Pass undefined tenantId to find active connectors across all tenants
    const connectors = await this.repository.findActiveForHealthSweep(undefined, limit);
    
    for (const connector of connectors) {
      try {
        await this.checkHealth(connector.tenantId, connector.id);
      } catch (err: any) {
        this.logger.error(`Error during health check sweep for connector ${connector.id}: ${err.message}`);
      }
    }
  }

  private async probeConnector(connector: Connector): Promise<boolean> {
    if (!connector.baseUrl) {
      return true; // Webhook-only or no base URL configured is healthy by default
    }

    // Attempt to ping the base URL
    try {
      await axios.get(connector.baseUrl, {
        timeout: 5000,
        headers: { 'User-Agent': 'EasyDev-Support-AI-HealthProbe' },
        validateStatus: () => true, // Accept any status code (since 401/403/404 means the server responded)
      });
      return true;
    } catch (err: any) {
      this.logger.debug(`Probe failed for connector base url ${connector.baseUrl}: ${err.message}`);
      return false;
    }
  }
}
