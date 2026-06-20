import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AiIntegrationService {
  private readonly logger = new Logger(AiIntegrationService.name);

  // Calls EasyDev AI Workflow Platform
  async detectIntent(messageContent: string): Promise<string> {
    this.logger.debug('Detecting intent via EasyDev AI Platform');
    // MOCK: HTTP Call to /v1/classify
    if (messageContent.toLowerCase().includes('order')) return 'ORDER_TRACKING';
    if (messageContent.toLowerCase().includes('refund'))
      return 'REFUND_REQUEST';
    return 'GENERAL_SUPPORT';
  }

  async generateResponse(conversationHistory: any[]): Promise<string> {
    this.logger.debug('Generating response via EasyDev AI Platform');
    // MOCK: HTTP Call to /v1/generate
    return 'Hello, how can I help you with your request today?';
  }
}
