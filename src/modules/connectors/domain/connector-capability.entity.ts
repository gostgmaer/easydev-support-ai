import { Entity } from '@easydev/shared-kernel';
import { CapabilityType } from './value-objects';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ConnectorCapabilityProps {
  tenantId: string;
  connectorId: string;
  capabilityType: CapabilityType;
  name: string;
  description?: string;
  method: HttpMethod;
  path: string;
  requestMapping?: Record<string, any>;
  responseMapping?: Record<string, any>;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  enabled?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class ConnectorCapability extends Entity<string> {
  private props: ConnectorCapabilityProps;

  constructor(id: string, props: ConnectorCapabilityProps) {
    super(id);
    this.props = {
      ...props,
      enabled: props.enabled ?? true,
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
  get capabilityType(): CapabilityType {
    return this.props.capabilityType;
  }
  get name(): string {
    return this.props.name;
  }
  get description(): string | undefined {
    return this.props.description;
  }
  get method(): HttpMethod {
    return this.props.method;
  }
  get path(): string {
    return this.props.path;
  }
  get requestMapping(): Record<string, any> | undefined {
    return this.props.requestMapping;
  }
  get responseMapping(): Record<string, any> | undefined {
    return this.props.responseMapping;
  }
  get inputSchema(): Record<string, any> | undefined {
    return this.props.inputSchema;
  }
  get outputSchema(): Record<string, any> | undefined {
    return this.props.outputSchema;
  }
  get enabled(): boolean {
    return this.props.enabled ?? true;
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
    props: Partial<
      Pick<
        ConnectorCapabilityProps,
        | 'name'
        | 'description'
        | 'method'
        | 'path'
        | 'requestMapping'
        | 'responseMapping'
        | 'inputSchema'
        | 'outputSchema'
        | 'enabled'
      >
    >,
  ): void {
    this.props = { ...this.props, ...props, updatedAt: new Date() };
  }

  public disable(): void {
    this.props.enabled = false;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      connectorId: this.connectorId,
      capabilityType: this.capabilityType.value,
      name: this.name,
      description: this.description,
      method: this.method,
      path: this.path,
      requestMapping: this.requestMapping,
      responseMapping: this.responseMapping,
      inputSchema: this.inputSchema,
      outputSchema: this.outputSchema,
      enabled: this.enabled,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
