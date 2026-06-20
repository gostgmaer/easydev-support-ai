import { Entity } from '@easydev/shared-kernel';
import {
  IncidentStatus,
  IncidentStatusEnum,
  IncidentSeverityEnum,
} from './value-objects';

export interface OperationalIncidentProps {
  tenantId: string;
  title: string;
  severity: IncidentSeverityEnum;
  status: IncidentStatus;
  affectedService: string;
  description?: string;
  startedAt?: Date;
  resolvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class OperationalIncident extends Entity<string> {
  private props: OperationalIncidentProps;

  constructor(id: string, props: OperationalIncidentProps) {
    super(id);
    this.props = {
      ...props,
      startedAt: props.startedAt || new Date(),
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get title(): string {
    return this.props.title;
  }
  get severity(): IncidentSeverityEnum {
    return this.props.severity;
  }
  get status(): IncidentStatus {
    return this.props.status;
  }
  get affectedService(): string {
    return this.props.affectedService;
  }
  get description(): string | undefined {
    return this.props.description;
  }
  get startedAt(): Date {
    return this.props.startedAt!;
  }
  get resolvedAt(): Date | undefined {
    return this.props.resolvedAt;
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
      title: string;
      severity: IncidentSeverityEnum;
      affectedService: string;
      description?: string;
    },
  ): OperationalIncident {
    return new OperationalIncident(id, {
      ...props,
      status: IncidentStatus.create(IncidentStatusEnum.OPEN),
    });
  }

  public updateStatus(status: IncidentStatusEnum): void {
    this.props.status = IncidentStatus.create(status);
    this.props.updatedAt = new Date();
    if (status === IncidentStatusEnum.RESOLVED) {
      this.props.resolvedAt = new Date();
    }
  }

  public resolve(): void {
    this.updateStatus(IncidentStatusEnum.RESOLVED);
  }

  public escalate(severity: IncidentSeverityEnum): void {
    this.props.severity = severity;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      title: this.title,
      severity: this.severity,
      status: this.status.value,
      affectedService: this.affectedService,
      description: this.description,
      startedAt: this.startedAt,
      resolvedAt: this.resolvedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
