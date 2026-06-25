import { createHmac } from 'crypto';
import { BaseClient, AuthProbeResult } from './base-client';

// A 24-hex-char string is a well-formed Mongo ObjectId that will never
// resolve to a real file - used only to exercise the real auth path for
// health checks. A 404 ("not found") proves auth passed (it got through
// the gateway HMAC guard to business logic); 401/403 proves it didn't.
const HEALTH_PROBE_FILE_ID = '000000000000000000000000';
const HEALTH_PROBE_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Mirrors the real file-upload-service's `formatFile()` response shape
 * (verified directly against that service's source, not assumed) - a
 * separate repo's fileController.js. `id` is the Mongo _id every follow-up
 * call (download/delete/status) needs; `storageKey` is the provider-internal
 * path, exposed for reference only.
 */
export interface StorageReference {
  id: string;
  storageKey: string;
  publicUrl?: string;
  fileSize?: number;
  contentType?: string;
  scanStatus?: 'CLEAN' | 'INFECTED' | 'PENDING';
  status?: string;
}

export interface ScanResult {
  status: 'CLEAN' | 'INFECTED' | 'PENDING';
}

/**
 * Client for the real EasyDev File Upload Service (a separate repo).
 * Files are never stored locally; this only confirms presigned uploads and
 * queries/manages state the upstream service already owns.
 *
 * Auth (verified against that service's middleware/rbac.js
 * verifyGatewaySignature): NOT a Bearer token - an HMAC-SHA256 over
 * `${userId}:${userEmail}:${userRole}` using FILE_UPLOAD_HMAC_SECRET (same
 * secret name PaymentClient's gateway guard uses, but a different payload
 * shape - verify independently if it ever changes), plus the identity
 * headers themselves so the receiving side can recompute it. There's no
 * per-tenant end-user identity available for these backend-triggered calls,
 * so they all sign as a fixed `system`/admin identity - role must be one of
 * anonymous|user|admin (config/permissions.js's ROLES), and admin is
 * required for the delete routes this client uses.
 */
export class FileUploadClient extends BaseClient {
  private readonly hmacSecret?: string;
  private static readonly SERVICE_IDENTITY = {
    userId: 'system',
    userEmail: 'system@easydev.in',
    userRole: 'admin',
  };

  constructor(baseURL: string, hmacSecret?: string) {
    super(baseURL, 'FileUploadClient');
    this.hmacSecret = hmacSecret;
  }

  private headers(
    tenantId: string,
    tenantName?: string,
  ): Record<string, string> {
    const { userId, userEmail, userRole } = FileUploadClient.SERVICE_IDENTITY;
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-tenant-id': tenantId,
      ...(tenantName ? { 'x-tenant-name': tenantName } : {}),
      'x-user-id': userId,
      'x-user-email': userEmail,
      'x-user-role': userRole,
    };
    if (this.hmacSecret) {
      const payload = `${userId}:${userEmail}:${userRole}`;
      headers['x-gateway-hmac'] = createHmac('sha256', this.hmacSecret)
        .update(payload)
        .digest('hex');
    }
    return headers;
  }

  /**
   * Confirms a presigned upload the frontend already completed directly
   * against storage (POST /upload/presign/:id/confirm) and returns the
   * persisted file resource. `uploadReference` is the file id returned by
   * the earlier presign step.
   */
  async confirmUpload(
    tenantId: string,
    uploadReference: string,
    tenantName?: string,
  ): Promise<StorageReference> {
    const response = await this.request<{ data: StorageReference }>({
      method: 'POST',
      url: `/upload/presign/${encodeURIComponent(uploadReference)}/confirm`,
      headers: this.headers(tenantId, tenantName),
    });
    return response.data.data ?? (response.data as any);
  }

  /**
   * Resolves a redirect-based signed download URL (GET /:id/download
   * already does the signing server-side and 302s to it - this captures
   * the Location instead of following it).
   */
  async getSignedDownloadUrl(
    tenantId: string,
    fileId: string,
    tenantName?: string,
  ): Promise<string> {
    const response = await this.request<unknown>({
      method: 'GET',
      url: `/${encodeURIComponent(fileId)}/download`,
      headers: this.headers(tenantId, tenantName),
      maxRedirects: 0,
      validateStatus: (status) =>
        status === 302 || (status >= 200 && status < 300),
    });
    const location = (response.headers as Record<string, string>)?.location;
    if (location) return location;
    // Some adapters may serve the file directly with no redirect - fall back
    // to whatever URL the resource itself reports.
    const data = (response.data as any)?.data ?? response.data;
    if (data?.url) return data.url;
    throw new Error('File Upload Service did not return a download URL');
  }

  /**
   * scanStatus is a passive field set automatically by the upstream service
   * after upload (no action endpoint exists to "request" a scan) - this
   * just reads the current value.
   */
  async getScanStatus(
    tenantId: string,
    fileId: string,
    tenantName?: string,
  ): Promise<ScanResult> {
    const response = await this.request<{ data: StorageReference }>({
      method: 'GET',
      url: `/${encodeURIComponent(fileId)}`,
      headers: this.headers(tenantId, tenantName),
    });
    const file = response.data.data ?? (response.data as any);
    return { status: file.scanStatus || 'PENDING' };
  }

  /** Permanent delete (DELETE /:id/permanent) - requires the admin identity
   * this client always signs as. */
  async deleteFile(
    tenantId: string,
    fileId: string,
    tenantName?: string,
  ): Promise<void> {
    await this.request<unknown>({
      method: 'DELETE',
      url: `/${encodeURIComponent(fileId)}/permanent`,
      headers: this.headers(tenantId, tenantName),
    });
  }

  /** Liveness check - GET /health/live on this service's base health URL
   * (passed in separately since it's commonly a different host/path than
   * the API base URL). */
  async checkHealth(
    healthUrl: string,
  ): Promise<{ status: 'UP' | 'DOWN'; error?: string }> {
    try {
      await this.http.get(healthUrl, { timeout: 3000 });
      return { status: 'UP' };
    } catch (e: any) {
      return { status: 'DOWN', error: e.message };
    }
  }

  /**
   * Exercises this client's actual auth path (gateway HMAC + identity
   * headers) against a real route with sentinel values, for health checks
   * that need to prove credentials work, not just that the host answers.
   */
  async checkAuth(): Promise<AuthProbeResult> {
    return this.probeAuth({
      method: 'GET',
      url: `/${HEALTH_PROBE_FILE_ID}`,
      headers: this.headers(HEALTH_PROBE_TENANT_ID),
    });
  }
}
