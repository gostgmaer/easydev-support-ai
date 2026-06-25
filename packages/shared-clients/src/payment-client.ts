import { BaseClient } from './base-client';
import { createHmac } from 'crypto';
import { IamServiceTokenProvider } from './iam-service-token';

/**
 * Mirrors the real payment-microservice response shape from
 * GET /api/v1/subscriptions/active (verified directly against that
 * service's source, not assumed). `subscription` is null for a tenant that
 * has never had a billing relationship at all (e.g. a brand-new/freemium
 * tenant) - that is a normal, expected case, not an error.
 */
export interface TenantSubscriptionStatus {
  tenantId: string;
  subscription: {
    id: string;
    status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';
    currentPeriodEnd: string;
    plan: {
      id: string;
      name: string;
      // Quota numbers per plan don't exist in the real Plan model today -
      // metadata is the documented, migration-free place to add them
      // (packages/database has no equivalent column either). Until
      // populated, this is absent/empty and callers should fall back to
      // their own defaults rather than treat that as an error.
      metadata: Record<string, any> | null;
    };
  } | null;
}

export class PaymentClient extends BaseClient {
  private readonly apiKey: string;
  private readonly gatewayHmacSecret?: string;
  private readonly serviceTokenProvider?: IamServiceTokenProvider;

  constructor(
    baseURL: string,
    apiKey: string,
    gatewayHmacSecret?: string,
    // OAuth2 client_credentials token provider (preferred, scope-limited)
    // - payment-microservice's own docs mark the shared x-api-key as a
    // legacy fallback in favor of this. Optional and additive: when unset,
    // or when it can't get a token (app not yet registered with IAM),
    // every call below falls back to the legacy x-api-key unchanged.
    serviceTokenProvider?: IamServiceTokenProvider,
  ) {
    super(baseURL, 'PaymentClient');
    this.apiKey = apiKey;
    this.gatewayHmacSecret = gatewayHmacSecret;
    this.serviceTokenProvider = serviceTokenProvider;
  }

  /** Bearer token from IAM when configured and reachable; otherwise the
   * legacy shared x-api-key header (ServiceOrJwtGuard accepts either). */
  private async authHeaders(): Promise<Record<string, string>> {
    const bearer = await this.serviceTokenProvider?.getAuthHeader();
    return bearer ? { authorization: bearer } : { 'x-api-key': this.apiKey };
  }

  /**
   * payment-microservice's GatewayHmacGuard is a global APP_GUARD - every
   * route requires X-Gateway-HMAC/X-Gateway-Timestamp, not just the
   * client_credentials path. Verified directly against that guard's source
   * (gateway-hmac.guard.ts): signed payload is
   * `${METHOD}|${path}|${tenantId}|${requestId}|${timestampMs}`, secret is
   * FILE_UPLOAD_HMAC_SECRET (shared with this app - confirmed identical in
   * both .env files). requestId is intentionally omitted/empty here to
   * match what the guard reads when the header isn't sent.
   */
  private signGatewayRequest(
    method: string,
    path: string,
    tenantId: string,
  ): { 'x-gateway-hmac': string; 'x-gateway-timestamp': string } | Record<string, never> {
    if (!this.gatewayHmacSecret) return {};
    const timestamp = Date.now().toString();
    const payload = [method.toUpperCase(), path, tenantId, '', timestamp].join('|');
    const hmac = createHmac('sha256', this.gatewayHmacSecret).update(payload).digest('hex');
    return { 'x-gateway-hmac': hmac, 'x-gateway-timestamp': timestamp };
  }

  /**
   * Tenant-only lookup against the real, verified endpoint
   * (GET /api/v1/subscriptions/active) - authenticates via an IAM-issued
   * client_credentials Bearer token when configured, falling back to the
   * legacy shared x-api-key + x-tenant-id header pair (both accepted by
   * ServiceOrJwtGuard) otherwise, plus the gateway HMAC signature
   * GatewayHmacGuard requires on every route regardless of which auth path
   * is used.
   * Returns null (not a fabricated default) when the call fails, so the
   * caller can decide its own fallback rather than silently trusting
   * invented numbers as if they came from billing.
   */
  async getTenantSubscriptionStatus(
    tenantId: string,
  ): Promise<TenantSubscriptionStatus | null> {
    const path = '/api/v1/subscriptions/active';
    try {
      const response = await this.request<TenantSubscriptionStatus>({
        method: 'GET',
        url: path,
        headers: {
          ...(await this.authHeaders()),
          'x-tenant-id': tenantId,
          ...this.signGatewayRequest('GET', path, tenantId),
        },
      });
      return response.data;
    } catch (e: any) {
      this.logger.error(`Payment getTenantSubscriptionStatus failed: ${e.message}`);
      return null;
    }
  }
}
