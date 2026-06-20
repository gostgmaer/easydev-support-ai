import { Entity } from '@easydev/shared-kernel';

export interface KnowledgeSearchLogProps {
  tenantId: string;
  userId?: string;
  query: string;
  filters?: Record<string, any>;
  resultsCount: number;
  latencyMs: number;
  source: string; // API, AI_AGENT, WIDGET
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class KnowledgeSearchLog extends Entity<string> {
  private props: KnowledgeSearchLogProps;

  constructor(id: string, props: KnowledgeSearchLogProps) {
    super(id);
    this.props = {
      ...props,
      resultsCount: props.resultsCount ?? 0,
      latencyMs: props.latencyMs ?? 0,
      source: props.source || 'API',
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get userId(): string | undefined {
    return this.props.userId;
  }
  get query(): string {
    return this.props.query;
  }
  get filters(): Record<string, any> | undefined {
    return this.props.filters;
  }
  get resultsCount(): number {
    return this.props.resultsCount;
  }
  get latencyMs(): number {
    return this.props.latencyMs;
  }
  get source(): string {
    return this.props.source;
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

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      userId: this.userId,
      query: this.query,
      filters: this.filters,
      resultsCount: this.resultsCount,
      latencyMs: this.latencyMs,
      source: this.source,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
