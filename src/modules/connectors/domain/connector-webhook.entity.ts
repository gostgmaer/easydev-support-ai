import { Entity } from '@easydev/shared-kernel';

export interface ConnectorWebhookProps {
  tenantId: string;
  connectorId: string;
  instanceId?: string;
  url: string;
  secret?: string;
  signatureHeader?: string;
  events?: string[];
  status?: string;
  lastTriggeredAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class ConnectorWebhook extends Entity<string> {
  private props: ConnectorWebhookProps;

  constructor(id: string, props: ConnectorWebhookProps) {
    super(id);
    this.props = {
      ...props,
      signatureHeader: props.signatureHeader || 'x-signature',
      events: props.events || [],
      status: props.status || 'ACTIVE',
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get connectorId(): string {
    return this.props.connectorId;
  }
  get instanceId(): string | undefined {
    return this.props.instanceId;
  }
  get url(): string {
    return this.props.url;
  }
  get secret(): string | undefined {
    return this.props.secret;
  }
  get signatureHeader(): string {
    return this.props.signatureHeader || 'x-signature';
  }
  get events(): string[] {
    return this.props.events || [];
  }
  get status(): string {
    return this.props.status || 'ACTIVE';
  }
  get lastTriggeredAt(): Date | undefined {
    return this.props.lastTriggeredAt;
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

  public subscribesTo(event: string): boolean {
    const events = this.props.events || [];
    return (
      events.length === 0 || events.includes(event) || events.includes('*')
    );
  }

  public markTriggered(at: Date = new Date()): void {
    this.props.lastTriggeredAt = at;
    this.props.updatedAt = new Date();
  }

  public update(
    props: Partial<
      Pick<
        ConnectorWebhookProps,
        'url' | 'secret' | 'signatureHeader' | 'events' | 'status'
      >
    >,
  ): void {
    this.props = { ...this.props, ...props, updatedAt: new Date() };
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      connectorId: this.connectorId,
      instanceId: this.instanceId,
      url: this.url,
      signatureHeader: this.signatureHeader,
      events: this.events,
      status: this.status,
      lastTriggeredAt: this.lastTriggeredAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
