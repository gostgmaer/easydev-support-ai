import { Entity } from '@easydev/shared-kernel';
import { TicketCategory } from './value-objects';

export interface TicketCategoryDefinitionProps {
  tenantId: string;
  name: TicketCategory;
  description?: string;
  color?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Catalog entry backing the ticket_categories table (Technical, Billing,
 * Refund, Sales, Complaint, Feature Request, ...).
 */
export class TicketCategoryDefinition extends Entity<string> {
  private props: TicketCategoryDefinitionProps;

  constructor(id: string, props: TicketCategoryDefinitionProps) {
    super(id);
    this.props = {
      ...props,
      isActive: props.isActive ?? true,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get name(): TicketCategory {
    return this.props.name;
  }
  get description(): string | undefined {
    return this.props.description;
  }
  get color(): string | undefined {
    return this.props.color;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public update(props: {
    name?: TicketCategory;
    description?: string;
    color?: string;
    isActive?: boolean;
  }): void {
    if (props.name) this.props.name = props.name;
    if (props.description !== undefined)
      this.props.description = props.description;
    if (props.color !== undefined) this.props.color = props.color;
    if (props.isActive !== undefined) this.props.isActive = props.isActive;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name.value,
      description: this.description,
      color: this.color,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
