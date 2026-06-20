import { Entity } from '@easydev/shared-kernel';

export interface TicketTagProps {
  tenantId: string;
  ticketId: string;
  tag: string;
  color?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class TicketTag extends Entity<string> {
  private props: TicketTagProps;

  constructor(id: string, props: TicketTagProps) {
    super(id);
    this.props = {
      ...props,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get ticketId(): string {
    return this.props.ticketId;
  }
  get tag(): string {
    return this.props.tag;
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

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      ticketId: this.ticketId,
      tag: this.tag,
      color: this.color,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
