import { Entity } from '@easydev/shared-kernel';
import { AnnouncementSeverityEnum } from './value-objects';

export interface AnnouncementProps {
  tenantId: string;
  title: string;
  message: string;
  severity: AnnouncementSeverityEnum;
  audience: string;
  isActive?: boolean;
  startsAt?: Date;
  endsAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class Announcement extends Entity<string> {
  private props: AnnouncementProps;

  constructor(id: string, props: AnnouncementProps) {
    super(id);
    this.props = {
      ...props,
      isActive: props.isActive ?? true,
      startsAt: props.startsAt || new Date(),
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
  get message(): string {
    return this.props.message;
  }
  get severity(): AnnouncementSeverityEnum {
    return this.props.severity;
  }
  get audience(): string {
    return this.props.audience;
  }
  get isActive(): boolean {
    return this.props.isActive ?? true;
  }
  get startsAt(): Date {
    return this.props.startsAt!;
  }
  get endsAt(): Date | undefined {
    return this.props.endsAt;
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
      message: string;
      severity?: AnnouncementSeverityEnum;
      audience?: string;
      startsAt?: Date;
      endsAt?: Date;
    },
  ): Announcement {
    return new Announcement(id, {
      ...props,
      severity: props.severity || AnnouncementSeverityEnum.INFO,
      audience: props.audience || 'ALL',
    });
  }

  public isCurrentlyVisible(at: Date = new Date()): boolean {
    if (!this.isActive) return false;
    if (this.startsAt.getTime() > at.getTime()) return false;
    if (this.endsAt && this.endsAt.getTime() <= at.getTime()) return false;
    return true;
  }

  public deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      title: this.title,
      message: this.message,
      severity: this.severity,
      audience: this.audience,
      isActive: this.isActive,
      startsAt: this.startsAt,
      endsAt: this.endsAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
