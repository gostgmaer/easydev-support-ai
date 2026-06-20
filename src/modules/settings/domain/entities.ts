import { AggregateRoot, Entity } from '@easydev/shared-kernel';

// ------------------ Child Entities ------------------

export interface BrandingSettingsProps {
  tenantId: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  themeMode: string; // LIGHT, DARK, etc.
  emailHeader?: string;
  emailFooter?: string;
  customCss?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class BrandingSettings extends Entity<string> {
  private props: BrandingSettingsProps;

  constructor(id: string, props: BrandingSettingsProps) {
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
  get logoUrl(): string | undefined {
    return this.props.logoUrl;
  }
  get faviconUrl(): string | undefined {
    return this.props.faviconUrl;
  }
  get primaryColor(): string {
    return this.props.primaryColor;
  }
  get secondaryColor(): string {
    return this.props.secondaryColor;
  }
  get themeMode(): string {
    return this.props.themeMode;
  }
  get emailHeader(): string | undefined {
    return this.props.emailHeader;
  }
  get emailFooter(): string | undefined {
    return this.props.emailFooter;
  }
  get customCss(): string | undefined {
    return this.props.customCss;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public update(props: Partial<Omit<BrandingSettingsProps, 'tenantId'>>) {
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
      logoUrl: this.logoUrl,
      faviconUrl: this.faviconUrl,
      primaryColor: this.primaryColor,
      secondaryColor: this.secondaryColor,
      themeMode: this.themeMode,
      emailHeader: this.emailHeader,
      emailFooter: this.emailFooter,
      customCss: this.customCss,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface BusinessHoursProps {
  tenantId: string;
  dayOfWeek: number; // 0 = Sunday, ..., 6 = Saturday
  startTime: string; // "HH:MM:ss"
  endTime: string; // "HH:MM:ss"
  isOpen: boolean;
  timezone: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class BusinessHours extends Entity<string> {
  private props: BusinessHoursProps;

  constructor(id: string, props: BusinessHoursProps) {
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
  get dayOfWeek(): number {
    return this.props.dayOfWeek;
  }
  get startTime(): string {
    return this.props.startTime;
  }
  get endTime(): string {
    return this.props.endTime;
  }
  get isOpen(): boolean {
    return this.props.isOpen;
  }
  get timezone(): string {
    return this.props.timezone;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public update(props: Partial<Omit<BusinessHoursProps, 'tenantId'>>) {
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
      dayOfWeek: this.dayOfWeek,
      startTime: this.startTime,
      endTime: this.endTime,
      isOpen: this.isOpen,
      timezone: this.timezone,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface HolidayProps {
  tenantId: string;
  holidayName: string;
  holidayDate: Date;
  isRecurring: boolean;
  country?: string;
  region?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Holiday extends Entity<string> {
  private props: HolidayProps;

  constructor(id: string, props: HolidayProps) {
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
  get holidayName(): string {
    return this.props.holidayName;
  }
  get holidayDate(): Date {
    return this.props.holidayDate;
  }
  get isRecurring(): boolean {
    return this.props.isRecurring;
  }
  get country(): string | undefined {
    return this.props.country;
  }
  get region(): string | undefined {
    return this.props.region;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public update(props: Partial<Omit<HolidayProps, 'tenantId'>>) {
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
      holidayName: this.holidayName,
      holidayDate: this.holidayDate,
      isRecurring: this.isRecurring,
      country: this.country,
      region: this.region,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface FeatureFlagProps {
  tenantId: string;
  featureKey: string;
  enabled: boolean;
  rolloutPercentage: number;
  configuration?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class FeatureFlag extends Entity<string> {
  private props: FeatureFlagProps;

  constructor(id: string, props: FeatureFlagProps) {
    super(id);
    this.props = {
      ...props,
      configuration: props.configuration || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get featureKey(): string {
    return this.props.featureKey;
  }
  get enabled(): boolean {
    return this.props.enabled;
  }
  get rolloutPercentage(): number {
    return this.props.rolloutPercentage;
  }
  get configuration(): Record<string, any> {
    return this.props.configuration || {};
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public update(
    props: Partial<Omit<FeatureFlagProps, 'tenantId' | 'featureKey'>>,
  ) {
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
      featureKey: this.featureKey,
      enabled: this.enabled,
      rolloutPercentage: this.rolloutPercentage,
      configuration: this.configuration,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface AiSettingsProps {
  tenantId: string;
  defaultAgent?: string;
  confidenceThreshold: number;
  escalationThreshold: number;
  allowedLanguages: string[];
  defaultLanguage: string;
  autoResponseEnabled: boolean;
  autoEscalationEnabled: boolean;
  costLimitDaily?: number;
  costLimitMonthly?: number;
  modelConfiguration?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AiSettings extends Entity<string> {
  private props: AiSettingsProps;

  constructor(id: string, props: AiSettingsProps) {
    super(id);
    this.props = {
      ...props,
      allowedLanguages: props.allowedLanguages || ['en'],
      modelConfiguration: props.modelConfiguration || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get defaultAgent(): string | undefined {
    return this.props.defaultAgent;
  }
  get confidenceThreshold(): number {
    return this.props.confidenceThreshold;
  }
  get escalationThreshold(): number {
    return this.props.escalationThreshold;
  }
  get allowedLanguages(): string[] {
    return this.props.allowedLanguages;
  }
  get defaultLanguage(): string {
    return this.props.defaultLanguage;
  }
  get autoResponseEnabled(): boolean {
    return this.props.autoResponseEnabled;
  }
  get autoEscalationEnabled(): boolean {
    return this.props.autoEscalationEnabled;
  }
  get costLimitDaily(): number | undefined {
    return this.props.costLimitDaily;
  }
  get costLimitMonthly(): number | undefined {
    return this.props.costLimitMonthly;
  }
  get modelConfiguration(): Record<string, any> {
    return this.props.modelConfiguration || {};
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public update(props: Partial<Omit<AiSettingsProps, 'tenantId'>>) {
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
      defaultAgent: this.defaultAgent,
      confidenceThreshold: this.confidenceThreshold,
      escalationThreshold: this.escalationThreshold,
      allowedLanguages: this.allowedLanguages,
      defaultLanguage: this.defaultLanguage,
      autoResponseEnabled: this.autoResponseEnabled,
      autoEscalationEnabled: this.autoEscalationEnabled,
      costLimitDaily: this.costLimitDaily,
      costLimitMonthly: this.costLimitMonthly,
      modelConfiguration: this.modelConfiguration,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface ChannelSettingsProps {
  tenantId: string;
  channelType: string;
  enabled: boolean;
  businessHoursOnly: boolean;
  autoAssignmentEnabled: boolean;
  configuration?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ChannelSettings extends Entity<string> {
  private props: ChannelSettingsProps;

  constructor(id: string, props: ChannelSettingsProps) {
    super(id);
    this.props = {
      ...props,
      configuration: props.configuration || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get channelType(): string {
    return this.props.channelType;
  }
  get enabled(): boolean {
    return this.props.enabled;
  }
  get businessHoursOnly(): boolean {
    return this.props.businessHoursOnly;
  }
  get autoAssignmentEnabled(): boolean {
    return this.props.autoAssignmentEnabled;
  }
  get configuration(): Record<string, any> {
    return this.props.configuration || {};
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public update(
    props: Partial<Omit<ChannelSettingsProps, 'tenantId' | 'channelType'>>,
  ) {
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
      channelType: this.channelType,
      enabled: this.enabled,
      businessHoursOnly: this.businessHoursOnly,
      autoAssignmentEnabled: this.autoAssignmentEnabled,
      configuration: this.configuration,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface NotificationSettingsProps {
  tenantId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  webhookEnabled: boolean;
  digestEnabled: boolean;
  configuration?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class NotificationSettings extends Entity<string> {
  private props: NotificationSettingsProps;

  constructor(id: string, props: NotificationSettingsProps) {
    super(id);
    this.props = {
      ...props,
      configuration: props.configuration || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get emailEnabled(): boolean {
    return this.props.emailEnabled;
  }
  get smsEnabled(): boolean {
    return this.props.smsEnabled;
  }
  get pushEnabled(): boolean {
    return this.props.pushEnabled;
  }
  get webhookEnabled(): boolean {
    return this.props.webhookEnabled;
  }
  get digestEnabled(): boolean {
    return this.props.digestEnabled;
  }
  get configuration(): Record<string, any> {
    return this.props.configuration || {};
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public update(props: Partial<Omit<NotificationSettingsProps, 'tenantId'>>) {
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
      emailEnabled: this.emailEnabled,
      smsEnabled: this.smsEnabled,
      pushEnabled: this.pushEnabled,
      webhookEnabled: this.webhookEnabled,
      digestEnabled: this.digestEnabled,
      configuration: this.configuration,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface SlaSettingsProps {
  tenantId: string;
  responseTimeTarget: number; // In seconds
  resolutionTimeTarget: number; // In seconds
  escalationTimeTarget: number; // In seconds
  businessHoursOnly: boolean;
  configuration?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class SlaSettings extends Entity<string> {
  private props: SlaSettingsProps;

  constructor(id: string, props: SlaSettingsProps) {
    super(id);
    this.props = {
      ...props,
      configuration: props.configuration || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get responseTimeTarget(): number {
    return this.props.responseTimeTarget;
  }
  get resolutionTimeTarget(): number {
    return this.props.resolutionTimeTarget;
  }
  get escalationTimeTarget(): number {
    return this.props.escalationTimeTarget;
  }
  get businessHoursOnly(): boolean {
    return this.props.businessHoursOnly;
  }
  get configuration(): Record<string, any> {
    return this.props.configuration || {};
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public update(props: Partial<Omit<SlaSettingsProps, 'tenantId'>>) {
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
      responseTimeTarget: this.responseTimeTarget,
      resolutionTimeTarget: this.resolutionTimeTarget,
      escalationTimeTarget: this.escalationTimeTarget,
      businessHoursOnly: this.businessHoursOnly,
      configuration: this.configuration,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface SecuritySettingsProps {
  tenantId: string;
  sessionTimeout: number; // In seconds
  ipWhitelist: string[];
  mfaRequired: boolean;
  apiKeyRotationDays: number;
  auditRetentionDays: number;
  configuration?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class SecuritySettings extends Entity<string> {
  private props: SecuritySettingsProps;

  constructor(id: string, props: SecuritySettingsProps) {
    super(id);
    this.props = {
      ...props,
      ipWhitelist: props.ipWhitelist || [],
      configuration: props.configuration || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get sessionTimeout(): number {
    return this.props.sessionTimeout;
  }
  get ipWhitelist(): string[] {
    return this.props.ipWhitelist;
  }
  get mfaRequired(): boolean {
    return this.props.mfaRequired;
  }
  get apiKeyRotationDays(): number {
    return this.props.apiKeyRotationDays;
  }
  get auditRetentionDays(): number {
    return this.props.auditRetentionDays;
  }
  get configuration(): Record<string, any> {
    return this.props.configuration || {};
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public update(props: Partial<Omit<SecuritySettingsProps, 'tenantId'>>) {
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
      sessionTimeout: this.sessionTimeout,
      ipWhitelist: this.ipWhitelist,
      mfaRequired: this.mfaRequired,
      apiKeyRotationDays: this.apiKeyRotationDays,
      auditRetentionDays: this.auditRetentionDays,
      configuration: this.configuration,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface WidgetSettingsProps {
  tenantId: string;
  widgetName: string;
  widgetColor: string;
  widgetPosition: string; // BOTTOM_RIGHT, BOTTOM_LEFT, etc.
  welcomeMessage?: string;
  offlineMessage?: string;
  avatarUrl?: string;
  customCss?: string;
  customJs?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class WidgetSettings extends Entity<string> {
  private props: WidgetSettingsProps;

  constructor(id: string, props: WidgetSettingsProps) {
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
  get widgetName(): string {
    return this.props.widgetName;
  }
  get widgetColor(): string {
    return this.props.widgetColor;
  }
  get widgetPosition(): string {
    return this.props.widgetPosition;
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
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public update(props: Partial<Omit<WidgetSettingsProps, 'tenantId'>>) {
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
      widgetName: this.widgetName,
      widgetColor: this.widgetColor,
      widgetPosition: this.widgetPosition,
      welcomeMessage: this.welcomeMessage,
      offlineMessage: this.offlineMessage,
      avatarUrl: this.avatarUrl,
      customCss: this.customCss,
      customJs: this.customJs,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface UsageLimitsProps {
  tenantId: string;
  maxAgents: number;
  maxConversations: number;
  maxMessages: number;
  maxWorkflows: number;
  maxConnectors: number;
  maxDocuments: number;
  maxStorage: number; // In bytes
  maxAiRequests: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UsageLimits extends Entity<string> {
  private props: UsageLimitsProps;

  constructor(id: string, props: UsageLimitsProps) {
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
  get maxAgents(): number {
    return this.props.maxAgents;
  }
  get maxConversations(): number {
    return this.props.maxConversations;
  }
  get maxMessages(): number {
    return this.props.maxMessages;
  }
  get maxWorkflows(): number {
    return this.props.maxWorkflows;
  }
  get maxConnectors(): number {
    return this.props.maxConnectors;
  }
  get maxDocuments(): number {
    return this.props.maxDocuments;
  }
  get maxStorage(): number {
    return this.props.maxStorage;
  }
  get maxAiRequests(): number {
    return this.props.maxAiRequests;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public update(props: Partial<Omit<UsageLimitsProps, 'tenantId'>>) {
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
      maxAgents: this.maxAgents,
      maxConversations: this.maxConversations,
      maxMessages: this.maxMessages,
      maxWorkflows: this.maxWorkflows,
      maxConnectors: this.maxConnectors,
      maxDocuments: this.maxDocuments,
      maxStorage: this.maxStorage,
      maxAiRequests: this.maxAiRequests,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// ------------------ Preferences (Entity or embedded) ------------------

export interface TenantPreferencesProps {
  tenantId: string;
  theme: string;
  notificationsEnabled: boolean;
  autoResolveDays: number;
  autoCloseDays: number;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class TenantPreferences extends Entity<string> {
  private props: TenantPreferencesProps;

  constructor(id: string, props: TenantPreferencesProps) {
    super(id);
    this.props = {
      ...props,
      metadata: props.metadata || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get theme(): string {
    return this.props.theme;
  }
  get notificationsEnabled(): boolean {
    return this.props.notificationsEnabled;
  }
  get autoResolveDays(): number {
    return this.props.autoResolveDays;
  }
  get autoCloseDays(): number {
    return this.props.autoCloseDays;
  }
  get metadata(): Record<string, any> {
    return this.props.metadata || {};
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public update(props: Partial<Omit<TenantPreferencesProps, 'tenantId'>>) {
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
      theme: this.theme,
      notificationsEnabled: this.notificationsEnabled,
      autoResolveDays: this.autoResolveDays,
      autoCloseDays: this.autoCloseDays,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// ------------------ TenantSettings Aggregate Root ------------------

export interface TenantSettingsProps {
  tenantId: string;
  tenantName: string;
  industry?: string;
  timezone: string;
  locale: string;
  country?: string;
  currency: string;
  supportEmail?: string;
  supportPhone?: string;
  websiteUrl?: string;
  status: string; // ACTIVE, SUSPENDED, etc.
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class TenantSettings extends AggregateRoot<string> {
  private props: TenantSettingsProps;

  // Domain Children
  private _branding?: BrandingSettings;
  private _preferences?: TenantPreferences;
  private _businessHours: BusinessHours[] = [];
  private _holidays: Holiday[] = [];
  private _featureFlags: FeatureFlag[] = [];
  private _aiSettings?: AiSettings;
  private _channelSettings: ChannelSettings[] = [];
  private _notificationSettings?: NotificationSettings;
  private _slaSettings?: SlaSettings;
  private _securitySettings?: SecuritySettings;
  private _widgetSettings?: WidgetSettings;
  private _usageLimits?: UsageLimits;

  constructor(id: string, props: TenantSettingsProps) {
    super(id);
    this.props = {
      ...props,
      metadata: props.metadata || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get tenantName(): string {
    return this.props.tenantName;
  }
  get industry(): string | undefined {
    return this.props.industry;
  }
  get timezone(): string {
    return this.props.timezone;
  }
  get locale(): string {
    return this.props.locale;
  }
  get country(): string | undefined {
    return this.props.country;
  }
  get currency(): string {
    return this.props.currency;
  }
  get supportEmail(): string | undefined {
    return this.props.supportEmail;
  }
  get supportPhone(): string | undefined {
    return this.props.supportPhone;
  }
  get websiteUrl(): string | undefined {
    return this.props.websiteUrl;
  }
  get status(): string {
    return this.props.status;
  }
  get metadata(): Record<string, any> {
    return this.props.metadata || {};
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

  // Child accessors
  get branding(): BrandingSettings | undefined {
    return this._branding;
  }
  get preferences(): TenantPreferences | undefined {
    return this._preferences;
  }
  get businessHours(): BusinessHours[] {
    return this._businessHours;
  }
  get holidays(): Holiday[] {
    return this._holidays;
  }
  get featureFlags(): FeatureFlag[] {
    return this._featureFlags;
  }
  get aiSettings(): AiSettings | undefined {
    return this._aiSettings;
  }
  get channelSettings(): ChannelSettings[] {
    return this._channelSettings;
  }
  get notificationSettings(): NotificationSettings | undefined {
    return this._notificationSettings;
  }
  get slaSettings(): SlaSettings | undefined {
    return this._slaSettings;
  }
  get securitySettings(): SecuritySettings | undefined {
    return this._securitySettings;
  }
  get widgetSettings(): WidgetSettings | undefined {
    return this._widgetSettings;
  }
  get usageLimits(): UsageLimits | undefined {
    return this._usageLimits;
  }

  // Modifiers / Setters
  public update(props: Partial<Omit<TenantSettingsProps, 'tenantId'>>) {
    this.props = {
      ...this.props,
      ...props,
      updatedAt: new Date(),
      version: (this.props.version || 1) + 1,
    };
  }

  public setBranding(branding: BrandingSettings) {
    this._branding = branding;
    this.props.updatedAt = new Date();
  }

  public setPreferences(preferences: TenantPreferences) {
    this._preferences = preferences;
    this.props.updatedAt = new Date();
  }

  public setBusinessHours(hours: BusinessHours[]) {
    this._businessHours = hours;
    this.props.updatedAt = new Date();
  }

  public setHolidays(holidays: Holiday[]) {
    this._holidays = holidays;
    this.props.updatedAt = new Date();
  }

  public setFeatureFlags(flags: FeatureFlag[]) {
    this._featureFlags = flags;
    this.props.updatedAt = new Date();
  }

  public setAiSettings(ai: AiSettings) {
    this._aiSettings = ai;
    this.props.updatedAt = new Date();
  }

  public setChannelSettings(channel: ChannelSettings[]) {
    this._channelSettings = channel;
    this.props.updatedAt = new Date();
  }

  public setNotificationSettings(notif: NotificationSettings) {
    this._notificationSettings = notif;
    this.props.updatedAt = new Date();
  }

  public setSlaSettings(sla: SlaSettings) {
    this._slaSettings = sla;
    this.props.updatedAt = new Date();
  }

  public setSecuritySettings(sec: SecuritySettings) {
    this._securitySettings = sec;
    this.props.updatedAt = new Date();
  }

  public setWidgetSettings(widget: WidgetSettings) {
    this._widgetSettings = widget;
    this.props.updatedAt = new Date();
  }

  public setUsageLimits(limits: UsageLimits) {
    this._usageLimits = limits;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      tenantName: this.tenantName,
      industry: this.industry,
      timezone: this.timezone,
      locale: this.locale,
      country: this.country,
      currency: this.currency,
      supportEmail: this.supportEmail,
      supportPhone: this.supportPhone,
      websiteUrl: this.websiteUrl,
      status: this.status,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
