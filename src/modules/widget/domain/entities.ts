import { AggregateRoot, Entity } from '@easydev/shared-kernel';

// 1. Widget Config
export interface WidgetConfigProps {
  tenantId: string;
  widgetName: string;
  theme: string;
  primaryColor: string;
  secondaryColor: string;
  position: string;
  welcomeMessage?: string;
  offlineMessage?: string;
  avatarUrl?: string;
  customCss?: string;
  customJs?: string;
  allowedDomains: string[];
  /** Secret used to verify HMAC-signed identified-visitor requests
   * (POST /v1/widget/auth/verify) - never exposed via toJSON()/the public
   * config endpoint, only toAdminJSON(). */
  identityVerificationSecret?: string;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class WidgetConfig extends AggregateRoot<string> {
  private props: WidgetConfigProps;

  constructor(id: string, props: WidgetConfigProps) {
    super(id);
    this.props = {
      ...props,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get widgetName(): string {
    return this.props.widgetName;
  }
  get theme(): string {
    return this.props.theme;
  }
  get primaryColor(): string {
    return this.props.primaryColor;
  }
  get secondaryColor(): string {
    return this.props.secondaryColor;
  }
  get position(): string {
    return this.props.position;
  }
  get welcomeMessage(): string | undefined {
    return this.props.welcomeMessage;
  }
  get offlineMessage(): string | undefined {
    return this.props.offlineMessage;
  }
  get avatarUrl(): string | undefined {
    return this.props.avatarUrl;
  }
  get customCss(): string | undefined {
    return this.props.customCss;
  }
  get customJs(): string | undefined {
    return this.props.customJs;
  }
  get allowedDomains(): string[] {
    return this.props.allowedDomains;
  }
  get identityVerificationSecret(): string | undefined {
    return this.props.identityVerificationSecret;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }
  get version(): number {
    return this.props.version!;
  }

  public update(props: Partial<Omit<WidgetConfigProps, 'tenantId'>>) {
    this.props = {
      ...this.props,
      ...props,
      updatedAt: new Date(),
    };
  }

  public rotateIdentitySecret(secret: string): void {
    this.props.identityVerificationSecret = secret;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      widgetName: this.widgetName,
      theme: this.theme,
      primaryColor: this.primaryColor,
      secondaryColor: this.secondaryColor,
      position: this.position,
      welcomeMessage: this.welcomeMessage,
      offlineMessage: this.offlineMessage,
      avatarUrl: this.avatarUrl,
      customCss: this.customCss,
      customJs: this.customJs,
      allowedDomains: this.allowedDomains,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }

  /** Admin-only view - includes the identity verification secret. */
  public toAdminJSON() {
    return {
      ...this.toJSON(),
      identityVerificationSecret: this.identityVerificationSecret,
    };
  }
}

// 2. Widget Visitor
export interface WidgetVisitorProps {
  tenantId: string;
  anonymousId: string;
  customerId?: string;
  email?: string;
  phone?: string;
  name?: string;
  country?: string;
  city?: string;
  firstSeenAt?: Date;
  lastSeenAt?: Date;
  visitCount: number;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class WidgetVisitor extends AggregateRoot<string> {
  private props: WidgetVisitorProps;

  constructor(id: string, props: WidgetVisitorProps) {
    super(id);
    this.props = {
      ...props,
      firstSeenAt: props.firstSeenAt || new Date(),
      lastSeenAt: props.lastSeenAt || new Date(),
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get anonymousId(): string {
    return this.props.anonymousId;
  }
  get customerId(): string | undefined {
    return this.props.customerId;
  }
  get email(): string | undefined {
    return this.props.email;
  }
  get phone(): string | undefined {
    return this.props.phone;
  }
  get name(): string | undefined {
    return this.props.name;
  }
  get country(): string | undefined {
    return this.props.country;
  }
  get city(): string | undefined {
    return this.props.city;
  }
  get firstSeenAt(): Date {
    return this.props.firstSeenAt!;
  }
  get lastSeenAt(): Date {
    return this.props.lastSeenAt!;
  }
  get visitCount(): number {
    return this.props.visitCount;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }
  get version(): number {
    return this.props.version!;
  }

  public update(
    props: Partial<Omit<WidgetVisitorProps, 'tenantId' | 'anonymousId'>>,
  ) {
    this.props = {
      ...this.props,
      ...props,
      updatedAt: new Date(),
    };
  }

  public incrementVisit() {
    this.props.visitCount += 1;
    this.props.lastSeenAt = new Date();
    this.props.updatedAt = new Date();
  }

  public linkCustomer(customerId: string) {
    this.props.customerId = customerId;
    this.props.updatedAt = new Date();
  }

  public merge(other: WidgetVisitor) {
    this.props.email = this.props.email || other.email;
    this.props.phone = this.props.phone || other.phone;
    this.props.name = this.props.name || other.name;
    this.props.country = this.props.country || other.country;
    this.props.city = this.props.city || other.city;
    this.props.visitCount += other.visitCount;
    this.props.lastSeenAt = new Date();
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      anonymousId: this.anonymousId,
      customerId: this.customerId,
      email: this.email,
      phone: this.phone,
      name: this.name,
      country: this.country,
      city: this.city,
      firstSeenAt: this.firstSeenAt,
      lastSeenAt: this.lastSeenAt,
      visitCount: this.visitCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}

// 3. Widget Session
export interface WidgetSessionProps {
  tenantId: string;
  visitorId: string;
  sessionToken: string;
  startedAt?: Date;
  endedAt?: Date;
  ipAddressHash?: string;
  userAgent?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  referrer?: string;
  landingPage?: string;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class WidgetSession extends AggregateRoot<string> {
  private props: WidgetSessionProps;

  constructor(id: string, props: WidgetSessionProps) {
    super(id);
    this.props = {
      ...props,
      startedAt: props.startedAt || new Date(),
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get visitorId(): string {
    return this.props.visitorId;
  }
  get sessionToken(): string {
    return this.props.sessionToken;
  }
  get startedAt(): Date {
    return this.props.startedAt!;
  }
  get endedAt(): Date | undefined {
    return this.props.endedAt;
  }
  get ipAddressHash(): string | undefined {
    return this.props.ipAddressHash;
  }
  get userAgent(): string | undefined {
    return this.props.userAgent;
  }
  get deviceType(): string | undefined {
    return this.props.deviceType;
  }
  get browser(): string | undefined {
    return this.props.browser;
  }
  get os(): string | undefined {
    return this.props.os;
  }
  get referrer(): string | undefined {
    return this.props.referrer;
  }
  get landingPage(): string | undefined {
    return this.props.landingPage;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }
  get version(): number {
    return this.props.version!;
  }

  public end() {
    this.props.endedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      visitorId: this.visitorId,
      sessionToken: this.sessionToken,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      ipAddressHash: this.ipAddressHash,
      userAgent: this.userAgent,
      deviceType: this.deviceType,
      browser: this.browser,
      os: this.os,
      referrer: this.referrer,
      landingPage: this.landingPage,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}

// 4. Widget Identity
export interface WidgetIdentityProps {
  tenantId: string;
  visitorId: string;
  externalUserId: string;
  verificationMethod: string;
  verifiedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class WidgetIdentity extends Entity<string> {
  private props: WidgetIdentityProps;

  constructor(id: string, props: WidgetIdentityProps) {
    super(id);
    this.props = {
      ...props,
      verifiedAt: props.verifiedAt || new Date(),
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get visitorId(): string {
    return this.props.visitorId;
  }
  get externalUserId(): string {
    return this.props.externalUserId;
  }
  get verificationMethod(): string {
    return this.props.verificationMethod;
  }
  get verifiedAt(): Date {
    return this.props.verifiedAt!;
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
      visitorId: this.visitorId,
      externalUserId: this.externalUserId,
      verificationMethod: this.verificationMethod,
      verifiedAt: this.verifiedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// 5. Widget Lead
export interface WidgetLeadProps {
  tenantId: string;
  name?: string;
  email: string;
  phone?: string;
  company?: string;
  source: string;
  leadScore: number;
  status: string;
  capturedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class WidgetLead extends AggregateRoot<string> {
  private props: WidgetLeadProps;

  constructor(id: string, props: WidgetLeadProps) {
    super(id);
    this.props = {
      ...props,
      capturedAt: props.capturedAt || new Date(),
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get name(): string | undefined {
    return this.props.name;
  }
  get email(): string {
    return this.props.email;
  }
  get phone(): string | undefined {
    return this.props.phone;
  }
  get company(): string | undefined {
    return this.props.company;
  }
  get source(): string {
    return this.props.source;
  }
  get leadScore(): number {
    return this.props.leadScore;
  }
  get status(): string {
    return this.props.status;
  }
  get capturedAt(): Date {
    return this.props.capturedAt!;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }
  get version(): number {
    return this.props.version!;
  }

  public qualify(scoreChange: number) {
    this.props.leadScore += scoreChange;
    if (this.props.leadScore >= 50) {
      this.props.status = 'QUALIFIED';
    }
    this.props.updatedAt = new Date();
  }

  public updateStatus(status: string) {
    this.props.status = status;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      email: this.email,
      phone: this.phone,
      company: this.company,
      source: this.source,
      leadScore: this.leadScore,
      status: this.status,
      capturedAt: this.capturedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}

// 6. Widget Event
export interface WidgetEventProps {
  tenantId: string;
  sessionId: string;
  eventName: string;
  eventData?: Record<string, any>;
  createdAt?: Date;
}

export class WidgetEvent extends Entity<string> {
  private props: WidgetEventProps;

  constructor(id: string, props: WidgetEventProps) {
    super(id);
    this.props = {
      ...props,
      createdAt: props.createdAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get sessionId(): string {
    return this.props.sessionId;
  }
  get eventName(): string {
    return this.props.eventName;
  }
  get eventData(): Record<string, any> | undefined {
    return this.props.eventData;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      sessionId: this.sessionId,
      eventName: this.eventName,
      eventData: this.eventData,
      createdAt: this.createdAt,
    };
  }
}

// 7. Widget Page View
export interface WidgetPageViewProps {
  tenantId: string;
  sessionId: string;
  url: string;
  title?: string;
  timeSpentSeconds: number;
  createdAt?: Date;
}

export class WidgetPageView extends Entity<string> {
  private props: WidgetPageViewProps;

  constructor(id: string, props: WidgetPageViewProps) {
    super(id);
    this.props = {
      ...props,
      createdAt: props.createdAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get sessionId(): string {
    return this.props.sessionId;
  }
  get url(): string {
    return this.props.url;
  }
  get title(): string | undefined {
    return this.props.title;
  }
  get timeSpentSeconds(): number {
    return this.props.timeSpentSeconds;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }

  public incrementTime(seconds: number) {
    this.props.timeSpentSeconds += seconds;
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      sessionId: this.sessionId,
      url: this.url,
      title: this.title,
      timeSpentSeconds: this.timeSpentSeconds,
      createdAt: this.createdAt,
    };
  }
}

// 8. Widget Conversation
export interface WidgetConversationProps {
  tenantId: string;
  widgetSessionId: string;
  conversationId: string;
  linkedAt?: Date;
}

export class WidgetConversation extends Entity<string> {
  private props: WidgetConversationProps;

  constructor(id: string, props: WidgetConversationProps) {
    super(id);
    this.props = {
      ...props,
      linkedAt: props.linkedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get widgetSessionId(): string {
    return this.props.widgetSessionId;
  }
  get conversationId(): string {
    return this.props.conversationId;
  }
  get linkedAt(): Date {
    return this.props.linkedAt!;
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      widgetSessionId: this.widgetSessionId,
      conversationId: this.conversationId,
      linkedAt: this.linkedAt,
    };
  }
}

// 9. Widget Auth Token
export interface WidgetAuthTokenProps {
  tenantId: string;
  visitorId: string;
  tokenHash: string;
  expiresAt: Date;
  lastUsedAt?: Date;
}

export class WidgetAuthToken extends Entity<string> {
  private props: WidgetAuthTokenProps;

  constructor(id: string, props: WidgetAuthTokenProps) {
    super(id);
    this.props = {
      ...props,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get visitorId(): string {
    return this.props.visitorId;
  }
  get tokenHash(): string {
    return this.props.tokenHash;
  }
  get expiresAt(): Date {
    return this.props.expiresAt;
  }
  get lastUsedAt(): Date | undefined {
    return this.props.lastUsedAt;
  }

  public use() {
    this.props.lastUsedAt = new Date();
  }

  public isExpired(): boolean {
    return new Date() > this.props.expiresAt;
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      visitorId: this.visitorId,
      tokenHash: this.tokenHash,
      expiresAt: this.expiresAt,
      lastUsedAt: this.lastUsedAt,
    };
  }
}

// 10. Widget Installation
export interface WidgetInstallationProps {
  tenantId: string;
  domain: string;
  status: string; // PENDING, ACTIVE, SUSPENDED
  verificationToken: string;
  verifiedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class WidgetInstallation extends AggregateRoot<string> {
  private props: WidgetInstallationProps;

  constructor(id: string, props: WidgetInstallationProps) {
    super(id);
    this.props = {
      ...props,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get domain(): string {
    return this.props.domain;
  }
  get status(): string {
    return this.props.status;
  }
  get verificationToken(): string {
    return this.props.verificationToken;
  }
  get verifiedAt(): Date | undefined {
    return this.props.verifiedAt;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }
  get version(): number {
    return this.props.version!;
  }

  public verify() {
    this.props.status = 'ACTIVE';
    this.props.verifiedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public suspend() {
    this.props.status = 'SUSPENDED';
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      domain: this.domain,
      status: this.status,
      verificationToken: this.verificationToken,
      verifiedAt: this.verifiedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
