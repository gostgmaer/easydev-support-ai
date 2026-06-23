// @ts-nocheck
import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Optional, Logger } from '@nestjs/common';
import { BaseWorker, QueueService, QUEUES, WORKER_OPTIONS } from '@easydev/shared-queues';
import { NotificationService } from './notification.service';

/**
 * Notification Queue Processor
 *
 * Consumes jobs from QUEUES.NOTIFICATION and dispatches emails / push
 * notifications via the NotificationService (which proxies the central
 * EasyDev Notification micro-service).
 *
 * Job names consumed:
 *  - approval-request         (FLOW 2 – ticket approval)
 *  - ticket-created           (customer confirmation on ticket creation)
 *  - ticket-resolution        (FLOW 2 – resolution customer notification)
 *  - ticket-closed            (customer notification on close)
 *  - ticket-reopened          (customer notification on reopen)
 *  - ticket-cancelled         (customer notification on cancel)
 *  - ticket-assigned          (FLOW 2 – agent-notification on assignment)
 *  - conversation-assigned    (agent-notification on conversation assignment)
 *  - mention-alert            (agent-notification when @mentioned in a conversation)
 *  - sla-breach               (SLA breach alert to agent / manager)
 *  - escalation-alert         (FLOW 1/3/7 – human escalation notification)
 *  - customer-survey          (post-resolution CSAT)
 *  - email-draft-review       (FLOW 6 – agent notified draft awaits review)
 *  - whatsapp-delivery-receipt (FLOW 7 – confirm outbound WhatsApp delivery)
 *  - tenant-provisioned        (FLOW 12 – welcome email after tenant creation)
 *  - billing-payment-failed    (FLOW 12 – billing failure alert)
 */
@Processor('notification-queue', WORKER_OPTIONS)
@Injectable()
export class NotificationQueueProcessor extends BaseWorker {
  constructor(
    private readonly notificationService: NotificationService,
    @Optional() queueService?: QueueService,
  ) {
    super('NotificationQueueProcessor', QUEUES.NOTIFICATION, queueService);
  }

  async handleJob(job: Job<any, any, string>): Promise<any> {
    const tenantId = job.data._tenantContext?.tenantId || job.data.tenantId;

    switch (job.name) {
      // ─── FLOW 2: Ticket Creation → Assignment Rules → Customer Notification ──
      case 'approval-request': {
        this.logger.log(
          `Dispatching approval-request notification [job=${job.id}]`,
        );
        await this.notificationService.sendEmail(
          tenantId,
          job.data.approverEmail || 'approver@internal',
          'ticket-approval-request',
          {
            ticketId: job.data.ticketId,
            approvalId: job.data.approvalId,
            approverId: job.data.approverId,
          },
        );
        return { notified: true, approvalId: job.data.approvalId };
      }

      case 'ticket-resolution': {
        this.logger.log(
          `Dispatching ticket-resolution notification [job=${job.id}]`,
        );
        if (job.data.customerEmail) {
          await this.notificationService.sendEmail(
            tenantId,
            job.data.customerEmail,
            'ticket-resolved-customer',
            {
              ticketId: job.data.ticketId,
              ticketNumber: job.data.ticketNumber,
              summary: job.data.summary,
            },
          );
        }
        return { notified: true, ticketId: job.data.ticketId };
      }

      case 'ticket-created': {
        this.logger.log(
          `Dispatching ticket-created notification [job=${job.id}]`,
        );
        if (job.data.customerEmail) {
          await this.notificationService.sendEmail(
            tenantId,
            job.data.customerEmail,
            'ticket-created-customer',
            {
              ticketId: job.data.ticketId,
              ticketNumber: job.data.ticketNumber,
              subject: job.data.subject,
            },
          );
        }
        return { notified: true, ticketId: job.data.ticketId };
      }

      case 'ticket-closed': {
        this.logger.log(
          `Dispatching ticket-closed notification [job=${job.id}]`,
        );
        if (job.data.customerEmail) {
          await this.notificationService.sendEmail(
            tenantId,
            job.data.customerEmail,
            'ticket-closed-customer',
            {
              ticketId: job.data.ticketId,
              ticketNumber: job.data.ticketNumber,
            },
          );
        }
        return { notified: true, ticketId: job.data.ticketId };
      }

      case 'ticket-reopened': {
        this.logger.log(
          `Dispatching ticket-reopened notification [job=${job.id}]`,
        );
        if (job.data.customerEmail) {
          await this.notificationService.sendEmail(
            tenantId,
            job.data.customerEmail,
            'ticket-reopened-customer',
            {
              ticketId: job.data.ticketId,
              ticketNumber: job.data.ticketNumber,
            },
          );
        }
        return { notified: true, ticketId: job.data.ticketId };
      }

      case 'ticket-cancelled': {
        this.logger.log(
          `Dispatching ticket-cancelled notification [job=${job.id}]`,
        );
        if (job.data.customerEmail) {
          await this.notificationService.sendEmail(
            tenantId,
            job.data.customerEmail,
            'ticket-cancelled-customer',
            {
              ticketId: job.data.ticketId,
              ticketNumber: job.data.ticketNumber,
            },
          );
        }
        return { notified: true, ticketId: job.data.ticketId };
      }

      case 'ticket-assigned': {
        this.logger.log(
          `Dispatching ticket-assigned notification [job=${job.id}]`,
        );
        await this.notificationService.sendPushNotification(
          tenantId,
          job.data.agentId,
          `Ticket #${job.data.ticketNumber} has been assigned to you.`,
        );
        return { notified: true, agentId: job.data.agentId };
      }

      case 'conversation-assigned': {
        this.logger.log(
          `Dispatching conversation-assigned notification [job=${job.id}]`,
        );
        await this.notificationService.sendPushNotification(
          tenantId,
          job.data.agentId,
          `A conversation has been assigned to you.`,
        );
        return { notified: true, agentId: job.data.agentId };
      }

      case 'mention-alert': {
        this.logger.log(`Dispatching mention-alert notification [job=${job.id}]`);
        await this.notificationService.sendPushNotification(
          tenantId,
          job.data.mentionedUserId,
          `You were mentioned in conversation ${job.data.conversationId}.`,
        );
        return { notified: true, mentionedUserId: job.data.mentionedUserId };
      }

      // ─── SLA Breach ────────────────────────────────────────────────────────
      case 'sla-breach': {
        this.logger.log(`Dispatching sla-breach alert [job=${job.id}]`);
        await this.notificationService.sendPushNotification(
          tenantId,
          job.data.agentId,
          `SLA breached for ticket #${job.data.ticketNumber} (${job.data.breachType}).`,
        );
        if (job.data.managerEmail) {
          await this.notificationService.sendEmail(
            tenantId,
            job.data.managerEmail,
            'sla-breach-manager',
            {
              ticketId: job.data.ticketId,
              ticketNumber: job.data.ticketNumber,
              breachType: job.data.breachType,
            },
          );
        }
        return { notified: true, ticketId: job.data.ticketId };
      }

      // ─── FLOW 1 / 3 / 7: Escalation Alert ────────────────────────────────
      case 'escalation-alert': {
        this.logger.log(`Dispatching escalation-alert [job=${job.id}]`);
        await this.notificationService.sendPushNotification(
          tenantId,
          job.data.agentId || job.data.teamId,
          `Conversation ${job.data.conversationId} requires human handling: ${job.data.reason}`,
        );
        return { notified: true, conversationId: job.data.conversationId };
      }

      // ─── Post-resolution CSAT Survey ─────────────────────────────────────
      case 'customer-survey': {
        this.logger.log(`Dispatching CSAT survey [job=${job.id}]`);
        if (job.data.customerEmail) {
          await this.notificationService.sendEmail(
            tenantId,
            job.data.customerEmail,
            'csat-survey',
            {
              conversationId: job.data.conversationId,
              ticketId: job.data.ticketId,
              surveyUrl: job.data.surveyUrl,
            },
          );
        }
        return { notified: true };
      }

      // ─── FLOW 6: Email Draft Awaiting Agent Review ───────────────────────
      case 'email-draft-review': {
        this.logger.log(
          `Dispatching email-draft-review notification [job=${job.id}]`,
        );
        await this.notificationService.sendPushNotification(
          tenantId,
          job.data.agentId,
          `AI draft ready for review in conversation ${job.data.conversationId}.`,
        );
        return { notified: true, draftId: job.data.draftId };
      }

      // ─── FLOW 7: WhatsApp Delivery Receipt ───────────────────────────────
      case 'whatsapp-delivery-receipt': {
        this.logger.log(`Processing WhatsApp delivery receipt [job=${job.id}]`);
        // Delivery receipts are informational; log and emit analytics event.
        await this.queueService?.addJob(QUEUES.ANALYTICS, 'channel-delivery', {
          tenantId,
          channelType: 'WHATSAPP',
          messageId: job.data.messageId,
          status: job.data.status,
          timestamp: job.data.timestamp,
        });
        return { processed: true };
      }

      // ─── FLOW 12: Tenant Provisioned Welcome Email ────────────────────────
      case 'tenant-provisioned': {
        this.logger.log(
          `Dispatching tenant-provisioned welcome email [job=${job.id}]`,
        );
        await this.notificationService.sendEmail(
          tenantId,
          job.data.adminEmail,
          'tenant-welcome',
          {
            tenantName: job.data.tenantName,
            plan: job.data.plan,
            adminName: job.data.adminName,
            portalUrl: process.env.PORTAL_URL || 'https://app.easydev.ai',
          },
        );
        return { notified: true, tenantId };
      }

      // ─── FLOW 12: Billing Payment Failed ─────────────────────────────────
      case 'billing-payment-failed': {
        this.logger.log(
          `Dispatching billing-payment-failed alert [job=${job.id}]`,
        );
        await this.notificationService.sendEmail(
          tenantId,
          job.data.adminEmail,
          'billing-payment-failed',
          {
            invoiceId: job.data.invoiceId,
            amountCents: job.data.amountCents,
            currency: job.data.currency || 'USD',
            failureReason: job.data.failureReason,
            retryUrl: job.data.retryUrl,
          },
        );
        return { notified: true, invoiceId: job.data.invoiceId };
      }

      // ─── Conversation Resolved: Customer Notification ─────────────────────
      case 'conversation-resolved': {
        this.logger.log(
          `Dispatching conversation-resolved notification [job=${job.id}]`,
        );
        if (job.data.customerEmail) {
          await this.notificationService.sendEmail(
            tenantId,
            job.data.customerEmail,
            'conversation-resolved-customer',
            {
              conversationId: job.data.conversationId,
              summary: job.data.summary,
            },
          );
        }
        return { notified: true, conversationId: job.data.conversationId };
      }

      default:
        // Same fix as the analytics/connector/widget processors: throwing on
        // an unrecognized job name burns the whole retry budget toward the
        // DLQ for something that was never going to succeed differently on
        // retry. Acknowledge and warn instead.
        this.logger.warn(
          `Unknown notification job: ${job.name} [job=${job.id}] - acknowledging without processing`,
        );
        return { success: true, acknowledged: true, unhandled: job.name };
    }
  }
}
