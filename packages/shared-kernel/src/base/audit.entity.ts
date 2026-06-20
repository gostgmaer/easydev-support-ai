import { BaseEntity } from './base.entity';

export abstract class AuditEntity extends BaseEntity {
  public action!: string;
  public details?: string;
  public ipAddress?: string;
  public userAgent?: string;
}
