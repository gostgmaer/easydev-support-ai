import { BaseEntity } from './base.entity';
export declare abstract class AuditEntity extends BaseEntity {
  action: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}
