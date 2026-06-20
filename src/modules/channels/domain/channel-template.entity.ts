import { Entity } from '@easydev/shared-kernel';

export interface ChannelTemplateProps {
  tenantId: string;
  channelId: string;
  templateName: string;
  templateType: string; // TEXT, IMAGE, BUTTONS
  templateContent: string;
  variables?: Record<string, any>;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class ChannelTemplate extends Entity<string> {
  private props: ChannelTemplateProps;

  constructor(id: string, props: ChannelTemplateProps) {
    super(id);
    this.props = {
      ...props,
      variables: props.variables || {},
      isActive: props.isActive !== false,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get channelId(): string {
    return this.props.channelId;
  }
  get templateName(): string {
    return this.props.templateName;
  }
  get templateType(): string {
    return this.props.templateType;
  }
  get templateContent(): string {
    return this.props.templateContent;
  }
  get variables(): Record<string, any> {
    return this.props.variables || {};
  }
  get isActive(): boolean {
    return this.props.isActive !== false;
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
      Omit<ChannelTemplateProps, 'tenantId' | 'channelId' | 'createdAt'>
    >,
  ): void {
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
      channelId: this.channelId,
      templateName: this.templateName,
      templateType: this.templateType,
      templateContent: this.templateContent,
      variables: this.variables,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
