/**
 * Frontend-facing shapes. Hand-mirrored from `@easydev/types` in the
 * easydev-support-ai-web repo (a separate repo/package graph — there is no
 * shared package to import these from) so the gateway's output is type-safe
 * against the exact contract IamClient expects.
 */

export type PermissionAction =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'assign'
  | 'resolve'
  | 'export'
  | 'manage';

export type PermissionResource =
  | 'conversation'
  | 'ticket'
  | 'customer'
  | 'team'
  | 'channel'
  | 'connector'
  | 'knowledge_base'
  | 'workflow'
  | 'ai_agent'
  | 'analytics'
  | 'settings'
  | 'admin_dashboard'
  | 'api_key'
  | 'webhook'
  | 'billing'
  | 'widget';

export interface Permission {
  action: PermissionAction;
  resource: PermissionResource;
  scope?: string;
}

export interface Role {
  id: string;
  key: string;
  name: string;
  description?: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  roles: Role[];
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'DEACTIVATED';
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  phone?: string;
  locale: string;
  timezone: string;
  mfaEnabled: boolean;
  roles: Role[];
  createdAt: string;
  updatedAt: string;
}

export interface TenantBrandingConfig {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  customCssVariables?: Record<string, string>;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  logoUrl?: string;
  status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'CANCELLED';
  branding?: TenantBrandingConfig;
}

export interface TenantMembership {
  tenant: Tenant;
  roleKeys: string[];
  isDefault: boolean;
}

export interface TenantSwitchResult {
  tenant: Tenant;
  accessToken: string;
  refreshToken: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface Session {
  user: User;
  tenant: Tenant;
  memberships: TenantMembership[];
  permissions: Permission[];
  tokens: AuthTokens;
}

export interface ActiveSession {
  id: string;
  device: string;
  userAgent: string;
  ip: string;
  location?: string;
  createdAt: string;
  lastActiveAt: string;
  current: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface UserProfileUpdate {
  displayName?: string;
  avatarUrl?: string;
  locale?: string;
  timezone?: string;
}

export interface PasswordChangePayload {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordPayload {
  email: string;
  tenantSlug?: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

/** Shape of `GET/POST .../auth/me` and the tail of login/refresh/switch on the real IAM service. */
export interface UpstreamMe {
  id: string;
  email: string;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  isSuperAdmin?: true;
  twoFactorEnabled: boolean;
  preferences?: Record<string, unknown> | null;
  lastLoginAt?: string | null;
  createdAt: string;
  roles: string[];
  permissions: string[];
  tenantSlug?: string;
  role: string | null;
}

export interface UpstreamSessionResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
}

export interface UpstreamTenant {
  internalId: string;
  publicId: string;
  name: string;
  slug: string;
  domain?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  isDefault: boolean;
  settings?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProvisionUserPayload {
  email: string;
  password?: string;
  name: string;
}
