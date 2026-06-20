import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BaseWorker, QueueService, QUEUES } from '@easydev/shared-queues';
import { Injectable, Optional } from '@nestjs/common';
import { AgentAssignmentService } from '../services/agent-assignment.service';
import { AgentAvailabilityService } from '../services/agent-availability.service';
import { AgentProfileService } from '../services/agent-profile.service';

@Processor('team-queue')
@Injectable()
export class TeamQueueProcessor extends BaseWorker {
  constructor(
    private readonly assignmentService: AgentAssignmentService,
    private readonly availabilityService: AgentAvailabilityService,
    private readonly profileService: AgentProfileService,
    @Optional() queueService?: QueueService,
  ) {
    super('TeamQueueProcessor', QUEUES.TEAM, queueService);
  }

  async handleJob(job: Job<any, any, string>): Promise<any> {
    const tenantId = job.data._tenantContext?.tenantId;
    if (!tenantId) {
      this.logger.warn(`Job ${job.id} [${job.name}] ran without tenantId context`);
    }

    switch (job.name) {
      case 'assignment-job':
        this.logger.log(`Running automatic assignment job ${job.id}`);
        return this.assignmentService.assignEntity(
          tenantId,
          job.data.teamId,
          job.data.entityId,
          job.data.entityType,
          job.data.options
        );

      case 'availability-sync-job':
        this.logger.log(`Running availability sync job ${job.id}`);
        const availability = await this.availabilityService.getAvailability(tenantId, job.data.agentProfileId);
        const minutesIdle = (new Date().getTime() - availability.lastSeenAt.getTime()) / 60000;
        if (minutesIdle > 15 && availability.status === 'ONLINE') {
          await this.availabilityService.updateAvailability(tenantId, job.data.agentProfileId, {
            status: 'AWAY',
          });
        }
        return { status: 'synced' };

      case 'load-balancer-job':
        this.logger.log(`Running load-balancer job ${job.id} for agent ${job.data.agentProfileId}`);
        const avail = await this.availabilityService.getAvailability(tenantId, job.data.agentProfileId);
        const actualLoad = avail.activeConversations + avail.activeTickets;
        if (avail.currentLoad !== actualLoad) {
          await this.availabilityService.updateLoad(tenantId, job.data.agentProfileId, actualLoad - avail.currentLoad);
        }
        return { actualLoad };

      case 'capacity-calculation-job':
        this.logger.log(`Running capacity recalculation job ${job.id}`);
        const profile = await this.profileService.findById(tenantId, job.data.agentProfileId);
        await this.profileService.update(tenantId, job.data.agentProfileId, {
          capacity: job.data.newCapacity || profile.capacity.capacity,
        });
        return { status: 'success' };

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
