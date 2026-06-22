import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { IWidgetRepository } from '../repositories/widget-repository.interface';
import { WidgetInstallation } from '../domain/entities';
import { WidgetEventPublisher } from './widget-event.publisher';
import { WidgetInstalledEvent } from '@easydev/shared-events';
import { CreateInstallationDto } from '../dtos/widget.dto';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class WidgetInstallationService {
  private readonly logger = new Logger(WidgetInstallationService.name);

  constructor(
    @Inject('IWidgetRepository')
    private readonly widgetRepo: IWidgetRepository,
    private readonly eventPublisher: WidgetEventPublisher,
  ) {}

  async createInstallation(
    tenantId: string,
    dto: CreateInstallationDto,
  ): Promise<WidgetInstallation> {
    let installation = await this.widgetRepo.getInstallationByDomain(
      tenantId,
      dto.domain,
    );
    if (!installation) {
      installation = new WidgetInstallation(uuidv4(), {
        tenantId,
        domain: dto.domain,
        status: 'PENDING',
        verificationToken: `easydev-verify-${crypto.randomBytes(16).toString('hex')}`,
      });
      await this.widgetRepo.saveInstallation(installation);
    }
    return installation;
  }

  async verifyInstallation(
    tenantId: string,
    domain: string,
  ): Promise<WidgetInstallation> {
    const installation = await this.widgetRepo.getInstallationByDomain(
      tenantId,
      domain,
    );
    if (!installation) {
      throw new NotFoundException(
        `Installation for domain ${domain} not found`,
      );
    }

    if (installation.status === 'ACTIVE') {
      return installation;
    }

    // Try to verify domain by loading verification token from client domain
    // Usually verified by requesting: http(s)://<domain>/easydev-widget-verify.txt or checking metadata
    // For production-ready, we fetch verification URL with safe timeout/limits
    try {
      const verifyUrl = `https://${domain}/easydev-widget-verify.txt`;
      const response = await axios.get(verifyUrl, { timeout: 5000 });
      if (response.data?.trim() === installation.verificationToken) {
        installation.verify();
        await this.widgetRepo.saveInstallation(installation);
        await this.eventPublisher.publish(
          new WidgetInstalledEvent(tenantId, installation.id, domain),
        );
        return installation;
      }
    } catch (e: any) {
      this.logger.warn(
        `Verification via HTTPS failed for domain ${domain}: ${e.message}. Retrying HTTP fallback.`,
      );
    }

    try {
      const verifyUrl = `http://${domain}/easydev-widget-verify.txt`;
      const response = await axios.get(verifyUrl, { timeout: 5000 });
      if (response.data?.trim() === installation.verificationToken) {
        installation.verify();
        await this.widgetRepo.saveInstallation(installation);
        await this.eventPublisher.publish(
          new WidgetInstalledEvent(tenantId, installation.id, domain),
        );
        return installation;
      }
    } catch (e: any) {
      this.logger.warn(
        `Verification via HTTP failed for domain ${domain}: ${e.message}`,
      );
    }

    throw new BadRequestException(
      'Verification token not found on the client domain. Make sure the verify file exists.',
    );
  }

  generateInstallationScript(tenantId: string, domain: string): string {
    const baseUrl = process.env.API_BASE_URL || 'https://api.easydev.ai';
    return `
<!-- EasyDev Support AI Widget -->
<script type="text/javascript">
  (function(w,d,s,u,g,a,m){
    w['EasyDevSupportAIObject']=g;w[g]=w[g]||function(){
    (w[g].q=w[g].q||[]).push(arguments)},w[g].l=1*new Date();
    a=d.createElement(s),m=d.getElementsByTagName(s)[0];
    a.async=1;a.src=u;m.parentNode.insertBefore(a,m)
  })(window,document,'script','${baseUrl}/widget/loader.js','easydev');
  easydev('init', {
    tenantId: '${tenantId}',
    domain: '${domain}'
  });
</script>
<!-- End EasyDev Support AI Widget -->
    `.trim();
  }
}
