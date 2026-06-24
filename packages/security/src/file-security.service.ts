import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class FileSecurityService {
  private readonly signedUrlSecret: string;
  private readonly defaultExpiryMs = 3600000; // 1 hour

  constructor() {
    if (!process.env.SIGNED_URL_SECRET) {
      throw new Error('SIGNED_URL_SECRET must be set - refusing to sign URLs with no configured secret');
    }
    this.signedUrlSecret = process.env.SIGNED_URL_SECRET;
  }

  validateFile(filename: string, mimeType: string, sizeInBytes: number, allowedMimeTypes: string[], maxSizeBytes: number): void {
    if (sizeInBytes > maxSizeBytes) {
      throw new BadRequestException(`File size exceeds limit: size ${sizeInBytes} bytes exceeds maximum ${maxSizeBytes} bytes`);
    }

    if (filename.includes('\0') || filename.includes('/') || filename.includes('\\')) {
      throw new BadRequestException('Invalid characters in filename');
    }

    const doubleExtensionRegex = /\.[a-zA-Z0-9]{2,4}\.[a-zA-Z0-9]{2,4}$/;
    if (doubleExtensionRegex.test(filename)) {
      throw new BadRequestException('Security violation: Double file extensions are blocked');
    }

    if (!allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(`MIME type ${mimeType} is not permitted for upload`);
    }
  }

  async scanForViruses(fileBuffer: Buffer): Promise<{ isClean: boolean; reason?: string }> {
    const signature = fileBuffer.slice(0, 4).toString('hex');
    const dangerousSignatures = ['4d5a', '7f454c46']; // PE executable (.exe), ELF
    if (dangerousSignatures.includes(signature)) {
      return { isClean: false, reason: 'Malicious executable signature detected' };
    }

    const eicarTestString = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    if (fileBuffer.toString('utf8').includes(eicarTestString)) {
      return { isClean: false, reason: 'EICAR test malware signature found' };
    }

    return { isClean: true };
  }

  generateSignedUrl(filePath: string, tenantId: string, expiryMs = this.defaultExpiryMs): string {
    const expires = Date.now() + expiryMs;
    const signPayload = `${filePath}:${tenantId}:${expires}`;
    
    const signature = crypto
      .createHmac('sha256', this.signedUrlSecret)
      .update(signPayload)
      .digest('hex');

    return `/secure-download?file=${encodeURIComponent(filePath)}&tenant=${tenantId}&expires=${expires}&sig=${signature}`;
  }

  validateSignedUrl(filePath: string, tenantId: string, expires: string, sig: string): boolean {
    const expiryTimestamp = parseInt(expires, 10);
    if (isNaN(expiryTimestamp) || expiryTimestamp < Date.now()) {
      throw new ForbiddenException('Signed URL has expired');
    }

    const signPayload = `${filePath}:${tenantId}:${expires}`;
    const computedSig = crypto
      .createHmac('sha256', this.signedUrlSecret)
      .update(signPayload)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(computedSig, 'hex'));
    if (!isValid) {
      throw new ForbiddenException('Invalid signed URL signature');
    }

    return true;
  }
}
