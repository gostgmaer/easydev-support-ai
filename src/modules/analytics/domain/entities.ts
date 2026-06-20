import { AggregateRoot, Entity } from '@easydev/shared-kernel';

export interface AnalyticsEventProps {
  tenantId: string;
  eventName: string;
  aggregateType: string;
  aggregateId: string;
  userId?: string;
  timestamp: Date;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt?: Date;
}

export class AnalyticsEvent extends AggregateRoot<string> {
  private props: AnalyticsEventProps;

  constructor(id: string, props: AnalyticsEventProps) {
    super(id);
    this.props = {
      ...props,
      metadata: props.metadata || {},
      createdAt: props.createdAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get eventName(): string {
    return this.props.eventName;
  }
  get aggregateType(): string {
    return this.props.aggregateType;
  }
  get aggregateId(): string {
    return this.props.aggregateId;
  }
  get userId(): string | undefined {
    return this.props.userId;
  }
  get timestamp(): Date {
    return this.props.timestamp;
  }
  get payload(): Record<string, any> {
    return this.props.payload;
  }
  get metadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }

  public static create(id: string, props: AnalyticsEventProps): AnalyticsEvent {
    return new AnalyticsEvent(id, props);
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      eventName: this.eventName,
      aggregateType: this.aggregateType,
      aggregateId: this.aggregateId,
      userId: this.userId,
      timestamp: this.timestamp,
      payload: this.payload,
      metadata: this.metadata,
      createdAt: this.createdAt,
    };
  }
}

export interface AnalyticsReportProps {
  tenantId: string;
  name: string;
  description?: string;
  reportType: string;
  timeRange: string;
  filters?: Record<string, any>;
  parameters?: Record<string, any>;
  data?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AnalyticsReport extends Entity<string> {
  private props: AnalyticsReportProps;

  constructor(id: string, props: AnalyticsReportProps) {
    super(id);
    this.props = {
      ...props,
      filters: props.filters || {},
      parameters: props.parameters || {},
      data: props.data || {},
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
  get description(): string | undefined {
    return this.props.description;
  }
  get reportType(): string {
    return this.props.reportType;
  }
  get timeRange(): string {
    return this.props.timeRange;
  }
  get filters(): Record<string, any> | undefined {
    return this.props.filters;
  }
  get parameters(): Record<string, any> | undefined {
    return this.props.parameters;
  }
  get data(): Record<string, any> | undefined {
    return this.props.data;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public updateData(data: Record<string, any>): void {
    this.props.data = data;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      description: this.description,
      reportType: this.reportType,
      timeRange: this.timeRange,
      filters: this.filters,
      parameters: this.parameters,
      data: this.data,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface AnalyticsMetricProps {
  tenantId: string;
  metricType: string;
  timestamp: Date;
  value: number;
  dimensions?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AnalyticsMetric extends Entity<string> {
  private props: AnalyticsMetricProps;

  constructor(id: string, props: AnalyticsMetricProps) {
    super(id);
    this.props = {
      ...props,
      dimensions: props.dimensions || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get metricType(): string {
    return this.props.metricType;
  }
  get timestamp(): Date {
    return this.props.timestamp;
  }
  get value(): number {
    return this.props.value;
  }
  get dimensions(): Record<string, any> | undefined {
    return this.props.dimensions;
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
      metricType: this.metricType,
      timestamp: this.timestamp,
      value: this.value,
      dimensions: this.dimensions,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface AnalyticsScheduleProps {
  tenantId: string;
  reportId: string;
  name: string;
  cronExpression: string;
  timezone: string;
  exportFormat: string;
  recipients: string[];
  isActive: boolean;
  nextRunAt?: Date;
  lastRunAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AnalyticsSchedule extends Entity<string> {
  private props: AnalyticsScheduleProps;

  constructor(id: string, props: AnalyticsScheduleProps) {
    super(id);
    this.props = {
      ...props,
      isActive: props.isActive !== undefined ? props.isActive : true,
      timezone: props.timezone || 'UTC',
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get reportId(): string {
    return this.props.reportId;
  }
  get name(): string {
    return this.props.name;
  }
  get cronExpression(): string {
    return this.props.cronExpression;
  }
  get timezone(): string {
    return this.props.timezone;
  }
  get exportFormat(): string {
    return this.props.exportFormat;
  }
  get recipients(): string[] {
    return this.props.recipients;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get nextRunAt(): Date | undefined {
    return this.props.nextRunAt;
  }
  get lastRunAt(): Date | undefined {
    return this.props.lastRunAt;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public updateRun(nextRun: Date): void {
    this.props.lastRunAt = new Date();
    this.props.nextRunAt = nextRun;
    this.props.updatedAt = new Date();
  }

  public toggle(active: boolean): void {
    this.props.isActive = active;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      reportId: this.reportId,
      name: this.name,
      cronExpression: this.cronExpression,
      timezone: this.timezone,
      exportFormat: this.exportFormat,
      recipients: this.recipients,
      isActive: this.isActive,
      nextRunAt: this.nextRunAt,
      lastRunAt: this.lastRunAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
