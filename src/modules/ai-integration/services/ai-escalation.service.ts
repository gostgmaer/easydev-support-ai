import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import type { IAiRepository } from '../repositories/ai-repository.interface';
import { AiEscalation } from '../domain/entities';
import {
  EscalationStatusEnum,
  EscalationTargetEnum,
} from '../domain/value-objects';
import { AiEventPublisher } from './ai-event.publisher';
import {
  AiEscalationCreatedEvent,
  AiEscalationResolvedEvent,
} from '@easydev/shared-events';
import { CustomerService } from '../../customers/services/customer.service';
import { ConversationService } from '../../conversations/services/conversation.service';
import * as crypto from 'crypto';

@Injectable()
export class AiEscalationService {
  private readonly logger = new Logger(AiEscalationService.name);

  constructor(
    @Inject('IAiRepository')
    private readonly repository: IAiRepository,
    private readonly customerService: CustomerService,
    private readonly conversationService: ConversationService,
    private readonly eventPublisher: AiEventPublisher,
  ) {}

  public async evaluateEscalation(
    tenantId: string,
    conversationId: string,
    messageText: string,
    confidenceScore?: number,
    sentimentScore?: number,
  ): Promise<boolean> {
    this.logger.log(`Evaluating escalation for conversation ${conversationId}`);

    // Rule 1: Human request keyword matching
    const humanRegex =
      /\b(human|agent|person|representative|operator|support staff|real person)\b/i;
    if (humanRegex.test(messageText)) {
      await this.createEscalation(
        tenantId,
        conversationId,
        'User explicitly requested a human agent',
        confidenceScore,
        sentimentScore,
        EscalationTargetEnum.AGENT,
      );
      return true;
    }

    // Rule 2: Low confidence score
    if (confidenceScore !== undefined && confidenceScore < 0.5) {
      await this.createEscalation(
        tenantId,
        conversationId,
        `AI low confidence score: ${confidenceScore}`,
        confidenceScore,
        sentimentScore,
        EscalationTargetEnum.TEAM,
      );
      return true;
    }

    // Rule 3: Highly negative sentiment
    if (sentimentScore !== undefined && sentimentScore < -0.6) {
      await this.createEscalation(
        tenantId,
        conversationId,
        `Customer negative sentiment: ${sentimentScore}`,
        confidenceScore,
        sentimentScore,
        EscalationTargetEnum.MANAGER,
      );
      return true;
    }

    // Rule 4: VIP customer check
    try {
      const conv = await this.conversationService.findById(
        tenantId,
        conversationId,
      );
      if (conv?.customerId) {
        const customer = await this.customerService.findById(
          tenantId,
          conv.customerId,
        );
        const metadata = customer.metadata || {};
        if (metadata.isVip || metadata.vip || metadata.tier === 'VIP') {
          await this.createEscalation(
            tenantId,
            conversationId,
            'VIP Customer conversation requires human routing',
            confidenceScore,
            sentimentScore,
            EscalationTargetEnum.AGENT,
          );
          return true;
        }
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to inspect customer for VIP status: ${err.message}`,
      );
    }

    // Rule 5: Policy violation keywords
    const violationRegex =
      /\b(hack|illegal|abuse|fuck|exploit|bypass prompts)\b/i;
    if (violationRegex.test(messageText)) {
      await this.createEscalation(
        tenantId,
        conversationId,
        'Flagged policy violation warning in message text',
        confidenceScore,
        sentimentScore,
        EscalationTargetEnum.MANAGER,
      );
      return true;
    }

    return false;
  }

  public async createEscalation(
    tenantId: string,
    conversationId: string,
    reason: string,
    confidenceScore?: number,
    sentimentScore?: number,
    target: EscalationTargetEnum = EscalationTargetEnum.AGENT,
  ): Promise<AiEscalation> {
    const escalationId = crypto.randomUUID();
    const escalation = new AiEscalation(escalationId, {
      tenantId,
      conversationId,
      reason,
      confidenceScore,
      sentimentScore,
      escalatedTo: target,
      status: EscalationStatusEnum.PENDING,
    });

    await this.repository.saveEscalation(escalation, tenantId);
    await this.eventPublisher.publish(
      new AiEscalationCreatedEvent(
        tenantId,
        escalationId,
        conversationId,
        reason,
        target,
      ),
    );

    // Update conversation priority or status as well
    try {
      const conv = await this.conversationService.findById(
        tenantId,
        conversationId,
      );
      if (conv) {
        // Mark conversation escalated/priority high
        await this.conversationService.update(tenantId, conversationId, {
          priority: 'HIGH' as any,
          status: 'ASSIGNED' as any, // Assign back to humans
        });
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to update conversation priorities: ${err.message}`,
      );
    }

    return escalation;
  }

  public async getEscalation(
    tenantId: string,
    id: string,
  ): Promise<AiEscalation> {
    const escalation = await this.repository.getEscalationById(id, tenantId);
    if (!escalation) {
      throw new NotFoundException(`Escalation with ID ${id} not found`);
    }
    return escalation;
  }

  public async findEscalations(
    tenantId: string,
    status?: string,
  ): Promise<AiEscalation[]> {
    return this.repository.findEscalations(tenantId, status);
  }

  public async resolveEscalation(
    tenantId: string,
    id: string,
  ): Promise<AiEscalation> {
    const escalation = await this.getEscalation(tenantId, id);
    escalation.resolve();
    await this.repository.saveEscalation(escalation, tenantId);
    await this.eventPublisher.publish(
      new AiEscalationResolvedEvent(tenantId, id, escalation.conversationId),
    );
    return escalation;
  }
}
