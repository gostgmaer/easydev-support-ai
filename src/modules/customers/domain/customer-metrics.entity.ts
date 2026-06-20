import { Entity } from '@easydev/shared-kernel';

export interface CustomerMetricsProps {
  tenantId: string;
  customerId: string;
  totalConversations: number;
  totalTickets: number;
  totalOrders: number;
  totalSpend: number;
  averageCsat: number;
  averageResponseTime: number; // in seconds
  averageResolutionTime: number; // in seconds
  sentimentScore: number; // -1.0 to 1.0
  lifetimeValue: number;
  riskScore: number; // 0.0 to 100.0
  vipStatus: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CustomerMetrics extends Entity<string> {
  private props: CustomerMetricsProps;

  constructor(id: string, props: CustomerMetricsProps) {
    super(id);
    this.props = {
      ...props,
      totalConversations: props.totalConversations ?? 0,
      totalTickets: props.totalTickets ?? 0,
      totalOrders: props.totalOrders ?? 0,
      totalSpend: props.totalSpend ?? 0,
      averageCsat: props.averageCsat ?? 0,
      averageResponseTime: props.averageResponseTime ?? 0,
      averageResolutionTime: props.averageResolutionTime ?? 0,
      sentimentScore: props.sentimentScore ?? 0,
      lifetimeValue: props.lifetimeValue ?? 0,
      riskScore: props.riskScore ?? 0,
      vipStatus: props.vipStatus ?? false,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string { return this.props.tenantId; }
  get customerId(): string { return this.props.customerId; }
  get totalConversations(): number { return this.props.totalConversations; }
  get totalTickets(): number { return this.props.totalTickets; }
  get totalOrders(): number { return this.props.totalOrders; }
  get totalSpend(): number { return this.props.totalSpend; }
  get averageCsat(): number { return this.props.averageCsat; }
  get averageResponseTime(): number { return this.props.averageResponseTime; }
  get averageResolutionTime(): number { return this.props.averageResolutionTime; }
  get sentimentScore(): number { return this.props.sentimentScore; }
  get lifetimeValue(): number { return this.props.lifetimeValue; }
  get riskScore(): number { return this.props.riskScore; }
  get vipStatus(): boolean { return this.props.vipStatus; }
  get createdAt(): Date { return this.props.createdAt!; }
  get updatedAt(): Date { return this.props.updatedAt!; }

  public update(props: Partial<Omit<CustomerMetricsProps, 'tenantId' | 'customerId' | 'createdAt'>>): void {
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
      customerId: this.customerId,
      totalConversations: this.totalConversations,
      totalTickets: this.totalTickets,
      totalOrders: this.totalOrders,
      totalSpend: this.totalSpend,
      averageCsat: this.averageCsat,
      averageResponseTime: this.averageResponseTime,
      averageResolutionTime: this.averageResolutionTime,
      sentimentScore: this.sentimentScore,
      lifetimeValue: this.lifetimeValue,
      riskScore: this.riskScore,
      vipStatus: this.vipStatus,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
