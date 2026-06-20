import { Entity } from '@easydev/shared-kernel';

export interface SavedViewProps {
  tenantId: string;
  userId: string;
  name: string;
  filterId: string;
  sortConfiguration?: Record<string, any>;
  columnConfiguration?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class SavedView extends Entity<string> {
  private props: SavedViewProps;

  constructor(id: string, props: SavedViewProps) {
    super(id);
    this.props = {
      ...props,
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
  get filterId(): string {
    return this.props.filterId;
  }
  get sortConfiguration(): Record<string, any> | undefined {
    return this.props.sortConfiguration;
  }
  get columnConfiguration(): Record<string, any> | undefined {
    return this.props.columnConfiguration;
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
    filterId?: string;
    sortConfiguration?: Record<string, any>;
    columnConfiguration?: Record<string, any>;
  }): void {
    if (props.name) this.props.name = props.name;
    if (props.filterId) this.props.filterId = props.filterId;
    if (props.sortConfiguration !== undefined)
      this.props.sortConfiguration = props.sortConfiguration;
    if (props.columnConfiguration !== undefined)
      this.props.columnConfiguration = props.columnConfiguration;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      userId: this.userId,
      name: this.name,
      filterId: this.filterId,
      sortConfiguration: this.sortConfiguration,
      columnConfiguration: this.columnConfiguration,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
