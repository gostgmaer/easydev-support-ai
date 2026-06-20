import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IWorkflowRepository } from '../repositories/workflow-repository.interface';
import { WorkflowSchedule } from '../domain';
import { CreateScheduleDto } from '../dtos/workflow.dto';
import * as crypto from 'crypto';

@Injectable()
export class WorkflowScheduleService {
  constructor(
    @Inject('IWorkflowRepository')
    private readonly repository: IWorkflowRepository,
  ) {}

  public async createSchedule(
    tenantId: string,
    dto: CreateScheduleDto,
  ): Promise<WorkflowSchedule> {
    const scheduleId = crypto.randomUUID();

    // Simple calculation: next run is 1 hour from now
    const nextRun = new Date(Date.now() + 3600000);

    const schedule = new WorkflowSchedule(scheduleId, {
      tenantId,
      workflowId: dto.workflowId,
      cronExpression: dto.cronExpression,
      timezone: dto.timezone || 'UTC',
      isActive: true,
      nextRunAt: nextRun,
    });

    return this.repository.saveSchedule(schedule, tenantId);
  }

  public async getSchedule(
    tenantId: string,
    id: string,
  ): Promise<WorkflowSchedule> {
    const schedule = await this.repository.getScheduleById(id, tenantId);
    if (!schedule) {
      throw new NotFoundException(`Workflow schedule with ID ${id} not found`);
    }
    return schedule;
  }

  public async findSchedules(
    tenantId: string,
    activeOnly?: boolean,
  ): Promise<WorkflowSchedule[]> {
    return this.repository.findSchedules(tenantId, activeOnly);
  }

  public async deleteSchedule(tenantId: string, id: string): Promise<boolean> {
    const deleted = await this.repository.deleteSchedule(id, tenantId);
    if (!deleted) {
      throw new NotFoundException(`Workflow schedule with ID ${id} not found`);
    }
    return deleted;
  }

  public async recordExecutionRun(
    tenantId: string,
    id: string,
  ): Promise<WorkflowSchedule> {
    const schedule = await this.getSchedule(tenantId, id);
    const nextRun = new Date(Date.now() + 3600000); // schedule next hour
    schedule.updateRun(nextRun);
    return this.repository.saveSchedule(schedule, tenantId);
  }

  public async toggleSchedule(
    tenantId: string,
    id: string,
    active: boolean,
  ): Promise<WorkflowSchedule> {
    const schedule = await this.getSchedule(tenantId, id);
    schedule.toggle(active);
    return this.repository.saveSchedule(schedule, tenantId);
  }
}
