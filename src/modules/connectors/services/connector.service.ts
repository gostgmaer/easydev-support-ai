import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type { IConnectorRepository } from '../repositories/connector-repository.interface';
import { Connector } from '../domain/connector.aggregate';
import {
  ConnectorInstance,
  InstanceStatusEnum,
} from '../domain/connector-instance.entity';
import { ConnectorCapability } from '../domain/connector-capability.entity';
import {
  ConnectorType,
  ConnectorStatus,
  ConnectorStatusEnum,
  AuthTypeEnum,
  CapabilityType,
  HealthStatusEnum,
} from '../domain/value-objects';
import {
  InstallConnectorDto,
  ConfigureConnectorDto,
  CreateInstanceDto,
  MapCapabilitiesDto,
} from '../dtos/connector.dto';
import { ConnectorEventPublisher } from './connector-event.publisher';
import { UsageLimitService } from '../../settings/services/usage-limit.service';

@Injectable()
export class ConnectorService {
  constructor(
    @Inject('IConnectorRepository')
    private readonly repository: IConnectorRepository,
    private readonly eventPublisher: ConnectorEventPublisher,
    private readonly usageLimitService: UsageLimitService,
  ) {}

  public async installConnector(
    tenantId: string,
    dto: InstallConnectorDto,
  ): Promise<Connector> {
    const existing = await this.repository.findBySlug(tenantId, dto.slug);
    if (existing) {
      throw new ConflictException(
        `Connector with slug '${dto.slug}' already exists`,
      );
    }

    // UsageLimits stored a maxConnectors ceiling per plan but nothing ever
    // checked it before installing a new connector.
    const { total: currentConnectors } = await this.repository.findPaginated(
      tenantId,
      { limit: 1 },
    );
    await this.usageLimitService.enforceLimit(
      tenantId,
      'connectors',
      currentConnectors,
    );

    const connectorId = crypto.randomUUID();
    const connector = Connector.create(connectorId, {
      tenantId,
      name: dto.name,
      slug: dto.slug,
      connectorType: ConnectorType.create(dto.connectorType),
      description: dto.description,
      baseUrl: dto.baseUrl,
      authType: dto.authType,
      status: ConnectorStatus.create(ConnectorStatusEnum.DRAFT),
      config: dto.config,
      metadata: dto.metadata,
    });

    const saved = await this.repository.save(connector, tenantId);
    await this.eventPublisher.publishAll(connector.domainEvents);
    connector.clearEvents();
    return saved;
  }

  public async updateConnector(
    tenantId: string,
    connectorId: string,
    dto: ConfigureConnectorDto,
  ): Promise<Connector> {
    const connector = await this.repository.findById(connectorId, tenantId);
    if (!connector) {
      throw new NotFoundException(`Connector ${connectorId} not found`);
    }

    connector.update({
      name: dto.name,
      description: dto.description,
      baseUrl: dto.baseUrl,
      authType: dto.authType,
      config: dto.config,
      metadata: dto.metadata,
    });

    const saved = await this.repository.save(connector, tenantId);
    await this.eventPublisher.publishAll(connector.domainEvents);
    connector.clearEvents();
    return saved;
  }

  public async activateConnector(
    tenantId: string,
    connectorId: string,
  ): Promise<Connector> {
    const connector = await this.repository.findById(connectorId, tenantId);
    if (!connector) {
      throw new NotFoundException(`Connector ${connectorId} not found`);
    }
    connector.activate();
    const saved = await this.repository.save(connector, tenantId);
    await this.eventPublisher.publishAll(connector.domainEvents);
    connector.clearEvents();
    return saved;
  }

  public async pauseConnector(
    tenantId: string,
    connectorId: string,
  ): Promise<Connector> {
    const connector = await this.repository.findById(connectorId, tenantId);
    if (!connector) {
      throw new NotFoundException(`Connector ${connectorId} not found`);
    }
    connector.pause();
    const saved = await this.repository.save(connector, tenantId);
    await this.eventPublisher.publishAll(connector.domainEvents);
    connector.clearEvents();
    return saved;
  }

  public async disableConnector(
    tenantId: string,
    connectorId: string,
  ): Promise<Connector> {
    const connector = await this.repository.findById(connectorId, tenantId);
    if (!connector) {
      throw new NotFoundException(`Connector ${connectorId} not found`);
    }
    connector.disable();
    const saved = await this.repository.save(connector, tenantId);
    await this.eventPublisher.publishAll(connector.domainEvents);
    connector.clearEvents();
    return saved;
  }

  public async deleteConnector(
    tenantId: string,
    connectorId: string,
  ): Promise<void> {
    const connector = await this.repository.findById(connectorId, tenantId);
    if (!connector) {
      throw new NotFoundException(`Connector ${connectorId} not found`);
    }
    connector.softDelete();
    await this.repository.save(connector, tenantId);
    await this.eventPublisher.publishAll(connector.domainEvents);
    connector.clearEvents();
  }

  public async getConnector(
    tenantId: string,
    connectorId: string,
  ): Promise<Connector> {
    const connector = await this.repository.findById(connectorId, tenantId);
    if (!connector) {
      throw new NotFoundException(`Connector ${connectorId} not found`);
    }
    return connector;
  }

  public async getConnectors(tenantId: string, options: any) {
    return this.repository.findPaginated(tenantId, options);
  }

  public async createInstance(
    tenantId: string,
    connectorId: string,
    dto: CreateInstanceDto,
  ): Promise<ConnectorInstance> {
    const connector = await this.repository.findById(connectorId, tenantId);
    if (!connector) {
      throw new NotFoundException(`Connector ${connectorId} not found`);
    }

    const instance = new ConnectorInstance(crypto.randomUUID(), {
      tenantId,
      connectorId,
      name: dto.name,
      environment: dto.environment || 'production',
      status: InstanceStatusEnum.ACTIVE,
      healthStatus: HealthStatusEnum.UNKNOWN,
      config: dto.config,
      metadata: dto.metadata,
    });

    await this.repository.saveInstance(instance, tenantId);
    return instance;
  }

  public async getInstances(
    tenantId: string,
    connectorId: string,
  ): Promise<ConnectorInstance[]> {
    return this.repository.findInstances(tenantId, connectorId);
  }

  public async deleteInstance(
    tenantId: string,
    instanceId: string,
  ): Promise<boolean> {
    return this.repository.deleteInstance(tenantId, instanceId);
  }

  public async mapCapabilities(
    tenantId: string,
    connectorId: string,
    dto: MapCapabilitiesDto,
  ): Promise<Connector> {
    const connector = await this.repository.findById(connectorId, tenantId);
    if (!connector) {
      throw new NotFoundException(`Connector ${connectorId} not found`);
    }

    // Replace or add capabilities
    for (const item of dto.capabilities) {
      const cap = new ConnectorCapability(crypto.randomUUID(), {
        tenantId,
        connectorId,
        capabilityType: CapabilityType.create(item.capabilityType),
        name: item.name,
        description: item.description,
        method: item.method,
        path: item.path,
        requestMapping: item.requestMapping,
        responseMapping: item.responseMapping,
        inputSchema: item.inputSchema,
        outputSchema: item.outputSchema,
        enabled: true,
      });
      connector.addCapability(cap);
    }

    const saved = await this.repository.save(connector, tenantId);
    await this.eventPublisher.publishAll(connector.domainEvents);
    connector.clearEvents();
    return saved;
  }
}
