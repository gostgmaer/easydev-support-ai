import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IWorkflowRepository } from '../repositories/workflow-repository.interface';
import { WorkflowTemplate } from '../domain';
import { TriggerTypeEnum, WorkflowStatusEnum } from '../domain/value-objects';

@Injectable()
export class WorkflowTriggerService {
  private readonly logger = new Logger(WorkflowTriggerService.name);

  constructor(
    @Inject('IWorkflowRepository')
    private readonly repository: IWorkflowRepository,
  ) {}

  public async findTriggeredTemplates(
    tenantId: string,
    triggerType: TriggerTypeEnum,
  ): Promise<WorkflowTemplate[]> {
    this.logger.log(`Scanning active workflow templates for trigger: ${triggerType} (tenant: ${tenantId})`);
    
    const activeTemplates = await this.repository.findTemplates(tenantId, {
      status: WorkflowStatusEnum.ACTIVE,
    });

    return activeTemplates.filter((template) =>
      template.triggers.some((trigger) => trigger.triggerType === triggerType),
    );
  }
}
