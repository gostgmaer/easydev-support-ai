import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

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
  scanId?: string;
}

/**
 * Thin HTTP client for the shared EasyDev File Upload Service. Files are never
 * stored locally; this adapter only resolves storage references, signed URLs
 * and post-processing hooks (virus scan, thumbnail) against the upstream
 * service configured via FILE_UPLOAD_SERVICE_URL.
 */
@Injectable()
export class FileUploadIntegrationService {
  private readonly logger = new Logger(FileUploadIntegrationService.name);
  private readonly baseUrl =
    process.env.FILE_UPLOAD_SERVICE_URL || 'http://easydev-file-upload:8080';
  private readonly apiKey = process.env.FILE_UPLOAD_SERVICE_API_KEY || '';

  private headers(tenantId: string): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-tenant-id': tenantId,
      ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
    };
  }

  private async request<T>(
    method: string,
    path: string,
    tenantId: string,
    body?: unknown,
  ): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: this.headers(tenantId),
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `File Upload Service responded ${response.status}: ${text}`,
        );
      }
      return (await response.json()) as T;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`File Upload Service request failed: ${message}`);
      throw new ServiceUnavailableException(
        'File Upload Service is unavailable',
      );
    }
  }

  /**
   * Confirms an upload performed by the client against the File Upload Service
   * and returns the persisted storage reference.
   */
  async finalizeUpload(
    tenantId: string,
    uploadReference: string,
  ): Promise<StorageReference> {
    return this.request<StorageReference>(
      'POST',
      `/v1/uploads/${encodeURIComponent(uploadReference)}/finalize`,
      tenantId,
    );
  }

  /** Generates a time-limited signed URL for a stored object. */
  async generateSignedUrl(
    tenantId: string,
    storagePath: string,
    expiresInSeconds = 900,
  ): Promise<string> {
    const result = await this.request<{ url: string }>(
      'POST',
      `/v1/files/signed-url`,
      tenantId,
      { storagePath, expiresInSeconds },
    );
    return result.url;
  }

  /** Virus scan hook — enqueues/queries a scan for the stored object. */
  async requestVirusScan(
    tenantId: string,
    storagePath: string,
  ): Promise<ScanResult> {
    return this.request<ScanResult>('POST', `/v1/files/scan`, tenantId, {
      storagePath,
    });
  }

  /** Thumbnail generation hook for image/video attachments. */
  async requestThumbnail(
    tenantId: string,
    storagePath: string,
  ): Promise<{ thumbnailUrl: string }> {
    return this.request<{ thumbnailUrl: string }>(
      'POST',
      `/v1/files/thumbnail`,
      tenantId,
      { storagePath },
    );
  }

  async deleteFile(tenantId: string, storagePath: string): Promise<void> {
    await this.request<{ deleted: boolean }>(
      'DELETE',
      `/v1/files?storagePath=${encodeURIComponent(storagePath)}`,
      tenantId,
    );
  }
}
