import { Entity } from '@easydev/shared-kernel';

export interface CustomerSegmentProps {
  tenantId: string;
  segmentName: string;
  segmentType: 'STATIC' | 'DYNAMIC';
  rules?: any;
  description?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CustomerSegment extends Entity<string> {
  private props: CustomerSegmentProps;

  constructor(id: string, props: CustomerSegmentProps) {
    super(id);
    this.props = {
      ...props,
      isActive: props.isActive ?? true,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string { return this.props.tenantId; }
  get segmentName(): string { return this.props.segmentName; }
  get segmentType(): 'STATIC' | 'DYNAMIC' { return this.props.segmentType; }
  get rules(): any { return this.props.rules; }
  get description(): string | undefined { return this.props.description; }
  get isActive(): boolean { return this.props.isActive; }
  get createdAt(): Date { return this.props.createdAt!; }
  get updatedAt(): Date { return this.props.updatedAt!; }

  public update(props: Partial<Omit<CustomerSegmentProps, 'tenantId' | 'createdAt'>>): void {
    this.props = {
      ...this.props,
      ...props,
      updatedAt: new Date(),
    };
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      segmentName: this.segmentName,
      segmentType: this.segmentType,
      rules: this.rules,
      description: this.description,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
