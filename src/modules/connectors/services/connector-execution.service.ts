import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type {
  IConnectorRepository,
  ExecutionQueryOptions,
} from '../repositories/connector-repository.interface';
import { ExecutionEngine } from '../engine/execution-engine';
import { CapabilityTypeEnum } from '../domain/value-objects';
import { ConnectorExecution } from '../domain/connector-execution.entity';

@Injectable()
export class ConnectorExecutionService {
  constructor(
    @Inject('IConnectorRepository')
    private readonly repository: IConnectorRepository,
    private readonly executionEngine: ExecutionEngine,
  ) {}

  public async executeCapability(
    tenantId: string,
    capabilityType: CapabilityTypeEnum,
    params: Record<string, any>,
    options: {
      workflowId?: string;
      conversationId?: string;
      ticketId?: string;
      idempotencyKey?: string;
    } = {},
  ): Promise<any> {
    // Check idempotency if key provided
    if (options.idempotencyKey) {
      const existing = await this.repository.findExecutionByIdempotency(
        tenantId,
        options.idempotencyKey,
      );
      if (existing && existing.status === 'SUCCESS') {
        return existing.responsePayload;
      }
    }

    return this.executionEngine.execute(
      tenantId,
      capabilityType,
      params,
      options,
    );
  }

  public async getExecution(
    tenantId: string,
    executionId: string,
  ): Promise<ConnectorExecution> {
    const execution = await this.repository.getExecution(tenantId, executionId);
    if (!execution) {
      throw new NotFoundException(`Execution with ID ${executionId} not found`);
    }
    return execution;
  }

  public async getExecutions(
    tenantId: string,
    connectorId: string,
    options: ExecutionQueryOptions,
  ) {
    return this.repository.findExecutions(tenantId, connectorId, options);
  }
}
