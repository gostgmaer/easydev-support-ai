import { Entity } from '@easydev/shared-kernel';

export interface MessageTemplateProps {
  tenantId: string;
  name: string;
  channelType?: string;
  category?: string;
  content: string;
  contentHtml?: string;
  variables?: Record<string, any>;
  language: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class MessageTemplate extends Entity<string> {
  private props: MessageTemplateProps;

  constructor(id: string, props: MessageTemplateProps) {
    super(id);
    this.props = {
      ...props,
      language: props.language || 'en',
      isActive: props.isActive ?? true,
      variables: props.variables || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get name(): string {
    return this.props.name;
  }
  get channelType(): string | undefined {
    return this.props.channelType;
  }
  get category(): string | undefined {
    return this.props.category;
  }
  get content(): string {
    return this.props.content;
  }
  get contentHtml(): string | undefined {
    return this.props.contentHtml;
  }
  get variables(): Record<string, any> | undefined {
    return this.props.variables;
  }
  get language(): string {
    return this.props.language;
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

  public update(
    props: Partial<
      Pick<
        MessageTemplateProps,
        | 'channelType'
        | 'category'
        | 'content'
        | 'contentHtml'
        | 'variables'
        | 'language'
        | 'isActive'
      >
    >,
  ): void {
    this.props = { ...this.props, ...props, updatedAt: new Date() };
  }

  public deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  /**
   * Resolves `{{variable}}` placeholders against the supplied values.
   */
  public render(variables: Record<string, any>): string {
    let resolved = this.props.content;
    for (const [key, val] of Object.entries(variables)) {
      resolved = resolved.replace(
        new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'),
        String(val),
      );
    }
    return resolved;
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      channelType: this.channelType,
      category: this.category,
      content: this.content,
      contentHtml: this.contentHtml,
      variables: this.variables,
      language: this.language,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
