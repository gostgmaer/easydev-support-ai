import { AggregateRoot } from '@easydev/shared-kernel';
import { AgentTypeEnum, AgentStatusEnum } from './value-objects';

export interface AiAgentProfileProps {
  knowledgeScope?: Record<string, any>;
  connectorScope?: Record<string, any>;
  languageSupport?: string[];
  escalationRules?: Record<string, any>;
  configuration?: Record<string, any>;
}

export interface AiModelConfigurationProps {
  modelName: string;
  provider: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  presencePenalty: number;
  frequencyPenalty: number;
  stopSequences?: string[];
}

export interface AiAgentProps {
  tenantId: string;
  name: string;
  description?: string;
  agentType: AgentTypeEnum;
  status: AgentStatusEnum;
  defaultWorkflow?: string;
  systemPromptReference?: string;
  configuration?: Record<string, any>;
  profile?: AiAgentProfileProps;
  modelConfig?: AiModelConfigurationProps;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class AiAgent extends AggregateRoot<string> {
  private props: AiAgentProps;

  constructor(id: string, props: AiAgentProps) {
    super(id);
    this.props = {
      ...props,
      configuration: props.configuration || {},
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
  get agentType(): AgentTypeEnum {
    return this.props.agentType;
  }
  get status(): AgentStatusEnum {
    return this.props.status;
  }
  get defaultWorkflow(): string | undefined {
    return this.props.defaultWorkflow;
  }
  get systemPromptReference(): string | undefined {
    return this.props.systemPromptReference;
  }
  get configuration(): Record<string, any> | undefined {
    return this.props.configuration;
  }
  get profile(): AiAgentProfileProps | undefined {
    return this.props.profile;
  }
  get modelConfig(): AiModelConfigurationProps | undefined {
    return this.props.modelConfig;
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

  public static create(
    id: string,
    props: Omit<AiAgentProps, 'createdAt' | 'updatedAt' | 'version'>,
  ): AiAgent {
    const agent = new AiAgent(id, props);
    return agent;
  }

  public update(props: Partial<Pick<AiAgentProps, 'name' | 'description' | 'status' | 'defaultWorkflow' | 'systemPromptReference' | 'configuration'>>): void {
    this.props = {
      ...this.props,
      ...props,
      updatedAt: new Date(),
    };
  }

  public setProfile(profile: AiAgentProfileProps): void {
    this.props.profile = profile;
    this.props.updatedAt = new Date();
  }

  public setModelConfig(modelConfig: AiModelConfigurationProps): void {
    this.props.modelConfig = modelConfig;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      description: this.description,
      agentType: this.agentType,
      status: this.status,
      defaultWorkflow: this.defaultWorkflow,
      systemPromptReference: this.systemPromptReference,
      configuration: this.configuration,
      profile: this.profile,
      modelConfig: this.modelConfig,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
