import { BaseClient } from './base-client';
import { createHmac } from 'crypto';

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

  constructor(baseURL: string, apiKey: string, gatewayHmacSecret?: string) {
    super(baseURL, 'PaymentClient');
    this.apiKey = apiKey;
    this.gatewayHmacSecret = gatewayHmacSecret;
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
   * (GET /api/v1/subscriptions/active) - authenticates via the legacy
   * shared x-api-key + x-tenant-id header pair (ServiceOrJwtGuard's
   * documented legacy path) plus the gateway HMAC signature
   * GatewayHmacGuard requires on every route.
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
          'x-api-key': this.apiKey,
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
