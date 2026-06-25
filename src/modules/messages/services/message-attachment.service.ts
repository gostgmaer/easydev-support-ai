import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import {
  AttachmentUploadedEvent,
  AttachmentDeletedEvent,
} from '@easydev/shared-events';
import type { IMessageRepository } from '../repositories/message-repository.interface';
import { MessageAttachment } from '../domain/message-attachment.entity';
import { RegisterAttachmentDto } from '../dtos';
import { MessageEventPublisher } from './message-event.publisher';
import { MessageReadModelService } from './message-read-model.service';
import { FileUploadIntegrationService } from '../../../integration/file-upload/file-upload.service';
import { AuditService } from '../../audit/audit.service';

const MEDIA_THUMBNAIL_TYPES = ['image/', 'video/'];

@Injectable()
export class MessageAttachmentService {
  private readonly logger = new Logger(MessageAttachmentService.name);

  constructor(
    @Inject('IMessageRepository')
    private readonly messageRepo: IMessageRepository,
    private readonly fileUpload: FileUploadIntegrationService,
    private readonly queueService: QueueService,
    private readonly eventPublisher: MessageEventPublisher,
    private readonly readModel: MessageReadModelService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Persists a storage reference for a file already uploaded to the EasyDev
   * File Upload Service, then enqueues post-processing (virus scan + thumbnail).
   * Files are never stored locally.
   */
  async register(
    tenantId: string,
    messageId: string,
    dto: RegisterAttachmentDto,
    userId?: string,
  ): Promise<MessageAttachment> {
    const message = await this.messageRepo.findById(messageId, tenantId);
    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    const storageRef = await this.fileUpload.finalizeUpload(
      tenantId,
      dto.uploadReference,
    );

    const attachment = new MessageAttachment(randomUUID(), {
      tenantId,
      messageId,
      fileName: dto.fileName,
      fileType: dto.fileType || storageRef.contentType,
      fileSize: dto.fileSize ?? storageRef.fileSize,
      storageProvider: storageRef.storageProvider,
      storagePath: storageRef.storagePath,
      publicUrl: storageRef.publicUrl,
      checksum: storageRef.checksum,
      thumbnailUrl: storageRef.thumbnailUrl,
      metadata: dto.metadata || {},
    });

    return this.persistAndNotify(attachment, message.conversationId, userId);
  }

  /**
   * Registers a file already saved to local disk (e.g. by a multer
   * diskStorage interceptor) - for surfaces with no External File Upload
   * Service integration of their own, such as the widget. Skips the
   * EasyDev File Upload Service entirely; process() correspondingly skips
   * its virus-scan/thumbnail hooks for LOCAL-provider attachments.
   */
  async registerLocal(
    tenantId: string,
    messageId: string,
    file: {
      fileName: string;
      fileType?: string;
      fileSize?: number;
      storagePath: string;
      publicUrl: string;
    },
    userId?: string,
  ): Promise<MessageAttachment> {
    const message = await this.messageRepo.findById(messageId, tenantId);
    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    const attachment = new MessageAttachment(randomUUID(), {
      tenantId,
      messageId,
      fileName: file.fileName,
      fileType: file.fileType,
      fileSize: file.fileSize,
      storageProvider: 'LOCAL',
      storagePath: file.storagePath,
      publicUrl: file.publicUrl,
      metadata: {},
    });

    return this.persistAndNotify(attachment, message.conversationId, userId);
  }

  private async persistAndNotify(
    attachment: MessageAttachment,
    conversationId: string,
    userId?: string,
  ): Promise<MessageAttachment> {
    const tenantId = attachment.tenantId;
    await this.messageRepo.saveAttachment(attachment, tenantId);
    await this.readModel.refresh(tenantId, conversationId);

    await this.queueService.addJob(
      QUEUES.MESSAGE,
      'attachment-processing-job',
      { attachmentId: attachment.id },
    );

    await this.eventPublisher.publish(
      new AttachmentUploadedEvent(
        tenantId,
        attachment.id,
        attachment.messageId,
        attachment.fileName,
      ),
    );

    await this.auditService.log({
      tenantId,
      userId,
      action: 'ATTACHMENT_UPLOAD',
      details: `Registered attachment ${attachment.id} on message ${attachment.messageId}`,
    });

    return attachment;
  }

  /**
   * Worker path: virus scan hook + metadata/thumbnail generation hook.
   */
  async process(tenantId: string, attachmentId: string): Promise<void> {
    const attachment = await this.messageRepo.getAttachment(
      tenantId,
      attachmentId,
    );
    if (!attachment || !attachment.storagePath) return;
    // LOCAL-provider attachments (e.g. widget uploads) aren't managed by the
    // External File Upload Service, so its scan/thumbnail hooks don't apply.
    if (attachment.storageProvider === 'LOCAL') return;

    const scan = await this.fileUpload.requestVirusScan(
      tenantId,
      attachment.storagePath,
    );
    if (scan.status === 'INFECTED') {
      this.logger.warn(
        `Attachment ${attachmentId} flagged INFECTED; removing from storage`,
      );
      await this.fileUpload.deleteFile(tenantId, attachment.storagePath);
      await this.messageRepo.deleteAttachment(tenantId, attachmentId);
      return;
    }

    const fileType = attachment.fileType || '';
    if (MEDIA_THUMBNAIL_TYPES.some((prefix) => fileType.startsWith(prefix))) {
      const { thumbnailUrl } = await this.fileUpload.requestThumbnail(
        tenantId,
        attachment.storagePath,
      );
      attachment.attachThumbnail(thumbnailUrl);
      await this.messageRepo.saveAttachment(attachment, tenantId);
    }
  }

  async list(
    tenantId: string,
    messageId: string,
  ): Promise<MessageAttachment[]> {
    return this.messageRepo.findAttachments(tenantId, messageId);
  }

  async getSignedUrl(
    tenantId: string,
    attachmentId: string,
    expiresInSeconds = 900,
  ): Promise<{ url: string }> {
    const attachment = await this.messageRepo.getAttachment(
      tenantId,
      attachmentId,
    );
    if (!attachment || !attachment.storagePath) {
      throw new NotFoundException(`Attachment ${attachmentId} not found`);
    }
    // LOCAL-provider attachments already have a permanent, directly-servable
    // publicUrl (no signing concept applies - they're served as static assets).
    if (attachment.storageProvider === 'LOCAL') {
      return { url: attachment.publicUrl! };
    }
    const url = await this.fileUpload.generateSignedUrl(
      tenantId,
      attachment.storagePath,
      expiresInSeconds,
    );
    return { url };
  }

  async delete(
    tenantId: string,
    attachmentId: string,
    userId?: string,
  ): Promise<boolean> {
    const attachment = await this.messageRepo.getAttachment(
      tenantId,
      attachmentId,
    );
    if (!attachment) {
      throw new NotFoundException(`Attachment ${attachmentId} not found`);
    }
    if (attachment.storagePath && attachment.storageProvider === 'LOCAL') {
      await fs.unlink(attachment.storagePath).catch(() => undefined);
    } else if (attachment.storagePath) {
      await this.fileUpload.deleteFile(tenantId, attachment.storagePath);
    }
    const deleted = await this.messageRepo.deleteAttachment(
      tenantId,
      attachmentId,
    );
    const owner = await this.messageRepo.findById(
      attachment.messageId,
      tenantId,
    );
    if (owner) {
      await this.readModel.refresh(tenantId, owner.conversationId);
    }

    await this.eventPublisher.publish(
      new AttachmentDeletedEvent(tenantId, attachmentId, attachment.messageId),
    );
    await this.auditService.log({
      tenantId,
      userId,
      action: 'ATTACHMENT_DELETE',
      details: `Deleted attachment ${attachmentId}`,
    });
    return deleted;
  }
}
