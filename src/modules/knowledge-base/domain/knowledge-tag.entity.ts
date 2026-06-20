import { Entity } from '@easydev/shared-kernel';

export interface KnowledgeTagProps {
  tenantId: string;
  name: string;
  description?: string;
  color?: string;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class KnowledgeTag extends Entity<string> {
  private props: KnowledgeTagProps;

  constructor(id: string, props: KnowledgeTagProps) {
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
  get name(): string {
    return this.props.name;
  }
  get description(): string | undefined {
    return this.props.description;
  }
  get color(): string | undefined {
    return this.props.color;
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

  public update(
    props: Partial<Pick<KnowledgeTagProps, 'description' | 'color'>>,
  ): void {
    this.props = {
      ...this.props,
      ...props,
      updatedAt: new Date(),
      version: (this.props.version || 1) + 1,
    };
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      description: this.description,
      color: this.color,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
