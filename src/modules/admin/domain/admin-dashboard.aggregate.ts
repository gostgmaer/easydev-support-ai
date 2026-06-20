import { AggregateRoot } from '@easydev/shared-kernel';
import { AdminDashboardUpdatedEvent } from '@easydev/shared-events';

export interface AdminDashboardProps {
  tenantId: string;
  dashboardName: string;
  layout?: Record<string, any>;
  widgets?: Record<string, any>;
  defaultView?: boolean;
  permissions?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  version?: number;
}

export class AdminDashboard extends AggregateRoot<string> {
  private props: AdminDashboardProps;

  constructor(id: string, props: AdminDashboardProps) {
    super(id);
    this.props = {
      ...props,
      layout: props.layout || {},
      widgets: props.widgets || {},
      defaultView: props.defaultView ?? false,
      permissions: props.permissions || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get dashboardName(): string {
    return this.props.dashboardName;
  }
  get layout(): Record<string, any> {
    return this.props.layout || {};
  }
  get widgets(): Record<string, any> {
    return this.props.widgets || {};
  }
  get defaultView(): boolean {
    return this.props.defaultView ?? false;
  }
  get permissions(): Record<string, any> {
    return this.props.permissions || {};
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }
  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }
  get version(): number {
    return this.props.version || 1;
  }

  public static create(
    id: string,
    props: Omit<AdminDashboardProps, 'createdAt' | 'updatedAt' | 'version'>,
    userId?: string,
  ): AdminDashboard {
    const dashboard = new AdminDashboard(id, props);
    dashboard.emitUpdated(userId);
    return dashboard;
  }

  private touch(): void {
    this.props.updatedAt = new Date();
    this.props.version = (this.props.version || 1) + 1;
  }

  private emitUpdated(userId?: string): void {
    this.addDomainEvent(
      new AdminDashboardUpdatedEvent(this.tenantId, this.id, userId),
    );
  }

  public rename(dashboardName: string, userId?: string): void {
    this.props.dashboardName = dashboardName;
    this.touch();
    this.emitUpdated(userId);
  }

  public updateLayout(layout: Record<string, any>, userId?: string): void {
    this.props.layout = layout;
    this.touch();
    this.emitUpdated(userId);
  }

  public updateWidgets(widgets: Record<string, any>, userId?: string): void {
    this.props.widgets = widgets;
    this.touch();
    this.emitUpdated(userId);
  }

  public updatePermissions(
    permissions: Record<string, any>,
    userId?: string,
  ): void {
    this.props.permissions = permissions;
    this.touch();
    this.emitUpdated(userId);
  }

  public setAsDefault(userId?: string): void {
    this.props.defaultView = true;
    this.touch();
    this.emitUpdated(userId);
  }

  public unsetDefault(): void {
    this.props.defaultView = false;
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      dashboardName: this.dashboardName,
      layout: this.layout,
      widgets: this.widgets,
      defaultView: this.defaultView,
      permissions: this.permissions,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
