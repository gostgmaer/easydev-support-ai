import { Entity } from '@easydev/shared-kernel';

export interface AuditViewProps {
  tenantId: string;
  userId: string;
  name: string;
  filterDefinition: Record<string, any>;
  isShared?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class AuditView extends Entity<string> {
  private props: AuditViewProps;

  constructor(id: string, props: AuditViewProps) {
    super(id);
    this.props = {
      ...props,
      isShared: props.isShared ?? false,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get userId(): string {
    return this.props.userId;
  }
  get name(): string {
    return this.props.name;
  }
  get filterDefinition(): Record<string, any> {
    return this.props.filterDefinition;
  }
  get isShared(): boolean {
    return this.props.isShared ?? false;
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
      userId: string;
      name: string;
      filterDefinition: Record<string, any>;
      isShared?: boolean;
    },
  ): AuditView {
    return new AuditView(id, props);
  }

  public update(filterDefinition: Record<string, any>, isShared?: boolean): void {
    this.props.filterDefinition = filterDefinition;
    if (isShared !== undefined) this.props.isShared = isShared;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      userId: this.userId,
      name: this.name,
      filterDefinition: this.filterDefinition,
      isShared: this.isShared,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
