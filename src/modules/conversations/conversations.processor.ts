import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { AiIntegrationService } from '../../integration/ai/ai.service';

@Processor('inbound-messages')
export class ConversationsProcessor extends WorkerHost {
  private readonly logger = new Logger(ConversationsProcessor.name);

  constructor(private readonly aiService: AiIntegrationService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing inbound message: ${job.data.messageId}`);

    // 1. Intent Detection via AI
    const intent = await this.aiService.detectIntent(job.data.content);
    this.logger.log(`Detected Intent: ${intent}`);

    // 2. Connector trigger or Auto-Response goes here
    if (intent === 'ORDER_TRACKING') {
      this.logger.log('Routing to Order Connector Workflow...');
      // trigger connector logic
    } else {
      const response = await this.aiService.generateResponse([
        { role: 'user', content: job.data.content },
      ]);
      this.logger.log(`Drafted Response: ${response}`);
      // Push response to Socket.IO or outbound queue
    }

    return { intent };
  }
}
