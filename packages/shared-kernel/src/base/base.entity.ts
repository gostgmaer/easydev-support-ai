import { AggregateRoot } from '../ddd/aggregate-root';

export abstract class BaseEntity extends AggregateRoot<string> {
  public tenantId: string;
  public createdAt: Date;
  public updatedAt: Date;
  public createdBy?: string;
  public updatedBy?: string;
  public deletedAt: Date | null;
  public version: number;

  constructor(id: string, tenantId: string) {
    super(id);
    this.tenantId = tenantId;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.deletedAt = null;
    this.version = 1;
  }
}
