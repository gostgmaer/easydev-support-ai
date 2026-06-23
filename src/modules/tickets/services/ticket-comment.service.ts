import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { ITicketRepository } from '../repositories/ticket-repository.interface';
import { Ticket } from '../domain/ticket.aggregate';
import { TicketComment } from '../domain/ticket-comment.entity';
import { TicketAttachment } from '../domain/ticket-attachment.entity';
import { AddTicketCommentDto, AddTicketAttachmentDto } from '../dtos';
import { TicketEventPublisher } from './ticket-event.publisher';
import { FileUploadIntegrationService } from '../../../integration/file-upload/file-upload.service';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class TicketCommentService {
  constructor(
    @Inject('ITicketRepository')
    private readonly ticketRepo: ITicketRepository,
    private readonly eventPublisher: TicketEventPublisher,
    private readonly fileUpload: FileUploadIntegrationService,
    private readonly auditService: AuditService,
  ) {}

  private async getOrThrow(tenantId: string, id: string): Promise<Ticket> {
    const ticket = await this.ticketRepo.findById(id, tenantId);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    return ticket;
  }

  async addComment(
    tenantId: string,
    ticketId: string,
    dto: AddTicketCommentDto,
    authorId: string,
  ): Promise<TicketComment> {
    const ticket = await this.getOrThrow(tenantId, ticketId);
    const comment = new TicketComment(randomUUID(), {
      tenantId,
      ticketId,
      authorId,
      comment: dto.comment,
      visibility: dto.visibility || 'PUBLIC',
      attachmentsCount: 0,
    });

    ticket.addComment(comment);
    await this.ticketRepo.save(ticket, tenantId);
    await this.eventPublisher.publishAll(ticket.domainEvents);
    ticket.clearEvents();

    await this.auditService.log({
      tenantId,
      userId: authorId,
      action: 'TICKET_COMMENT',
      details: `Added ${comment.visibility} comment to ticket ${ticketId}`,
    });
    return comment;
  }

  async listComments(
    tenantId: string,
    ticketId: string,
    options?: { customerVisibleOnly?: boolean },
  ) {
    return this.ticketRepo.findComments(tenantId, ticketId, options);
  }

  /**
   * Registers a file already uploaded to the EasyDev File Upload Service against
   * a ticket (optionally tied to a comment). Files are never stored locally.
   */
  async addAttachment(
    tenantId: string,
    ticketId: string,
    dto: AddTicketAttachmentDto,
    userId?: string,
  ): Promise<TicketAttachment> {
    await this.getOrThrow(tenantId, ticketId);

    const storageRef = await this.fileUpload.finalizeUpload(
      tenantId,
      dto.uploadReference,
    );

    const attachment = new TicketAttachment(randomUUID(), {
      tenantId,
      ticketId,
      commentId: dto.commentId,
      fileName: dto.fileName,
      fileType: dto.fileType || storageRef.contentType,
      fileSize: dto.fileSize ?? storageRef.fileSize,
      fileUrl: storageRef.publicUrl,
      checksum: storageRef.checksum,
    });

    await this.ticketRepo.addAttachment(attachment, tenantId);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_ATTACHMENT',
      details: `Added attachment ${attachment.id} to ticket ${ticketId}`,
    });
    return attachment;
  }

  async listAttachments(tenantId: string, ticketId: string) {
    return this.ticketRepo.findAttachments(tenantId, ticketId);
  }
}
