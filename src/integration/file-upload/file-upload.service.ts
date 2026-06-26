import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { FileUploadClient } from '@easydev/shared-clients';
import { TenantSettingsService } from '../../modules/settings/services/tenant-settings.service';

export interface StorageReference {
  storageProvider: string;
  storagePath: string;
  publicUrl?: string;
  checksum?: string;
  fileSize?: number;
  contentType?: string;
  thumbnailUrl?: string;
}

export interface ScanResult {
  status: 'CLEAN' | 'INFECTED' | 'PENDING';
}

/**
 * Thin wrapper around FileUploadClient (packages/shared-clients) that adds
 * tenant-name resolution (needs TenantSettingsService, a NestJS DI service
 * the plain shared client can't depend on) and maps the real service's
 * resource shape onto this app's existing StorageReference/ScanResult
 * contracts so callers (knowledge-base, messages, tickets) didn't need to
 * change at all.
 *
 * `storagePath` here is repurposed to hold the file's real id (the only
 * thing every follow-up call - download/delete/status - actually needs),
 * not the provider's storageKey - verified against the real service's
 * fileController.js, which keys every other route off :id, not storageKey.
 */
@Injectable()
export class FileUploadIntegrationService {
  private readonly logger = new Logger(FileUploadIntegrationService.name);
  private readonly client: FileUploadClient;

  constructor(private readonly tenantSettingsService: TenantSettingsService) {
    const baseUrl = (
      process.env.FILE_UPLOAD_SERVICE_URL || 'http://easydev-file-upload:8080'
    ).replace(/\/+$/, '');
    // Real service mounts file routes at /api/files (app.js:
    // app.use('/api/files', fileRoutes)) - every relative path in
    // FileUploadClient assumes that prefix is already in the base URL.
    this.client = new FileUploadClient(
      `${baseUrl}/api/files`,
      process.env.FILE_UPLOAD_HMAC_SECRET,
    );
  }

  private async resolveTenantName(
    tenantId: string,
  ): Promise<string | undefined> {
    try {
      return (await this.tenantSettingsService.getSettings(tenantId))
        .tenantName;
    } catch (err: any) {
      this.logger.warn(
        `Failed to resolve tenant name for ${tenantId}: ${err.message}`,
      );
      return undefined;
    }
  }

  /**
   * Confirms an upload the frontend already completed directly against
   * storage via a presigned URL, and returns a storage reference. Retries
   * are handled inside BaseClient (circuit breaker + backoff), shared with
   * every other client in this package.
   */
  async finalizeUpload(
    tenantId: string,
    uploadReference: string,
  ): Promise<StorageReference> {
    try {
      const tenantName = await this.resolveTenantName(tenantId);
      const file = await this.client.confirmUpload(
        tenantId,
        uploadReference,
        tenantName,
      );
      return {
        storageProvider: 'EXTERNAL',
        storagePath: file.id,
        publicUrl: file.publicUrl,
        fileSize: file.fileSize,
        contentType: file.contentType,
      };
    } catch (e: any) {
      this.logger.error(`finalizeUpload failed: ${e.message}`);
      throw new ServiceUnavailableException(
        'File Upload Service is unavailable',
      );
    }
  }

  /**
   * Generates a time-limited signed URL for a stored object (storagePath
   * here is the file id - see class docstring). No expiresInSeconds param -
   * the real service's /:id/download signs and redirects with its own
   * fixed expiry server-side, no per-request override exists.
   */
  async generateSignedUrl(
    tenantId: string,
    storagePath: string,
  ): Promise<string> {
    try {
      const tenantName = await this.resolveTenantName(tenantId);
      return await this.client.getSignedDownloadUrl(
        tenantId,
        storagePath,
        tenantName,
      );
    } catch (e: any) {
      this.logger.error(`generateSignedUrl failed: ${e.message}`);
      throw new ServiceUnavailableException(
        'File Upload Service is unavailable',
      );
    }
  }

  /**
   * scanStatus is set automatically by the upstream service after upload -
   * there's no action endpoint to "request" one, this just reads the
   * current value (kept as a method named requestVirusScan so callers,
   * which poll it the same way, didn't need to change).
   */
  async requestVirusScan(
    tenantId: string,
    storagePath: string,
  ): Promise<ScanResult> {
    try {
      const tenantName = await this.resolveTenantName(tenantId);
      return await this.client.getScanStatus(tenantId, storagePath, tenantName);
    } catch (e: any) {
      this.logger.error(`requestVirusScan failed: ${e.message}`);
      throw new ServiceUnavailableException(
        'File Upload Service is unavailable',
      );
    }
  }

  /**
   * KNOWN GAP: the real file-upload-service has no thumbnail generation
   * capability at all (verified against its source - no field, no route).
   * No-op with a clear log instead of calling an endpoint that doesn't
   * exist, until a real thumbnail pipeline exists somewhere.
   */
  requestThumbnail(
    tenantId: string,
    storagePath: string,
  ): Promise<{ thumbnailUrl?: string }> {
    this.logger.warn(
      `Thumbnail request for ${storagePath} (tenant ${tenantId}) skipped - file-upload-service has no thumbnail capability`,
    );
    return Promise.resolve({ thumbnailUrl: undefined });
  }

  async deleteFile(tenantId: string, storagePath: string): Promise<void> {
    try {
      const tenantName = await this.resolveTenantName(tenantId);
      await this.client.deleteFile(tenantId, storagePath, tenantName);
    } catch (e: any) {
      this.logger.error(`deleteFile failed: ${e.message}`);
      throw new ServiceUnavailableException(
        'File Upload Service is unavailable',
      );
    }
  }
}
