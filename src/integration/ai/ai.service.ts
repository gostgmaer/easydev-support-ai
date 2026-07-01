import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AiIntegrationService {
  private readonly logger = new Logger(AiIntegrationService.name);

  // Calls EasyDev AI Workflow Platform
  detectIntent(messageContent: string): Promise<string> {
    this.logger.debug('Detecting intent via EasyDev AI Platform');
    // MOCK: HTTP Call to /v1/classify
    if (messageContent.toLowerCase().includes('order'))
      return Promise.resolve('ORDER_TRACKING');
    if (messageContent.toLowerCase().includes('refund'))
      return Promise.resolve('REFUND_REQUEST');
    return Promise.resolve('GENERAL_SUPPORT');
  }

  generateResponse(conversationHistory: any[]): Promise<string> {
    this.logger.debug(
      `Generating response via EasyDev AI Platform for ${conversationHistory.length}-message history`,
    );
    // MOCK: HTTP Call to /v1/generate
    return Promise.resolve(
      'Hello, how can I help you with your request today?',
    );
  }
}
