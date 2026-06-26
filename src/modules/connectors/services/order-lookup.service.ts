import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConnectorExecutionService } from '../../connectors/services/connector-execution.service';
import { AIPlatformClient } from '../../ai-integration/services/ai-platform.client';
import { MessageService } from '../../messages/services/message.service';
import {
  MessageDirectionEnum,
  MessageTypeEnum,
} from '../../messages/domain/value-objects';
import { ConversationService } from '../../conversations/services/conversation.service';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import {
  OrderLookupExecutedEvent,
  OrderLookupFailedEvent,
} from '@easydev/shared-events';
import { InboxRealtimeService } from '../../inbox/services/inbox-realtime.service';

/**
 * OrderLookupService  (FLOW 3)
 *
 * Orchestrates the full "Customer Widget → Order Lookup → Connector
 * Execution → External API Response → AI Interpretation → Customer
 * Response → Escalation Handling" flow.
 *
 * 1. Resolves the ORDER_LOOKUP connector capability for the tenant.
 * 2. Executes the connector (Shopify / WooCommerce / custom ERP).
 * 3. Passes the raw API response to the AI Platform for interpretation.
 * 4. Persists the AI-generated reply as a BOT message.
 * 5. Falls back to human escalation when the order cannot be found or the
 *    connector fails.
 */
@Injectable()
export class OrderLookupService {
  private readonly logger = new Logger(OrderLookupService.name);

  constructor(
    private readonly connectorService: ConnectorExecutionService,
    private readonly aiClient: AIPlatformClient,
    private readonly messageService: MessageService,
    private readonly conversationService: ConversationService,
    private readonly realtime: InboxRealtimeService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Main entry-point called by the conversation queue processor when the AI
   * detects an order-lookup intent.
   */
  async lookupOrder(
    tenantId: string,
    conversationId: string,
    orderId: string,
    customerEmail?: string,
    messageId?: string,
  ): Promise<{ reply: string; escalated: boolean; orderData?: any }> {
    this.logger.log(
      `Order lookup initiated: orderId=${orderId} conversation=${conversationId} tenant=${tenantId}`,
    );

    // ─── 1. Execute connector ─────────────────────────────────────────────
    let orderData: any;
    try {
      orderData = await this.connectorService.executeCapability(
        tenantId,
        'ORDER_LOOKUP' as any,
        {
          orderId,
          email: customerEmail,
        },
        { conversationId },
      );
    } catch (connectorError: any) {
      this.logger.warn(
        `Connector execution failed for ORDER_LOOKUP: ${connectorError.message}`,
      );

      // Emit failure event
      await this.publishEvent(
        tenantId,
        new OrderLookupFailedEvent(
          tenantId,
          conversationId,
          orderId,
          connectorError.message,
        ),
      );

      // Escalate to human agent
      await this.escalate(
        tenantId,
        conversationId,
        'Order lookup connector failed',
      );

      const reply =
        "I'm sorry, I couldn't retrieve your order details right now. " +
        "I've connected you with a support agent who will assist you shortly.";

      await this.persistBotMessage(tenantId, conversationId, reply);
      return { reply, escalated: true };
    }

    if (!orderData) {
      const reply =
        `I couldn't find any order with ID "${orderId}". ` +
        'Please check the order number and try again, or speak with an agent for help.';
      await this.persistBotMessage(tenantId, conversationId, reply);
      await this.publishEvent(
        tenantId,
        new OrderLookupFailedEvent(
          tenantId,
          conversationId,
          orderId,
          'Order not found',
        ),
      );
      return { reply, escalated: false };
    }

    // ─── 2. AI Interpretation ─────────────────────────────────────────────
    let reply: string;
    try {
      const interpretation = await this.aiClient.interpretConnectorResult(
        tenantId,
        'order_lookup',
        orderData,
        { conversationId },
      );
      reply = interpretation?.content || this.buildDefaultReply(orderData);
    } catch (aiError: any) {
      this.logger.warn(
        `AI interpretation failed: ${aiError.message}. Falling back to default reply.`,
      );
      reply = this.buildDefaultReply(orderData);
    }

    // ─── 3. Persist AI reply ──────────────────────────────────────────────
    await this.persistBotMessage(tenantId, conversationId, reply);

    // ─── 4. Publish success event ─────────────────────────────────────────
    await this.publishEvent(
      tenantId,
      new OrderLookupExecutedEvent(
        tenantId,
        conversationId,
        orderId,
        orderData.status || 'UNKNOWN',
        orderData._connectorId || 'unknown',
      ),
    );

    // ─── 5. Check if escalation is still needed ───────────────────────────
    const needsEscalation =
      orderData.status === 'CANCELLED' ||
      orderData.status === 'DISPUTED' ||
      orderData.requiresManualReview === true;

    if (needsEscalation) {
      await this.escalate(
        tenantId,
        conversationId,
        `Order ${orderId} status requires human review: ${orderData.status}`,
      );
    }

    return { reply, escalated: needsEscalation, orderData };
  }

  private buildDefaultReply(orderData: any): string {
    const parts: string[] = ['Here are the details for your order:'];
    if (orderData.id) parts.push(`• Order ID: ${orderData.id}`);
    if (orderData.status) parts.push(`• Status: ${orderData.status}`);
    if (orderData.total) parts.push(`• Total: ${orderData.total}`);
    if (orderData.estimatedDelivery)
      parts.push(`• Estimated Delivery: ${orderData.estimatedDelivery}`);
    if (orderData.trackingNumber)
      parts.push(`• Tracking Number: ${orderData.trackingNumber}`);
    parts.push('\nIs there anything else I can help you with?');
    return parts.join('\n');
  }

  private async persistBotMessage(
    tenantId: string,
    conversationId: string,
    content: string,
  ): Promise<void> {
    try {
      await this.messageService.create(tenantId, {
        conversationId,
        content,
        senderType: 'BOT',
        senderId: 'system-order-lookup',
        direction: MessageDirectionEnum.OUTBOUND,
        messageType: MessageTypeEnum.TEXT,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to persist bot message: ${err.message}`);
    }
  }

  private async escalate(
    tenantId: string,
    conversationId: string,
    reason: string,
  ): Promise<void> {
    try {
      await this.queueService.addJob(QUEUES.NOTIFICATION, 'escalation-alert', {
        tenantId,
        conversationId,
        reason,
      });
      // Mark conversation as needing human attention
      await this.conversationService.update(tenantId, conversationId, {
        priority: 'HIGH' as any,
        status: 'ASSIGNED' as any,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to trigger escalation: ${err.message}`);
    }
  }

  private async publishEvent(tenantId: string, event: any): Promise<void> {
    try {
      // Direct publish via realtime for cross-service observability
      await this.realtime.emitConversationUpdate(tenantId, {
        event: event.constructor?.eventName || 'order.event',
        payload: event,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to publish event: ${err.message}`);
    }
  }
}
