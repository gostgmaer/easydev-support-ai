import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import type { IAdminRepository } from '../repositories/admin-repository.interface';
import { AdminDashboard } from '../domain/admin-dashboard.aggregate';
import { Announcement } from '../domain/announcement.entity';
import { AnnouncementSeverityEnum } from '../domain/value-objects';
import { AdminEventPublisher } from './admin-event.publisher';
import {
  CreateDashboardDto,
  UpdateDashboardDto,
  CreateAnnouncementDto,
} from '../dtos';

@Injectable()
export class AdminDashboardService {
  constructor(
    @Inject('IAdminRepository')
    private readonly repository: IAdminRepository,
    private readonly eventPublisher: AdminEventPublisher,
  ) {}

  public async createDashboard(
    tenantId: string,
    dto: CreateDashboardDto,
    userId?: string,
  ): Promise<AdminDashboard> {
    const existing = await this.repository.getDashboardByName(
      tenantId,
      dto.dashboardName,
    );
    if (existing) {
      throw new ConflictException(
        `A dashboard named "${dto.dashboardName}" already exists`,
      );
    }

    const dashboard = AdminDashboard.create(
      crypto.randomUUID(),
      {
        tenantId,
        dashboardName: dto.dashboardName,
        layout: dto.layout,
        widgets: dto.widgets,
        defaultView: dto.defaultView ?? false,
        permissions: dto.permissions,
      },
      userId,
    );

    if (dashboard.defaultView) {
      await this.repository.clearDefaultDashboards(tenantId);
    }

    await this.repository.saveDashboard(dashboard, tenantId);
    await this.eventPublisher.publishAll(dashboard.domainEvents);
    dashboard.clearEvents();
    return dashboard;
  }

  public async getDashboard(
    tenantId: string,
    id: string,
  ): Promise<AdminDashboard> {
    const dashboard = await this.repository.getDashboard(tenantId, id);
    if (!dashboard) {
      throw new NotFoundException(`Dashboard with ID ${id} not found`);
    }
    return dashboard;
  }

  public async listDashboards(tenantId: string): Promise<AdminDashboard[]> {
    return this.repository.listDashboards(tenantId);
  }

  public async getDefaultDashboard(
    tenantId: string,
  ): Promise<AdminDashboard | null> {
    return this.repository.getDefaultDashboard(tenantId);
  }

  public async updateDashboard(
    tenantId: string,
    id: string,
    dto: UpdateDashboardDto,
    userId?: string,
  ): Promise<AdminDashboard> {
    const dashboard = await this.getDashboard(tenantId, id);
    if (dto.dashboardName) dashboard.rename(dto.dashboardName, userId);
    if (dto.layout) dashboard.updateLayout(dto.layout, userId);
    if (dto.widgets) dashboard.updateWidgets(dto.widgets, userId);
    if (dto.permissions) dashboard.updatePermissions(dto.permissions, userId);
    if (dto.defaultView === true) {
      await this.repository.clearDefaultDashboards(tenantId, id);
      dashboard.setAsDefault(userId);
    } else if (dto.defaultView === false) {
      dashboard.unsetDefault();
    }

    await this.repository.saveDashboard(dashboard, tenantId);
    await this.eventPublisher.publishAll(dashboard.domainEvents);
    dashboard.clearEvents();
    return dashboard;
  }

  public async deleteDashboard(tenantId: string, id: string): Promise<boolean> {
    return this.repository.deleteDashboard(tenantId, id);
  }

  // ---- Announcements ----

  public async createAnnouncement(
    tenantId: string,
    dto: CreateAnnouncementDto,
  ): Promise<Announcement> {
    const announcement = Announcement.create(crypto.randomUUID(), {
      tenantId,
      title: dto.title,
      message: dto.message,
      severity: dto.severity || AnnouncementSeverityEnum.INFO,
      audience: dto.audience,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
    });
    await this.repository.saveAnnouncement(announcement, tenantId);
    return announcement;
  }

  public async listActiveAnnouncements(
    tenantId: string,
  ): Promise<Announcement[]> {
    return this.repository.listActiveAnnouncements(tenantId, new Date());
  }

  public async listAnnouncements(tenantId: string): Promise<Announcement[]> {
    return this.repository.listAnnouncements(tenantId);
  }

  public async deactivateAnnouncement(
    tenantId: string,
    id: string,
  ): Promise<Announcement> {
    const announcement = await this.repository.getAnnouncement(tenantId, id);
    if (!announcement) {
      throw new NotFoundException(`Announcement with ID ${id} not found`);
    }
    announcement.deactivate();
    await this.repository.saveAnnouncement(announcement, tenantId);
    return announcement;
  }

  public async deleteAnnouncement(
    tenantId: string,
    id: string,
  ): Promise<boolean> {
    return this.repository.deleteAnnouncement(tenantId, id);
  }
}
