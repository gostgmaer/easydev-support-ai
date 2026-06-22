import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KnowledgeSearchService } from '../../knowledge-base/services/knowledge-search.service';
import { KnowledgeDocumentService } from '../../knowledge-base/services/knowledge-document.service';
import { AIPlatformClient } from '../../ai-integration/services/ai-platform.client';
import { CustomerService } from '../../customers/services/customer.service';
import { TicketService } from '../../tickets/services/ticket.service';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import { DocumentStatusEnum } from '../../knowledge-base/domain/value-objects';
import { TicketPriorityEnum, TicketSourceEnum } from '../../tickets/domain/value-objects';
import {
  HelpCenterAiAssistRequestedEvent,
  HelpCenterAiAssistCompletedEvent,
  TicketDeflectedEvent,
} from '@easydev/shared-events';
import * as crypto from 'crypto';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export class PublicAiAssistDto {
  @ApiProperty({ description: 'The customer question or query' })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({ description: 'Previous session ID for conversation continuity' })
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Category to restrict knowledge search' })
  @IsString()
  @IsOptional()
  categoryId?: string;
}

export class PublicDeflectionFeedbackDto {
  @ApiProperty({ description: 'Session ID returned by AI assist' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ description: 'Whether the article resolved the issue (true = deflected)' })
  resolved: boolean;

  @ApiPropertyOptional({ description: 'Document ID that resolved the issue' })
  @IsString()
  @IsOptional()
  documentId?: string;

  @ApiPropertyOptional({ description: 'Customer email if they want follow-up' })
  @IsString()
  @IsOptional()
  email?: string;
}

interface KnowledgeSearchResult {
  document: { id: string; title: string; slug: string };
  score: number;
}

/**
 * PublicHelpAiAssistController  (FLOW 5)
 *
 * Flow: Help Center Visit → Knowledge Search → No Results / Low Confidence
 *       → AI Assistance → Escalate to Contact Form → Ticket Created
 *
 * This controller provides the AI fallback for anonymous visitors who can't
 * find answers in the public knowledge base.  No IAM authentication required
 * (public surface), throttled per-IP to prevent abuse.
 */
@ApiTags('Public Help Center – AI Assist')
@ApiHeader({ name: 'x-tenant-id', required: true })
@Controller('v1/public/ai-assist')
export class PublicHelpAiAssistController {
  constructor(
    private readonly searchService: KnowledgeSearchService,
    private readonly documentService: KnowledgeDocumentService,
    private readonly aiClient: AIPlatformClient,
    private readonly customerService: CustomerService,
    private readonly ticketService: TicketService,
    private readonly queueService: QueueService,
  ) {}

  private requireTenant(tenantId: string): void {
    if (!tenantId) throw new BadRequestException('Missing x-tenant-id header');
  }

  /**
   * POST /v1/public/ai-assist/query
   *
   * 1. Search the knowledge base for relevant published articles.
   * 2. If high-confidence matches found → return them (potential deflection).
   * 3. If no matches / low confidence → call AI Platform for a direct answer.
   * 4. Return AI answer + source documents + escalation prompt.
   *
   * Throttled to 20 requests per IP per minute to prevent abuse.
   */
  @ApiOperation({ summary: 'AI-powered help center query (FLOW 5)' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('query')
  @HttpCode(HttpStatus.OK)
  async query(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: PublicAiAssistDto,
  ) {
    this.requireTenant(tenantId);

    const sessionId = dto.sessionId || crypto.randomUUID();

    // Publish assist requested event (informational, async)
    await this.tryPublishEvent(tenantId, {
      event: HelpCenterAiAssistRequestedEvent.eventName,
      sessionId,
      tenantId,
      query: dto.query,
    });

    // ─── Step 1: Search Knowledge Base ────────────────────────────────────
    // search() returns a bare array of { document, score }, not a wrapper object.
    const searchResults = await this.searchService.search(tenantId, {
      query: dto.query,
      categoryId: dto.categoryId,
      status: DocumentStatusEnum.ACTIVE,
    });
    const docs: KnowledgeSearchResult[] = Array.isArray(searchResults) ? searchResults : [];
    const topResult = docs[0];

    // High-confidence KB match — return the article directly
    if (topResult && (topResult.score || 0) >= 0.75) {
      const content = await this.documentService.getDocumentContent(tenantId, topResult.document.id);
      const result = {
        sessionId,
        answer: content.slice(0, 500),
        confidence: 'HIGH' as const,
        sources: docs.slice(0, 3).map((r) => ({
          id: r.document.id,
          title: r.document.title,
          slug: r.document.slug,
          score: r.score,
        })),
        suggestEscalation: false,
      };

      await this.tryPublishEvent(tenantId, {
        event: HelpCenterAiAssistCompletedEvent.eventName,
        sessionId,
        tenantId,
        answer: result.answer,
        escalated: false,
      });

      return result;
    }

    // ─── Step 2: AI Platform Direct Answer ────────────────────────────────
    let aiAnswer = '';
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

    try {
      const contextDocs = await Promise.all(
        docs.slice(0, 5).map(async (r) => ({
          title: r.document.title,
          content: (await this.documentService.getDocumentContent(tenantId, r.document.id)).slice(0, 800),
        })),
      );

      const baseSystemPrompt = 'You are a helpful customer support assistant for the help center.';
      const systemPrompt = contextDocs.length
        ? `${baseSystemPrompt}\n\nUse the following knowledge base articles to answer the customer's question if relevant. Ignore them if they don't apply:\n\n${contextDocs.map((d) => `${d.title}\n${d.content}`).join('\n\n')}`
        : baseSystemPrompt;

      const generateResult = await this.aiClient.generate(tenantId, dto.query, systemPrompt);

      aiAnswer = generateResult.text || '';
      confidence = (generateResult.confidence || 0) >= 0.6 ? 'MEDIUM' : 'LOW';
    } catch {
      // Non-fatal: fall through to escalation prompt
      aiAnswer = '';
      confidence = 'LOW';
    }

    const suggestEscalation = confidence === 'LOW' || !aiAnswer;

    await this.tryPublishEvent(tenantId, {
      event: HelpCenterAiAssistCompletedEvent.eventName,
      sessionId,
      tenantId,
      answer: aiAnswer,
      escalated: suggestEscalation,
    });

    return {
      sessionId,
      answer: aiAnswer || null,
      confidence,
      sources: docs.slice(0, 3).map((r) => ({
        id: r.document.id,
        title: r.document.title,
        slug: r.document.slug,
        score: r.score,
      })),
      suggestEscalation,
      escalationPrompt: suggestEscalation
        ? 'We couldn\'t find a definitive answer. Would you like to contact our support team?'
        : null,
    };
  }

  /**
   * POST /v1/public/ai-assist/deflection-feedback
   *
   * Customer confirms that an article resolved their issue (ticket deflected)
   * OR indicates they still need help (escalate to ticket creation).
   */
  @ApiOperation({ summary: 'Submit deflection outcome (FLOW 5)' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('deflection-feedback')
  @HttpCode(HttpStatus.OK)
  async deflectionFeedback(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: PublicDeflectionFeedbackDto,
  ) {
    this.requireTenant(tenantId);

    if (dto.resolved && dto.documentId) {
      // Ticket deflected — emit event and update analytics
      await this.tryPublishEvent(tenantId, {
        event: TicketDeflectedEvent.eventName,
        sessionId: dto.sessionId,
        tenantId,
        documentId: dto.documentId,
      });

      await this.queueService.addJob(QUEUES.ANALYTICS, 'ticket-deflected', {
        tenantId,
        sessionId: dto.sessionId,
        documentId: dto.documentId,
      });

      return { deflected: true, message: 'Great! Glad we could help.' };
    }

    // Not resolved → create a ticket on behalf of the visitor
    let customer = dto.email
      ? await this.customerService.findByEmail(tenantId, dto.email)
      : null;

    if (!customer && dto.email) {
      customer = await this.customerService.create(tenantId, {
        email: dto.email,
        source: 'HELP_CENTER',
      });
    }

    if (customer) {
      const ticket = await this.ticketService.create(tenantId, {
        subject: 'Help Center: Question could not be answered by AI',
        description: `Session: ${dto.sessionId}`,
        customerId: customer.id,
        priority: TicketPriorityEnum.MEDIUM,
        source: TicketSourceEnum.API,
      });

      return {
        deflected: false,
        ticketId: ticket.id,
        message:
          'A support ticket has been created. Our team will get back to you shortly.',
      };
    }

    return {
      deflected: false,
      message:
        'Please contact our support team directly for further assistance.',
    };
  }

  private async tryPublishEvent(tenantId: string, payload: Record<string, unknown>): Promise<void> {
    try {
      await this.queueService.addJob(QUEUES.ANALYTICS, 'helpcenter-event', {
        tenantId,
        ...payload,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Non-fatal analytics fire-and-forget
    }
  }
}
