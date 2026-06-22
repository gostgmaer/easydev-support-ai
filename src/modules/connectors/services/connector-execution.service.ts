import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  forwardRef,
} from '@nestjs/common';
import type {
  IConnectorRepository,
  ExecutionQueryOptions,
} from '../repositories/connector-repository.interface';
import { ExecutionEngine } from '../engine/execution-engine';
import {
  CapabilityTypeEnum,
  ExecutionStatusEnum,
} from '../domain/value-objects';
import { ConnectorExecution } from '../domain/connector-execution.entity';
import { WorkflowEngineService } from '../../workflows/services/workflow-engine.service';
import { TriggerTypeEnum } from '../../workflows/domain/value-objects';

@Injectable()
export class ConnectorExecutionService {
  private readonly logger = new Logger(ConnectorExecutionService.name);

  constructor(
    @Inject('IConnectorRepository')
    private readonly repository: IConnectorRepository,
    private readonly executionEngine: ExecutionEngine,
    @Inject(forwardRef(() => WorkflowEngineService))
    private readonly workflowEngineService: WorkflowEngineService,
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

    const result = await this.executionEngine.execute(
      tenantId,
      capabilityType,
      params,
      options,
    );

    try {
      await this.workflowEngineService.evaluateEventTriggers(
        tenantId,
        TriggerTypeEnum.CONNECTOR_EXECUTED,
        {
          capabilityType,
          params,
          result,
          workflowId: options.workflowId,
          conversationId: options.conversationId,
          ticketId: options.ticketId,
        },
      );
    } catch (err: any) {
      this.logger.warn(
        `Failed to evaluate workflow triggers for CONNECTOR_EXECUTED: ${err.message}`,
      );
    }

    return result;
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

  public async retryExecution(
    tenantId: string,
    executionId: string,
  ): Promise<any> {
    const execution = await this.getExecution(tenantId, executionId);

    if (
      execution.status !== ExecutionStatusEnum.FAILED &&
      execution.status !== ExecutionStatusEnum.CIRCUIT_OPEN
    ) {
      throw new BadRequestException(
        `Execution ${executionId} cannot be retried from status ${execution.status}`,
      );
    }

    return this.executeCapability(
      tenantId,
      execution.capabilityType as CapabilityTypeEnum,
      execution.requestPayload || {},
      {
        workflowId: execution.workflowId,
        conversationId: execution.conversationId,
        ticketId: execution.ticketId,
      },
    );
  }
}
