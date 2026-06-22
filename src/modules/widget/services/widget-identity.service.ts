import {
  Injectable,
  Inject,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import type { IWidgetRepository } from '../repositories/widget-repository.interface';
import { WidgetIdentity, WidgetVisitor } from '../domain/entities';
import { WidgetConfigService } from './widget-config.service';
import { IdentifyVisitorDto } from '../dtos/widget.dto';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WidgetIdentityService {
  private readonly logger = new Logger(WidgetIdentityService.name);

  constructor(
    @Inject('IWidgetRepository')
    private readonly widgetRepo: IWidgetRepository,
    private readonly configService: WidgetConfigService,
  ) {}

  async verifyAndResolveIdentity(
    tenantId: string,
    dto: IdentifyVisitorDto,
  ): Promise<WidgetIdentity | null> {
    if (!dto.externalUserId || !dto.signature) {
      return null;
    }

    // Load widget config containing the real, randomly-generated verification
    // secret (never exposed via the public config endpoint - the tenant's own
    // backend retrieves it once via the admin config endpoint and uses it to
    // sign identified-visitor requests server-side, the same pattern Intercom/
    // Zendesk use for "secure mode" identity verification).
    const config = await this.configService.getOrCreateConfig(tenantId);
    const verificationSecret = config.identityVerificationSecret;
    if (!verificationSecret) {
      throw new UnauthorizedException(
        'Identity verification is not configured for this tenant',
      );
    }

    // Expected signature: HMAC SHA256 of externalUserId (+ optional email)
    const expectedSignature = crypto
      .createHmac('sha256', verificationSecret)
      .update(`${dto.externalUserId}:${dto.email || ''}`)
      .digest('hex');

    if (dto.signature !== expectedSignature) {
      this.logger.warn(
        `Verification signature mismatch for external user: ${dto.externalUserId}`,
      );
      throw new UnauthorizedException('Invalid verification signature');
    }

    // Resolve or create visitor matching external user identity
    const visitor = await this.widgetRepo.getVisitorByAnonymousId(
      tenantId,
      dto.anonymousId,
    );
    if (!visitor) {
      throw new UnauthorizedException('Visitor session not started');
    }

    let identity = await this.widgetRepo.getIdentityByVisitor(
      tenantId,
      visitor.id,
    );
    if (!identity) {
      identity = new WidgetIdentity(uuidv4(), {
        tenantId,
        visitorId: visitor.id,
        externalUserId: dto.externalUserId,
        verificationMethod: dto.verificationMethod || 'HMAC_SHA256',
        verifiedAt: new Date(),
      });
      await this.widgetRepo.saveIdentity(identity);
    }

    return identity;
  }
}
