import { Entity } from '@easydev/shared-kernel';

export interface InboxFilterProps {
  tenantId: string;
  name: string;
  filterDefinition: Record<string, any>;
  isSystem?: boolean;
  isShared?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class InboxFilter extends Entity<string> {
  private props: InboxFilterProps;

  constructor(id: string, props: InboxFilterProps) {
    super(id);
    this.props = {
      ...props,
      isSystem: props.isSystem ?? false,
      isShared: props.isShared ?? false,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get name(): string {
    return this.props.name;
  }
  get filterDefinition(): Record<string, any> {
    return this.props.filterDefinition;
  }
  get isSystem(): boolean {
    return this.props.isSystem ?? false;
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

  public update(props: {
    name?: string;
    filterDefinition?: Record<string, any>;
    isShared?: boolean;
  }): void {
    if (props.name) this.props.name = props.name;
    if (props.filterDefinition)
      this.props.filterDefinition = props.filterDefinition;
    if (props.isShared !== undefined) this.props.isShared = props.isShared;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      filterDefinition: this.filterDefinition,
      isSystem: this.isSystem,
      isShared: this.isShared,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
