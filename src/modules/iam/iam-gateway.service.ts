import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  ActiveSession,
  AuthTokens,
  ForgotPasswordPayload,
  LoginCredentials,
  PasswordChangePayload,
  Permission,
  PermissionAction,
  PermissionResource,
  ResetPasswordPayload,
  Role,
  Session,
  Tenant,
  TenantBrandingConfig,
  TenantMembership,
  TenantSwitchResult,
  UpstreamMe,
  UpstreamSessionResult,
  UpstreamTenant,
  User,
  UserProfile,
  UserProfileUpdate,
  ProvisionUserPayload,
} from './iam-gateway.types';
import { randomUUID } from 'crypto';

/** Best-effort map for the permission strings IamRegistrationService registers with the
 * real IAM service (see iam-registration.service.ts). The two services evolved independently:
 * upstream grants flat strings like "support:ticket_read", the frontend expects structured
 * {resource, action} objects from a fixed enum. Anything not recognised here falls through
 * to parsePermissionString()'s best-effort split, and is silently dropped if that fails too —
 * better to under-grant an unrecognised permission than fabricate an invalid one. */
const KNOWN_PERMISSIONS: Record<string, Permission> = {
  'support:ticket_read': { resource: 'ticket', action: 'view' },
  'support:ticket_write': { resource: 'ticket', action: 'update' },
  'support:conversation_read': { resource: 'conversation', action: 'view' },
  'support:conversation_write': { resource: 'conversation', action: 'update' },
  'support:settings_manage': { resource: 'settings', action: 'manage' },
  'support:agent_assign': { resource: 'ticket', action: 'assign' },
};

const RESOURCE_VALUES: ReadonlySet<PermissionResource> = new Set([
  'conversation',
  'ticket',
  'customer',
  'team',
  'channel',
  'connector',
  'knowledge_base',
  'workflow',
  'ai_agent',
  'analytics',
  'settings',
  'admin_dashboard',
  'api_key',
  'webhook',
  'billing',
  'widget',
]);

const ACTION_SYNONYMS: Record<string, PermissionAction> = {
  read: 'view',
  view: 'view',
  list: 'view',
  write: 'update',
  update: 'update',
  edit: 'update',
  create: 'create',
  add: 'create',
  delete: 'delete',
  remove: 'delete',
  assign: 'assign',
  resolve: 'resolve',
  export: 'export',
  manage: 'manage',
};

interface CallOptions {
  token?: string;
  body?: unknown;
  query?: Record<string, string>;
  extraHeaders?: Record<string, string>;
}

interface CallResult {
  status: number;
  json: any;
}

/**
 * Adapts the real IAM microservice (multi-tannet-auth-services) to the exact
 * request/response contract the frontend's IamClient expects. The two services'
 * schemas don't line up structurally (different field names, nesting, and a
 * permission-string vocabulary vs. structured {resource,action} objects), so this
 * is a translating gateway rather than a byte-level proxy: every method below
 * issues one or more calls against upstream's `/api/v1/iam/*` routes and reshapes
 * the result.
 *
 * Cookie ownership: upstream's own httpOnly refresh-cookie support is gated behind
 * AUTH_MODE=cookie|hybrid, and the deployed instance runs AUTH_MODE=jwt (no cookies
 * set at all). So this gateway treats the refresh token as a plain value it receives
 * in JSON and persists itself as an httpOnly cookie scoped to this gateway's own
 * /v1/iam/auth/refresh route — the controller owns reading/writing that cookie.
 */
@Injectable()
export class IamGatewayService {
  private readonly logger = new Logger(IamGatewayService.name);
  private readonly baseUrl =
    process.env.IAM_SERVICE_INTERNAL_URL ||
    process.env.IAM_SERVICE_URL ||
    'http://localhost:3304';
  private readonly upstreamPrefix = '/api/v1/iam';

  // ─── Public API (one per IamClient method) ─────────────────────────────────

  async login(credentials: LoginCredentials): Promise<Session> {
    const extraHeaders: Record<string, string> = {};
    if (credentials.tenantSlug)
      extraHeaders['x-tenant-id'] = credentials.tenantSlug;

    const { status, json } = await this.call('POST', '/auth/login', {
      body: { email: credentials.email, password: credentials.password },
      extraHeaders,
    });
    if (status !== 200 && status !== 201) this.throwFromUpstream(status, json);

    if (json?.requiresTwoFactor || json?.requiresPasswordChange) {
      throw new UnauthorizedException(
        json?.message || 'Additional verification is required to sign in',
      );
    }

    const result = json as UpstreamSessionResult;
    return this.composeSession(
      result.accessToken,
      result.refreshToken,
      Date.now() + result.expiresIn * 1000,
    );
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    if (!refreshToken) throw new UnauthorizedException('No refresh token');
    const { status, json } = await this.call('POST', '/auth/refresh', {
      body: { refreshToken },
    });
    if (status !== 200) this.throwFromUpstream(status, json);

    return {
      accessToken: json.accessToken,
      refreshToken,
      expiresAt: Date.now() + json.expiresIn * 1000,
    };
  }

  async getSession(
    accessToken: string,
    refreshToken?: string,
  ): Promise<Session> {
    const expiresAt =
      this.decodeJwtExpiry(accessToken) ?? Date.now() + 15 * 60_000;
    return this.composeSession(accessToken, refreshToken ?? '', expiresAt);
  }

  async logout(accessToken: string): Promise<void> {
    const { status, json } = await this.call('POST', '/auth/logout', {
      token: accessToken,
    });
    if (status !== 200) this.throwFromUpstream(status, json);
  }

  async switchTenant(
    accessToken: string,
    tenantId: string,
  ): Promise<TenantSwitchResult> {
    const { status, json } = await this.call('POST', '/tenants/switch', {
      token: accessToken,
      body: { tenantId },
    });
    if (status !== 200 && status !== 201) this.throwFromUpstream(status, json);

    const result = json as UpstreamSessionResult;
    const tenant = await this.resolveTenant(tenantId);
    return {
      tenant,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  async getProfile(accessToken: string): Promise<UserProfile> {
    const { status, json } = await this.call('GET', '/profile', {
      token: accessToken,
    });
    if (status !== 200) this.throwFromUpstream(status, json);

    const me = await this.fetchMe(accessToken);
    const preferences = (json.preferences ?? {}) as Record<string, unknown>;

    return {
      id: json.id,
      email: json.email,
      displayName:
        json.displayName ||
        [json.firstName, json.lastName].filter(Boolean).join(' ') ||
        json.email,
      avatarUrl: json.avatarUrl ?? undefined,
      phone: json.phone ?? undefined,
      locale:
        typeof preferences.locale === 'string' ? preferences.locale : 'en-US',
      timezone:
        typeof preferences.timezone === 'string' ? preferences.timezone : 'UTC',
      mfaEnabled: Boolean(json.twoFactorEnabled),
      roles: this.mapRoles(me.roles),
      createdAt: json.createdAt,
      updatedAt: json.lastLoginAt ?? json.createdAt,
    };
  }

  async updateProfile(
    accessToken: string,
    update: UserProfileUpdate,
  ): Promise<User> {
    if (update.displayName !== undefined) {
      const { status, json } = await this.call('PATCH', '/profile', {
        token: accessToken,
        body: { displayName: update.displayName },
      });
      if (status !== 200) this.throwFromUpstream(status, json);
    }

    if (update.locale !== undefined || update.timezone !== undefined) {
      const current = await this.call('GET', '/profile', {
        token: accessToken,
      });
      if (current.status !== 200)
        this.throwFromUpstream(current.status, current.json);

      const preferences: Record<string, unknown> = {
        ...(current.json.preferences ?? {}),
      };
      if (update.locale !== undefined) preferences.locale = update.locale;
      if (update.timezone !== undefined) preferences.timezone = update.timezone;

      const { status, json } = await this.call(
        'PATCH',
        '/profile/preferences',
        {
          token: accessToken,
          body: { preferences },
        },
      );
      if (status !== 200) this.throwFromUpstream(status, json);
    }

    if (update.avatarUrl !== undefined) {
      this.logger.warn(
        'updateProfile: avatarUrl update ignored — upstream IAM only accepts avatar uploads via multipart, not an arbitrary URL',
      );
    }

    const me = await this.fetchMe(accessToken);
    return this.buildUser(me);
  }

  async getPermissions(accessToken: string): Promise<Permission[]> {
    const me = await this.fetchMe(accessToken);
    return this.mapPermissions(me.permissions, me.roles, me.isSuperAdmin);
  }

  async getTenants(accessToken: string): Promise<TenantMembership[]> {
    const me = await this.fetchMe(accessToken);
    if (!me.tenantSlug) return [];
    const tenant = await this.resolveTenant(me.tenantSlug);
    return [{ tenant, roleKeys: me.roles, isDefault: true }];
  }

  async changePassword(
    accessToken: string,
    payload: PasswordChangePayload,
  ): Promise<void> {
    const { status, json } = await this.call('POST', '/auth/password/change', {
      token: accessToken,
      body: {
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
      },
    });
    if (status !== 200) this.throwFromUpstream(status, json);
  }

  async forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
    const { status, json } = await this.call('POST', '/auth/password/forgot', {
      body: { email: payload.email },
    });
    if (status !== 200) this.throwFromUpstream(status, json);
  }

  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    const { status, json } = await this.call('POST', '/auth/password/reset', {
      body: { token: payload.token, newPassword: payload.newPassword },
    });
    if (status !== 200) this.throwFromUpstream(status, json);
  }

  async listSessions(accessToken: string): Promise<ActiveSession[]> {
    const { status, json } = await this.call('GET', '/sessions', {
      token: accessToken,
    });
    if (status !== 200) this.throwFromUpstream(status, json);

    const rows = json as Array<{
      publicId: string;
      userAgent?: string;
      ipAddress?: string;
      deviceName?: string;
      lastActiveAt: string;
      createdAt: string;
    }>;

    return rows.map((row) => ({
      id: row.publicId,
      device: row.deviceName || 'Unknown device',
      userAgent: row.userAgent || '',
      ip: row.ipAddress || '',
      createdAt: row.createdAt,
      lastActiveAt: row.lastActiveAt,
      // Upstream's session list doesn't expose which row belongs to the calling
      // token (it selects publicId, not the internal id the JWT's sessionId claim
      // refers to) — there's no cheap way to flag "this device" without an extra
      // per-row lookup, so this is always false.
      current: false,
    }));
  }

  async revokeSession(accessToken: string, sessionId: string): Promise<void> {
    const { status, json } = await this.call(
      'DELETE',
      `/sessions/${encodeURIComponent(sessionId)}`,
      { token: accessToken },
    );
    if (status !== 200) this.throwFromUpstream(status, json);
  }

  // ─── Composition helpers ────────────────────────────────────────────────────

  private async composeSession(
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
  ): Promise<Session> {
    const me = await this.fetchMe(accessToken);
    if (!me.tenantSlug) {
      throw new ConflictException('Account is not associated with any tenant');
    }

    const tenant = await this.resolveTenant(me.tenantSlug);
    const user = this.buildUser(me);
    const permissions = this.mapPermissions(
      me.permissions,
      me.roles,
      me.isSuperAdmin,
    );
    const memberships: TenantMembership[] = [
      { tenant, roleKeys: me.roles, isDefault: true },
    ];

    return {
      user,
      tenant,
      memberships,
      permissions,
      tokens: { accessToken, refreshToken, expiresAt },
    };
  }

  private async fetchMe(accessToken: string): Promise<UpstreamMe> {
    const { status, json } = await this.call('GET', '/auth/me', {
      token: accessToken,
    });
    if (status !== 200) this.throwFromUpstream(status, json);
    return json as UpstreamMe;
  }

  private async resolveTenant(ref: string): Promise<Tenant> {
    const { status, json } = await this.call('GET', '/tenants/resolve/public', {
      query: { ref },
    });
    if (status !== 200) this.throwFromUpstream(status, json);

    const t = json as UpstreamTenant;
    return {
      id: t.internalId,
      name: t.name,
      slug: t.slug,
      plan: 'standard',
      logoUrl: t.logoUrl ?? undefined,
      status: t.isActive ? 'ACTIVE' : 'SUSPENDED',
      branding: this.extractBranding(t.settings),
    };
  }

  private extractBranding(
    settings?: Record<string, unknown> | null,
  ): TenantBrandingConfig | undefined {
    const branding = settings && settings.branding;
    if (!branding || typeof branding !== 'object') return undefined;
    return branding;
  }

  private buildUser(me: UpstreamMe): User {
    const displayName =
      me.displayName ||
      [me.firstName, me.lastName].filter(Boolean).join(' ') ||
      me.email;
    return {
      id: me.id,
      email: me.email,
      displayName,
      avatarUrl: me.avatarUrl ?? undefined,
      roles: this.mapRoles(me.roles),
      status: me.isActive ? 'ACTIVE' : 'DEACTIVATED',
      createdAt: me.createdAt,
      updatedAt: me.lastLoginAt ?? me.createdAt,
    };
  }

  private mapRoles(roles: string[]): Role[] {
    return roles.map((name) => ({
      id: name,
      key: name,
      name: name
        .split('_')
        .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
        .join(' '),
    }));
  }

  private mapPermissions(
    raw: string[],
    roles: string[],
    isSuperAdmin?: boolean,
  ): Permission[] {
    const byKey = new Map<string, Permission>();
    const add = (p: Permission) =>
      byKey.set(`${p.resource}:${p.action}:${p.scope ?? ''}`, p);

    if (isSuperAdmin || roles.includes('super_admin')) {
      for (const resource of RESOURCE_VALUES)
        add({ resource, action: 'manage' });
    }

    for (const name of raw) {
      const known = KNOWN_PERMISSIONS[name];
      if (known) {
        add(known);
        continue;
      }
      const parsed = this.parsePermissionString(name);
      if (parsed) add(parsed);
    }

    return [...byKey.values()];
  }

  /** Best-effort parse for permission strings not in KNOWN_PERMISSIONS, following the
   * same "<namespace>:<resource>_<action>" convention IamRegistrationService uses
   * (e.g. a future "support:billing_manage"). Returns null rather than guessing when
   * either segment doesn't match the frontend's fixed enums. */
  private parsePermissionString(name: string): Permission | null {
    const segment = name.includes(':') ? name.split(':').pop()! : name;
    const idx = segment.lastIndexOf('_');
    if (idx === -1) return null;

    const resource = segment.slice(0, idx) as PermissionResource;
    const action = ACTION_SYNONYMS[segment.slice(idx + 1)];
    if (!action || !RESOURCE_VALUES.has(resource)) return null;

    return { resource, action };
  }

  private decodeJwtExpiry(token: string): number | null {
    try {
      const payload = token.split('.')[1];
      const json = Buffer.from(payload, 'base64url').toString('utf8');
      const { exp } = JSON.parse(json) as { exp?: number };
      return typeof exp === 'number' ? exp * 1000 : null;
    } catch {
      return null;
    }
  }

  // ─── Transport ──────────────────────────────────────────────────────────────

  private async call(
    method: string,
    path: string,
    opts: CallOptions = {},
  ): Promise<CallResult> {
    const url = new URL(`${this.baseUrl}${this.upstreamPrefix}${path}`);
    if (opts.query) {
      for (const [key, value] of Object.entries(opts.query))
        url.searchParams.set(key, value);
    }

    const headers: Record<string, string> = { ...opts.extraHeaders };
    if (opts.token) headers['authorization'] = `Bearer ${opts.token}`;
    if (opts.body !== undefined) headers['content-type'] = 'application/json';

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: AbortSignal.timeout(8000),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `IAM service request failed (${method} ${path}): ${message}`,
      );
      throw new ServiceUnavailableException('IAM service is unavailable');
    }

    const text = await response.text();
    let json: any = {};
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { message: text };
      }
    }
    if (response.ok) json = this.unwrapEnvelope(json);
    return { status: response.status, json };
  }

  /** Upstream's global ResponseInterceptor wraps every successful response in
   * {success,data,message,timestamp} — except single-key {message} results,
   * which it leaves without a `data` field at all. Error responses go through a
   * separate filter that returns a flat {success:false,statusCode,message} shape
   * and never reach this helper (only called for response.ok). */
  private unwrapEnvelope(json: any): any {
    if (json && typeof json === 'object' && json.success === true) {
      return 'data' in json ? json.data : { message: json.message };
    }
    return json;
  }

  private throwFromUpstream(status: number, json: any): never {
    const message = json?.message || 'IAM service request failed';
    switch (status) {
      case 400:
        throw new BadRequestException(message);
      case 401:
        throw new UnauthorizedException(message);
      case 403:
        throw new ForbiddenException(message);
      case 404:
        throw new NotFoundException(message);
      case 409:
        throw new ConflictException(message);
      case 422:
        throw new UnprocessableEntityException(message);
      default:
        if (status >= 400 && status < 500)
          throw new HttpException(message, status);
        throw new ServiceUnavailableException(message);
    }
  }
}
