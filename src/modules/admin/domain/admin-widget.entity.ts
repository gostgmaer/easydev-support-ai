import { Entity } from '@easydev/shared-kernel';
import { AdminWidgetType, AdminWidgetTypeEnum } from './value-objects';

export interface AdminWidgetProps {
  tenantId: string;
  dashboardId: string;
  widgetType: AdminWidgetType;
  title: string;
  position?: Record<string, any>;
  configuration?: Record<string, any>;
  refreshIntervalSeconds?: number;
  isEnabled?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class AdminWidget extends Entity<string> {
  private props: AdminWidgetProps;

  constructor(id: string, props: AdminWidgetProps) {
    super(id);
    this.props = {
      ...props,
      refreshIntervalSeconds: props.refreshIntervalSeconds ?? 60,
      isEnabled: props.isEnabled ?? true,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get dashboardId(): string {
    return this.props.dashboardId;
  }
  get widgetType(): AdminWidgetType {
    return this.props.widgetType;
  }
  get title(): string {
    return this.props.title;
  }
  get position(): Record<string, any> | undefined {
    return this.props.position;
  }
  get configuration(): Record<string, any> | undefined {
    return this.props.configuration;
  }
  get refreshIntervalSeconds(): number {
    return this.props.refreshIntervalSeconds ?? 60;
  }
  get isEnabled(): boolean {
    return this.props.isEnabled ?? true;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }
  get version(): number {
    return this.props.version || 1;
  }

  public static create(
    id: string,
    props: {
      tenantId: string;
      dashboardId: string;
      widgetType: AdminWidgetTypeEnum;
      title: string;
      position?: Record<string, any>;
      configuration?: Record<string, any>;
      refreshIntervalSeconds?: number;
    },
  ): AdminWidget {
    return new AdminWidget(id, {
      ...props,
      widgetType: AdminWidgetType.create(props.widgetType),
    });
  }

  public reposition(position: Record<string, any>): void {
    this.props.position = position;
    this.props.updatedAt = new Date();
  }

  public configure(configuration: Record<string, any>): void {
    this.props.configuration = configuration;
    this.props.updatedAt = new Date();
  }

  public setRefreshInterval(seconds: number): void {
    if (seconds < 5) {
      throw new Error('Widget refresh interval must be at least 5 seconds');
    }
    this.props.refreshIntervalSeconds = seconds;
    this.props.updatedAt = new Date();
  }

  public enable(): void {
    this.props.isEnabled = true;
    this.props.updatedAt = new Date();
  }

  public disable(): void {
    this.props.isEnabled = false;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      dashboardId: this.dashboardId,
      widgetType: this.widgetType.value,
      title: this.title,
      position: this.position,
      configuration: this.configuration,
      refreshIntervalSeconds: this.refreshIntervalSeconds,
      isEnabled: this.isEnabled,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
