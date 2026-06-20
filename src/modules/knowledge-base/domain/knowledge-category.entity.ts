import { Entity } from '@easydev/shared-kernel';

export interface KnowledgeCategoryProps {
  tenantId: string;
  name: string;
  description?: string;
  parentCategoryId?: string;
  color?: string;
  sortOrder?: number;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class KnowledgeCategory extends Entity<string> {
  private props: KnowledgeCategoryProps;

  constructor(id: string, props: KnowledgeCategoryProps) {
    super(id);
    this.props = {
      ...props,
      sortOrder: props.sortOrder ?? 0,
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
  get parentCategoryId(): string | undefined {
    return this.props.parentCategoryId;
  }
  get color(): string | undefined {
    return this.props.color;
  }
  get sortOrder(): number {
    return this.props.sortOrder ?? 0;
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

  public update(props: Partial<Pick<KnowledgeCategoryProps, 'name' | 'description' | 'parentCategoryId' | 'color' | 'sortOrder'>>): void {
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
      parentCategoryId: this.parentCategoryId,
      color: this.color,
      sortOrder: this.sortOrder,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
