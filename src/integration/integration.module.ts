import { Module, Global } from '@nestjs/common';
import { IamIntegrationService } from './iam/iam.service';
import { AiIntegrationService } from './ai/ai.service';

@Global()
@Module({
  providers: [IamIntegrationService, AiIntegrationService],
  exports: [IamIntegrationService, AiIntegrationService],
})
export class IntegrationModule {}
