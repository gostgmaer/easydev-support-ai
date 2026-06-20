import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import type { IAnalyticsRepository } from '../repositories/analytics-repository.interface';
import { AnalyticsSchedule } from '../domain/entities';
import { CreateScheduleDto, UpdateScheduleDto } from '../dtos/analytics.dto';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AnalyticsScheduleService {
  private readonly logger = new Logger(AnalyticsScheduleService.name);

  constructor(
    @Inject('IAnalyticsRepository')
    private readonly repository: IAnalyticsRepository,
    private readonly queueService: QueueService,
  ) {}

  async createSchedule(tenantId: string, dto: CreateScheduleDto): Promise<AnalyticsSchedule> {
    this.logger.log(`Creating schedule ${dto.name} for Tenant ${tenantId}`);
    const nextRun = new Date(Date.now() + 3600000); // 1 hour from now

    const schedule = new AnalyticsSchedule(uuidv4(), {
      tenantId,
      reportId: dto.reportId,
      name: dto.name,
      cronExpression: dto.cronExpression,
      timezone: dto.timezone || 'UTC',
      exportFormat: dto.exportFormat,
      recipients: dto.recipients,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      nextRunAt: nextRun,
    });

    return this.repository.saveSchedule(schedule);
  }

  async getSchedule(tenantId: string, id: string): Promise<AnalyticsSchedule> {
    const schedule = await this.repository.getScheduleById(id, tenantId);
    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }
    return schedule;
  }

  async findSchedules(tenantId: string, activeOnly?: boolean): Promise<AnalyticsSchedule[]> {
    return this.repository.findSchedules(tenantId, activeOnly);
  }

  async updateSchedule(tenantId: string, id: string, dto: UpdateScheduleDto): Promise<AnalyticsSchedule> {
    const schedule = await this.getSchedule(tenantId, id);

    const updated = new AnalyticsSchedule(schedule.id, {
      tenantId: schedule.tenantId,
      reportId: schedule.reportId,
      name: dto.name !== undefined ? dto.name : schedule.name,
      cronExpression: dto.cronExpression !== undefined ? dto.cronExpression : schedule.cronExpression,
      timezone: dto.timezone !== undefined ? dto.timezone : schedule.timezone,
      exportFormat: dto.exportFormat !== undefined ? dto.exportFormat : schedule.exportFormat,
      recipients: dto.recipients !== undefined ? dto.recipients : schedule.recipients,
      isActive: dto.isActive !== undefined ? dto.isActive : schedule.isActive,
      nextRunAt: schedule.nextRunAt,
      lastRunAt: schedule.lastRunAt,
      createdAt: schedule.createdAt,
      updatedAt: new Date(),
    });

    await this.repository.saveSchedule(updated);
    return updated;
  }

  async deleteSchedule(tenantId: string, id: string): Promise<boolean> {
    await this.getSchedule(tenantId, id);
    return this.repository.deleteSchedule(id, tenantId);
  }

  async processSchedule(tenantId: string, id: string): Promise<void> {
    const schedule = await this.getSchedule(tenantId, id);
    if (!schedule.isActive) return;

    this.logger.log(`Processing report schedule run for schedule ${schedule.name}`);

    // Queue the export generation & delivery job
    await this.queueService.addJob(
      QUEUES.ANALYTICS,
      'analytics-export-job',
      {
        tenantId,
        reportId: schedule.reportId,
        format: schedule.exportFormat,
        recipients: schedule.recipients,
      },
    );

    // Update next run time
    const nextRun = new Date(Date.now() + 3600000); // 1 hour from now
    schedule.updateRun(nextRun);
    await this.repository.saveSchedule(schedule);
  }

  async tickSchedules(now: Date): Promise<void> {
    const schedules = await this.repository.findSchedulesToRun(now);
    this.logger.log(`Ticking schedules. Found ${schedules.length} schedules to execute.`);

    for (const schedule of schedules) {
      try {
        await this.processSchedule(schedule.tenantId, schedule.id);
      } catch (err: any) {
        this.logger.error(`Error executing schedule ${schedule.id}: ${err.message}`);
      }
    }
  }
}
