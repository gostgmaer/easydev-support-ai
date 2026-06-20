import { Module, Global } from '@nestjs/common';
import { IamIntegrationService } from './iam/iam.service';
import { AiIntegrationService } from './ai/ai.service';
import { FileUploadIntegrationService } from './file-upload/file-upload.service';

@Global()
@Module({
  providers: [
    IamIntegrationService,
    AiIntegrationService,
    FileUploadIntegrationService,
  ],
  exports: [
    IamIntegrationService,
    AiIntegrationService,
    FileUploadIntegrationService,
  ],
})
export class IntegrationModule {}
